import displays from './nativeRouterDisplays.json';
import { cableIsActive, classfulNetwork, ipNumber, networkInfo, ripEnabledFor, simulateRouterPing, type Device, type Topology } from './model';
import { interfaceName, routerPrompt, runTeacherRouterCommand, type RouterSession } from './routerCli';

export type InteractiveRouterSession = RouterSession & { pending?: 'configure' | 'copy-startup'; };
const aliases: Record<string, string> = { sh: 'show', wr: 'write', conf: 'configure', int: 'interface' };
export function normalizeRouterCommand(input: string): string {
  const words = input.trim().toLowerCase().replace(/\s+/g, ' ').split(' ');
  words[0] = aliases[words[0]] || words[0];
  let cmd = words.join(' ');
  cmd = cmd.replace(/^configure t(?:erminal)?$/, 'configure terminal')
    .replace(/^show run(?:ning-config)?$/, 'show running-config').replace(/^show start(?:up-config)?$/, 'show startup-config')
    .replace(/^show ip int(?:erface)? br(?:ief)?$/, 'show ip interface brief')
    .replace(/^show int(?:erfaces?)? br(?:ief)?$/, 'show ip interface brief')
    .replace(/^show int\b/, 'show interfaces').replace(/^copy run start$/, 'copy running-config startup-config')
    .replace(/^copy start run$/, 'copy startup-config running-config');
  return cmd;
}
export function interactivePrompt(device: Device, session: InteractiveRouterSession) {
  if (session.pending === 'copy-startup') return 'Destination filename [startup-config]? ';
  if (session.pending === 'configure') return 'Configuring from terminal, memory, or network [terminal]? ';
  return routerPrompt(device, session);
}
export function defaultStartup(device: Device): NonNullable<Device['startupConfig']> {
  return { name: device.kind === 'router' ? 'Router' : 'Switch', ports: device.ports.map(p => ({ name: p.name, ip: '', mask: '255.255.255.0', enabled: device.kind !== 'router' })), ripNetworks: [] };
}
export function configurationLines(device: Pick<Device, 'name' | 'ports' | 'ripNetworks'>): string[] {
  const order = ['F0/0', 'S0/0', 'F0/1', 'S0/1'];
  return ['!', 'version 12.2', 'service timestamps debug uptime', 'service timestamps log uptime', 'no service password-encryption', '!',
    `hostname ${device.name.replace(/\s/g, '')}`, '!', '!', '!', 'ip subnet-zero', '!', '!', '!', '!', '!',
    ...[...device.ports].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)).flatMap(p => [
      `interface ${interfaceName(p.name)}`, ...(p.description ? [`  description ${p.description}`] : []),
      p.ip ? `  ip address ${p.ip} ${p.mask}` : '  no ip address', '  no ip directed-broadcast',
      ...(!p.enabled ? ['  shutdown'] : []), ...(p.clockRate ? [`  clock rate ${p.clockRate}`] : []), '!',
    ]),
    ...(device.ripNetworks.length ? ['router rip', ...[...new Set(device.ripNetworks.map(classfulNetwork))].map(n => ` network ${n}`), '!'] : []),
    '!', 'ip classless', 'no ip http server', '!', '!', '!', 'line con 0', 'line aux 0', 'line vty 0 4', '  login', '!', 'end', '',
  ];
}
export function interfaceBrief(device: Device): string[] {
  return ['Interface              IP-Address      OK? Method Status                Protocol', ...device.ports.map(p => {
    // The native app omits one padding character for configured IP addresses.
    const ip = p.ip ? p.ip.padEnd(15) : 'unassigned'.padEnd(16);
    return `${interfaceName(p.name).padEnd(22)}${ip}YES ${p.ip ? 'manual' : 'unset '} ${p.enabled ? 'up'.padEnd(21) : 'administratively down'} ${p.enabled ? 'up' : 'down'}`;
  })];
}

export function cdpNeighborTable(topology: Topology, id: string): string[] {
  const neighbors = topology.cables.flatMap(cable => {
    if (!cableIsActive(topology, cable)) return [];
    const local = cable.a.deviceId === id ? cable.a : cable.b.deviceId === id ? cable.b : null;
    if (!local) return [];
    const remote = local === cable.a ? cable.b : cable.a;
    const device = topology.devices.find(item => item.id === remote.deviceId);
    const localDevice = topology.devices.find(item => item.id === id);
    const localPort = localDevice?.ports.find(item => item.name === local.port);
    const remotePort = device?.ports.find(item => item.name === remote.port);
    if (!device || device.kind === 'pc' || !localPort?.enabled || !remotePort?.enabled) return [];
    const shortName = (name: string) => name.replace(/^Serial/, 'Ser').replace(/^FastEthernet/, 'Fas').replace(/^Ethernet/, 'Eth');
    const capability = device.kind === 'router' ? 'R' : 'S';
    const platform = device.kind === 'router' ? '2621' : `WS-C${device.switchModel || '2950'}-24`;
    return [`${device.name.padEnd(17)}${shortName(interfaceName(local.port)).padEnd(19)}${'170'.padEnd(11)}${capability.padEnd(10)}${platform.padEnd(10)}${shortName(interfaceName(remote.port))}`];
  });
  return [
    'Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge',
    '                  S - Switch, H - Host, I - IGMP, r - Repeater',
    '',
    'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID',
    ...neighbors,
  ];
}
export function runRouterCommand(topology: Topology, id: string, session: InteractiveRouterSession, input: string) {
  const device = topology.devices.find(d => d.id === id)!;
  const cmd = normalizeRouterCommand(input);
  let state = { ...session };
  let updated = device;
  const output: string[] = [];
  let paginate = false;
  const invalid = () => output.push(`${' '.repeat(routerPrompt(device, session).length)}^`, "% Invalid input detected at '^' marker.");
  const save = () => { updated = { ...device, startupConfig: structuredClone({ name: device.name, ports: device.ports, ripNetworks: device.ripNetworks }) }; };
  if (session.pending) {
    delete state.pending;
    if (session.pending === 'configure') {
      if (!input.trim() || 'terminal'.startsWith(input.trim().toLowerCase())) { state.mode = 'config'; output.push('Enter configuration commands, one per line.  End with CNTL/Z'); }
      else output.push('% Invalid input detected');
    } else if (!input.trim() || input.trim() === 'startup-config') { save(); output.push('Building configuration...', '[OK]'); }
    else output.push('?Bad filename', '%Error parsing filename (Bad file number)');
    return { state, device: updated, output, paginate };
  }
  const canonical = /^hostname /.test(cmd) ? `hostname ${input.trim().split(/\s+/).slice(1).join(' ')}` : cmd;
  const basic = runTeacherRouterCommand(topology, id, session, canonical);
  if (basic) return { ...basic, state: { ...state, ...basic.state }, paginate: false };
  const privileged = session.mode === 'privileged';
  const exec = session.mode === 'user' || privileged;
  const config = ['config', 'interface', 'rip'].includes(session.mode);
  if (cmd === 'disable') { if (exec) state.mode = 'user'; else invalid(); }
  else if (cmd === 'exit') { state.mode = session.mode === 'interface' || session.mode === 'rip' ? 'config' : 'user'; }
  else if (cmd === 'configure') { if (privileged) state.pending = 'configure'; else invalid(); }
  else if (['write', 'write memory', 'write mem'].includes(cmd)) { if (privileged) { save(); output.push('Building configuration...', '[OK]'); } else invalid(); }
  else if (cmd === 'copy running-config startup-config') { if (privileged) state.pending = 'copy-startup'; else invalid(); }
  else if (cmd === 'show running-config' || cmd === 'show startup-config') {
    if (!privileged) invalid();
    else {
      const isStartup = cmd === 'show startup-config';
      const lines = configurationLines(isStartup ? device.startupConfig || defaultStartup(device) : device);
      const bytes = new TextEncoder().encode(lines.join('\n')).length + 3;
      output.push('', ...(isStartup ? [`Using ${bytes} out of 29688 bytes`] : ['Building configuration...', `Current configuration : ${bytes} bytes`]), ...lines); paginate = true;
    }
  } else if (cmd === 'show ip interface brief') { if (exec) output.push(...interfaceBrief(device)); else invalid(); }
  else if (cmd.startsWith('ping ')) {
    if (!exec) invalid();
    else {
      const destination = cmd.split(' ')[1];
      if (ipNumber(destination) === null) output.push(`Translating "${destination}"...domain server (255.255.255.255)`, '% Unknown command or computer name, or unable to find computer address');
      else {
        const result = simulateRouterPing(topology, id, destination);
        output.push('', 'Type escape sequence to abort.', `Sending 5, 100-byte ICMP Echos to ${destination}, timeout is 2 seconds:`, result.ok ? '!!!' : '.....',
          result.ok ? 'Success rate is 100 percent (5/5), round-trip min/avg/max = 4/4/4 ms' : 'Success rate is 0 percent (0/5)');
      }
    }
  } else if (cmd === 'show ip protocols') {
    if (!exec) invalid();
    else if (device.ripNetworks.length) {
      output.push('Routing Protocol is "rip"', '  Sending updates every 30 seconds, next due in 3 seconds',
        '  Invalid after 180 seconds, hold down 180, flushed after 240', '  Outgoing update filter list for all interfaces is not set',
        '  Incoming update filter list for all interfaces is not set', '  Redistributing: rip', '  Default version control: send version 1, receive any version',
        '    Interface             Send  Recv  Triggered RIP  Key-chain',
        ...[...device.ports].reverse().filter(p => p.enabled && p.ip && ripEnabledFor(device, p.ip)).map(p => `    ${interfaceName(p.name).padEnd(22)}1     1 2`),
        '  Automatic network summarization is in effect', '  Maximum path: 4', '  Routing for networks:',
        ...device.ripNetworks.map(n => `    ${classfulNetwork(n)}`), '  Routing information sources:', '    Gateway         Distance      Last Update');
      const neighbors = topology.cables.flatMap(c => {
        const own = c.a.deviceId === id ? c.a : c.b.deviceId === id ? c.b : null;
        if (!own) return [];
        const peer = own === c.a ? c.b : c.a;
        const router = topology.devices.find(d => d.id === peer.deviceId);
        const p = router?.ports.find(p => p.name === peer.port);
        return router?.kind === 'router' && p?.enabled && p.ip && router.ripNetworks.length ? [`    ${p.ip.padEnd(21)}120       00:00:00`] : [];
      });
      output.push(...neighbors, '  Distance: <default is 120>', ' ');
    }
  } else if (cmd === 'show version') {
    if (exec) { output.push('', ...displays.version); paginate = true; } else invalid();
  } else if (/^show (interfaces?|int)( |$)/.test(cmd)) {
    if (!exec) invalid();
    else {
      const name = cmd.split(' ').slice(2).join('').toUpperCase().replace(/^FASTETHERNET/, 'F').replace(/^FA/, 'F').replace(/^SERIAL/, 'S');
      const ports = name ? device.ports.filter(p => p.name === name) : device.ports;
      if (!ports.length) invalid();
      for (const port of ports) {
        const net = port.ip && networkInfo(port.ip, port.mask);
        const template = port.name.startsWith('S') ? displays.serial : displays.fast;
        const original = port.name.startsWith('S') ? 'Serial0/1' : 'FastEthernet0/1';
        output.push('', ...template.map(line => {
          let text = line.replaceAll(original, interfaceName(port.name));
          if (text.startsWith(interfaceName(port.name) + ' is ')) text = `${interfaceName(port.name)} is ${port.enabled ? 'up' : 'administratively down'}, line protocol is ${port.enabled ? 'up' : 'down'}`;
          if (text.includes('Internet address is ')) text = net ? `  Internet address is ${port.ip}/${net.prefix}` : '  Internet address is unassigned';
          if (!port.enabled && text.includes('DCD=up')) text = '     DCD=down  DSR=down  DTR=down  RTS=down  CTS=down';
          return text;
        }));
      }
      paginate = true;
    }
  } else if ((cmd === 'no ip address' || cmd === 'no ip add') && session.mode === 'interface') updated = { ...device, ports: device.ports.map(p => p.name === session.port ? { ...p, ip: '' } : p) };
  else if (/^(no )?description(?: |$)/.test(cmd) && session.mode === 'interface') updated = { ...device, ports: device.ports.map(p => p.name === session.port ? { ...p, description: cmd.startsWith('no ') ? undefined : input.trim().slice(input.indexOf(' ') + 1) } : p) };
  else if (cmd.startsWith('show ') && config) invalid();
  else return null;
  return { state, device: updated, output, paginate };
}
