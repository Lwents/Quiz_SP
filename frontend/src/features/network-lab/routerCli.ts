import { lanPeers, ipNumber, networkInfo, ripEnabledFor, type Device, type Topology } from './model';

export type ConsoleMode = 'user' | 'privileged' | 'config' | 'interface' | 'rip';
export type RouterSession = { mode: ConsoleMode; port: string };
export const interfaceName = (port: string) => port.replace(/^F/, 'FastEthernet').replace(/^S/, 'Serial');
export function routerPrompt(device: Device, state: RouterSession) {
  const name = device.name.replace(/\s/g, '') || 'Router';
  return state.mode === 'user' ? `${name}>` : state.mode === 'privileged' ? `${name}#`
    : `${name}(${state.mode === 'interface' ? 'config-if' : state.mode === 'rip' ? 'config-router' : 'config'})#`;
}

// The teacher's command subset, checked against CCNA Network Visualizer 5.0.03.
// Other supported practice commands continue through the page's existing handler.
export function runTeacherRouterCommand(topology: Topology, id: string, state: RouterSession, input: string, time = new Date()) {
  const device = topology.devices.find(item => item.id === id)!;
  const command = input.trim().toLowerCase().replace(/\s+/g, ' ');
  const output: string[] = [];
  let next = { ...state };
  let updated = device;
  const invalid = (offset = 0) => output.push(`${' '.repeat(routerPrompt(device, state).length + offset)}^`, "% Invalid input detected at '^' marker.");
  const port = () => updated.ports.find(item => item.name === state.port);
  const patchPort = (patch: Partial<Device['ports'][number]>) => { updated = { ...updated, ports: updated.ports.map(item => item.name === state.port ? { ...item, ...patch } : item) }; };
  const config = ['config', 'interface', 'rip'].includes(state.mode);
  if (['ena', 'en', 'enable'].includes(command)) {
    if (config) invalid(2); else next.mode = 'privileged';
  } else if (['conf t', 'config t', 'configure terminal'].includes(command)) {
    if (state.mode !== 'privileged') invalid(1);
    else { next.mode = 'config'; output.push('Enter configuration commands, one per line.  End with CNTL/Z'); }
  } else if (command.startsWith('hostname ')) {
    if (config && /^hostname\s+[a-z0-9_-]+$/i.test(input.trim())) { updated = { ...updated, name: input.trim().split(/\s+/)[1] }; next.mode = 'config'; }
    else invalid();
  } else if (/^(int|interface)\s+/.test(command)) {
    const name = command.split(/\s+/).slice(1).join('').toUpperCase().replace(/^FASTETHERNET/, 'F').replace(/^FA/, 'F').replace(/^SERIAL/, 'S');
    if (config && updated.ports.some(item => item.name === name)) next = { mode: 'interface', port: name };
    else invalid();
  } else if (/^ip (add|address)(?:\s|$)/.test(command)) {
    const [, , ip, mask] = command.split(' ');
    if (state.mode !== 'interface') invalid();
    else if (!ip || !mask) output.push('% Incomplete command.');
    else {
      const address = ipNumber(ip);
      const maskNumber = ipNumber(mask);
      const maskBits = maskNumber?.toString(2).padStart(32, '0') || '';
      const prefix = /^1+0*$/.test(maskBits) ? (maskBits.indexOf('0') < 0 ? 32 : maskBits.indexOf('0')) : maskBits.match(/^1*/)?.[0].length || 0;
      const net = networkInfo(ip, mask);
      if (address === null || !net || address === ipNumber(net.network) || address === ipNumber(net.broadcast)) {
        output.push(`Bad mask/${prefix} for address ${ip}`);
      } else {
        const low = ipNumber(net.network)!;
        const high = ipNumber(net.broadcast)!;
        const overlap = updated.ports.find(other => {
          if (other.name === state.port || !other.ip) return false;
          const otherNet = networkInfo(other.ip, other.mask);
          if (!otherNet) return false;
          return low <= ipNumber(otherNet.broadcast)! && ipNumber(otherNet.network)! <= high;
        });
        if (overlap) {
          const otherNet = networkInfo(overlap.ip, overlap.mask)!;
          output.push(`% ${otherNet.network} overlaps with ${interfaceName(overlap.name)}`);
        } else patchPort({ ip, mask });
      }
    }
  } else if (command.startsWith('clock rate ')) {
    const rate = Number(command.split(' ')[2]);
    if (state.mode !== 'interface' || !state.port.startsWith('S')) invalid(1);
    else if (!topology.cables.some(cable => cable.dce?.deviceId === id && cable.dce.port === state.port)) output.push('%Error: This command applies only to DCE interfaces');
    else if (!Number.isInteger(rate) || rate <= 0) invalid();
    else patchPort({ clockRate: rate });
  } else if (['no shut', 'no shutdown', 'shutdown'].includes(command)) {
    if (state.mode !== 'interface') invalid();
    else {
      const enabled = command !== 'shutdown';
      if (port()?.enabled !== enabled) {
        const stamp = [time.getHours(), time.getMinutes(), time.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
        const name = interfaceName(state.port).replace('FastEthernet', 'Fastethernet');
        output.push(`${stamp} %LINK-3-UPDOWN:  Interface ${name}, changed state to ${enabled ? 'up' : 'administratively down'}`,
          `${stamp} %LINEPROTO-5-UPDOWN: Line protocol on Interface ${name}, changed state to ${enabled ? 'up' : 'down'}`, '');
      }
      patchPort({ enabled });
    }
  } else if (command === 'router rip') {
    if (config) next.mode = 'rip'; else invalid();
  } else if (/^(no )?network\s+/.test(command)) {
    const net = command.split(' ').at(-1)!;
    if (state.mode !== 'rip' || ipNumber(net) === null) invalid();
    else updated = { ...updated, ripNetworks: command.startsWith('no ') ? updated.ripNetworks.filter(n => n !== net) : [...new Set([...updated.ripNetworks, net])] };
  } else if (command === 'end') {
    if (config) next.mode = 'privileged'; else invalid();
  } else if (command === 'show ip route') {
    if (config) invalid(); else output.push(...routerRouteTable(topology, id));
  } else return null;
  return { state: next, device: updated, output };
}

export function routerRouteTable(topology: Topology, id: string): string[] {
  const device = topology.devices.find(item => item.id === id)!;
  type Route = { network: string; prefix: number; line: string };
  const routes = new Map<string, Route>();
  const direct = [...device.ports].sort((a, b) => b.name.localeCompare(a.name));
  for (const port of direct) {
    const net = port.enabled && networkInfo(port.ip, port.mask);
    if (net) routes.set(`${net.network}/${net.prefix}`, { ...net, line: `C     ${net.network} is directly connected, ${interfaceName(port.name)}` });
  }
  const seen = new Set([id]);
  const queue = [{ router: device, hop: '', outgoing: '', distance: 0 }];
  while (queue.length) {
    const current = queue.shift()!;
    for (const ownPort of current.router.ports) {
      const local = { deviceId: current.router.id, port: ownPort.name };
      for (const peer of lanPeers(topology, local)) {
        const neighbor = topology.devices.find(item => item.id === peer.deviceId);
        const peerPort = neighbor?.ports.find(item => item.name === peer.port);
        const net = ownPort?.enabled && networkInfo(ownPort.ip, ownPort.mask);
        const peerNet = peerPort?.enabled && networkInfo(peerPort.ip, peerPort.mask);
        if (!neighbor || neighbor.kind !== 'router' || seen.has(neighbor.id) || !peerPort || !net
          || !peerNet || net.network !== peerNet.network || net.prefix !== peerNet.prefix
          || !ripEnabledFor(current.router, net.network) || !ripEnabledFor(neighbor, net.network)) continue;
        seen.add(neighbor.id);
        const hop = current.hop || peerPort.ip;
        const outgoing = current.outgoing || local.port;
        const distance = current.distance + 1;
        queue.push({ router: neighbor, hop, outgoing, distance });
        for (const port of neighbor.ports) {
          const remote = port.enabled && networkInfo(port.ip, port.mask);
          if (!remote || !ripEnabledFor(neighbor, remote.network)) continue;
          const key = `${remote.network}/${remote.prefix}`;
          if (!routes.has(key) && distance < 16) routes.set(key, { ...remote, line: `R     ${remote.network} [120/${distance}] via ${hop}, 00:00:00, ${interfaceName(outgoing)}` });
        }
      }
    }
  }
  const groups = new Map<string, Route[]>();
  for (const route of routes.values()) {
    const group = `${route.network.split('.').slice(0, 3).join('.')}.0/${route.prefix}`;
    const items = groups.get(group) || []; items.push(route); groups.set(group, items);
  }
  return ['Codes: C - connected, S - static, I - IGRP, R - RIP, M - mobile, B - BGP',
    '       D - EIGRP, EX - EIGRP external, O- OSPF, IA - OSPF inter area',
    '       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2',
    '       i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, * - candidate default',
    '       U - per-user static route, o - ODR, P - periodic downloaded static route',
    '       T - traffic engineered route', '', 'Gateway of last resort is not set', '',
    ...[...groups].flatMap(([group, items]) => [`    ${group} is subnetted, ${items.length} subnets`, ...items.map(item => item.line)])];
}
