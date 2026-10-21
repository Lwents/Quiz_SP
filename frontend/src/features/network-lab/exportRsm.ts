import defaults from './nativeTopologyDefaults.json';
import { defaultStartup } from './routerCommands';
import type { Device, Port, Topology } from './model';

export function nativePortName(device: Device, name: string): string {
  if (device.kind === 'pc') return 'E0/0';
  if (device.kind !== 'switch') return name;
  const n = Number(name.slice(1));
  return device.switchModel === '1900' ? n <= 12 ? `E0/${n}` : `F0/${n + 13}` : `F0/${n}`;
}

// Write the original .rsm schema so a saved web lab also opens in the desktop app.
export function exportRsm(topology: Topology, name: string): string {
  const doc = new DOMParser().parseFromString('<network xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="nv5.xsd"/>', 'application/xml');
  const root = doc.documentElement; root.setAttribute('networkName', name);
  const add = (parent: Element, tag: string, text?: string) => { const e = doc.createElement(tag); if (text !== undefined) e.textContent = text; parent.appendChild(e); return e; };
  const parse = (text: string) => doc.importNode(new DOMParser().parseFromString(text, 'application/xml').documentElement, true);
  const app = add(root, 'applicationInformation'); for (const [key, value] of Object.entries({ company: 'routersim', product: 'ccna', version: '5.0.03', build: '20051215040924', user: 'Not Available' })) add(app, key, value);
  add(root, 'backgroundRGB', '-1');
  const tags = (device: Device) => device.kind === 'pc' ? 'host' : device.kind === 'router' ? 'router2600' : device.kind === 'netconnect' ? 'netconnect' : `switch${device.switchModel || '2950'}`;
  const counterNames = { host: 'hostCounter', router2600: 'router2600Counter', switch1900: 'switch1900Counter', switch2950: 'switch2950Counter', switch3550: 'switch3550Counter', switch4000: 'switch4000Counter', netconnect: 'netConnectCounter' };
  for (const [tag, counter] of Object.entries(counterNames)) add(root, counter, String(topology.devices.filter(d => tags(d) === tag).length));
  const devices = add(root, 'devices');
  const ids = new Map<string, { id: string; type: string }>();
  const counts = new Map<string, number>();
  const schemaOrder = ['host', 'router2600', 'switch1900', 'switch2950', 'switch3550', 'netconnect'];
  for (const device of [...topology.devices].sort((a, b) => schemaOrder.indexOf(tags(a)) - schemaOrder.indexOf(tags(b)))) {
    const tag = tags(device) as keyof typeof defaults;
    const profile = defaults[tag];
    if (!profile) throw new Error(`Unsupported RouterSim device: ${tag}`);
    const count = counts.get(tag) || 0; counts.set(tag, count + 1);
    const id = String.fromCharCode(65 + count); ids.set(device.id, { id, type: profile.type });
    const d = add(devices, tag); d.setAttribute('id', id); d.setAttribute('type', profile.type);
    const point = add(d, 'point'); point.setAttribute('x', String(Math.round(device.x / 1.5))); point.setAttribute('y', String(Math.round(device.y / 1.5)));
    add(d, 'pingErrors'); add(d, 'changed', 'true'); if (device.kind === 'pc') add(d, 'macAddress', `0c00.0000.${String(count+1).padStart(4, '0')}`);
    const config = (label: string, name: string, ports: Port[], networks: string[]) => {
      const c = parse(profile.config); const renamed = doc.createElement(label); while (c.firstChild) renamed.appendChild(c.firstChild);
      const set = (key: string, value: string) => { const parm = Array.from(renamed.querySelectorAll('parms > parm')).find(e => e.getAttribute('name') === key); if (parm) parm.textContent = value; else if (key === 'HOSTNAME') { const node = add(renamed.querySelector('parms')!, 'parm', value); node.setAttribute('name', key); node.setAttribute('type', 'string'); } };
      set('HOSTNAME', name); set('CLOCK', String(Date.now())); set('IS_RIP_RUN', String(networks.length > 0));
      if (networks.length) { const protocols = add(renamed, 'protocols'), rip = add(protocols, 'rip'), map = add(rip, 'networkMap'); for (const n of networks) add(map, 'map', n).setAttribute('key', n); add(rip, 'defaultInformationOriginate', 'false'); }
      d.appendChild(renamed);
      const source = parse(profile.interfaces), target = doc.createElement(label === 'runningConfig' ? 'runningInterfaces' : 'startupInterfaces');
      for (const port of ports) {
        const native = nativePortName(device, port.name);
        const template = Array.from(source.children).find(e => e.getAttribute('type') === native);
        if (!template) continue;
        const e = template.cloneNode(true) as Element; e.setAttribute('shutdown', String(!port.enabled));
        const ip = e.querySelector('primaryIpConfig') || add(e, 'primaryIpConfig'); ip.replaceChildren();
        if (port.ip) { add(ip, 'ipAddress', port.ip); add(ip, 'subnetMask', port.mask); if (device.kind === 'pc') add(ip, 'defaultGateway', device.gateway); }
        const clock = e.querySelector('hasClock'); if (clock) clock.textContent = String(topology.cables.some(c => c.dce?.deviceId === device.id && c.dce.port === port.name));
        if (port.clockRate) { const rate = add(e, 'clockRate', String(port.clockRate)); e.insertBefore(rate, e.querySelector('encapsulationProtocol') || e.querySelector('hasClock')); }
        if (port.description) { const description = add(e, 'description', port.description); e.insertBefore(description, e.firstChild); }
        target.appendChild(e);
      }
      d.appendChild(target);
    };
    config('runningConfig', device.name, device.ports, device.ripNetworks);
    if (profile.supportsStartup) { const startup = device.startupConfig || defaultStartup(device); config('startupConfig', startup.name, startup.ports, startup.ripNetworks); }
  }
  const connections = add(root, 'connections');
  for (const cable of topology.cables) {
    const a = topology.devices.find(d => d.id === cable.a.deviceId), b = topology.devices.find(d => d.id === cable.b.deviceId);
    if (!a || !b) continue;
    const ca = ids.get(a.id)!, cb = ids.get(b.id)!;
    const connection = add(connections, 'connection'); connection.setAttribute('color', cable.a.port.startsWith('S') ? 'red' : 'white'); connection.setAttribute('name', `${ca.type}${ca.id}${nativePortName(a, cable.a.port)}`);
    for (const [label, device, port, info] of [['initiatingDevice', a, cable.a.port, ca], ['destinationDevice', b, cable.b.port, cb]] as const) {
      const e = add(connection, label); e.setAttribute('id', info.id); e.setAttribute('interface', nativePortName(device, port)); e.setAttribute('type', info.type);
    }
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(doc);
}
