import { makeDevice, type Device, type DeviceKind, type Endpoint, type SwitchModel, type Topology } from './model';

function portName(device: Device, original: string): string | null {
  const name = original.toUpperCase();
  if (device.kind === 'pc') return 'Eth0';
  if (device.kind === 'netconnect') return name.startsWith('S') ? 'N1' : 'N0';
  if (device.kind === 'router') return device.ports.some(port => port.name === name) ? name : null;
  const number = Number(name.match(/\d+$/)?.[0]);
  if (!Number.isInteger(number) || number < 1) return null;
  const index = device.switchModel === '1900' && name.startsWith('F') ? number + 12 : number;
  const port = `P${index}`;
  return device.ports.some(item => item.name === port) ? port : null;
}

export function importRsm(xml: string): { name: string; topology: Topology } {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement.tagName !== 'network') throw new Error('Invalid RouterSim network');
  const elements = Array.from(doc.querySelector('devices')?.children || []);
  const devices: Device[] = [];
  const ids = new Map<string, string>();

  for (const element of elements) {
    const type = element.getAttribute('type') || '';
    const sourceId = element.getAttribute('id') || '';
    const tag = element.tagName.toLowerCase();
    const kind: DeviceKind = tag === 'host' ? 'pc' : tag === 'router2600' ? 'router' : tag === 'netconnect' ? 'netconnect' : 'switch';
    if (!['host', 'router2600', 'netconnect', 'switch1900', 'switch2950', 'switch3550'].includes(tag)) continue;
    const model: SwitchModel = tag === 'switch1900' ? '1900' : tag === 'switch3550' ? '3550' : '2950';
    const point = element.querySelector('point');
    const x = Math.max(0, Number(point?.getAttribute('x') || 0) * 1.5);
    const y = Math.max(0, Number(point?.getAttribute('y') || 0) * 1.5);
    const id = `${kind}-${sourceId}-${devices.length}`;
    const hostname = Array.from(element.querySelectorAll('runningConfig > parms > parm')).find(parm => parm.getAttribute('name') === 'HOSTNAME')?.textContent?.trim();
    const name = kind === 'pc' ? `Host ${sourceId}` : kind === 'netconnect' ? `Net Connect ${sourceId}` : hostname || `${type} ${sourceId}`;
    let device = makeDevice(id, kind, name, x, y, model);
    const interfaces = Array.from(element.querySelectorAll('runningInterfaces > *'));
    device = { ...device, ports: device.ports.map(port => {
      const source = interfaces.find(item => portName(device, item.getAttribute('type') || '') === port.name);
      const ip = source?.querySelector('primaryIpConfig > ipAddress')?.textContent?.trim() || '';
      const mask = source?.querySelector('primaryIpConfig > subnetMask')?.textContent?.trim() || '255.255.255.0';
      const rate = Number(source?.querySelector('clockRate')?.textContent || 0);
      return { ...port, ip, mask, enabled: source?.getAttribute('shutdown') !== 'true', ...(rate > 0 ? { clockRate: rate } : {}) };
    }) };
    if (kind === 'pc') device.gateway = interfaces[0]?.querySelector('primaryIpConfig > defaultGateway')?.textContent?.trim() || '';
    const ripNetworks = Array.from(element.querySelectorAll('runningConfig > protocols > rip > networkMap > map')).map(map => map.textContent?.trim() || '').filter(Boolean);
    device.ripNetworks = ripNetworks;
    devices.push(device);
    ids.set(`${type}:${sourceId}`, id);
  }
  if (!devices.length) throw new Error('No supported devices in RouterSim network');

  const cables: Topology['cables'] = [];
  for (const connection of Array.from(doc.querySelectorAll('connections > connection'))) {
    const first = connection.querySelector('initiatingDevice');
    const second = connection.querySelector('destinationDevice');
    const aDevice = devices.find(device => device.id === ids.get(`${first?.getAttribute('type')}:${first?.getAttribute('id')}`));
    const bDevice = devices.find(device => device.id === ids.get(`${second?.getAttribute('type')}:${second?.getAttribute('id')}`));
    if (!aDevice || !bDevice) continue;
    const aPort = portName(aDevice, first?.getAttribute('interface') || '');
    const bPort = portName(bDevice, second?.getAttribute('interface') || '');
    if (!aPort || !bPort) continue;
    const a: Endpoint = { deviceId: aDevice.id, port: aPort };
    const b: Endpoint = { deviceId: bDevice.id, port: bPort };
    const serial = aPort.startsWith('S') || bPort.startsWith('S');
    const clockSide = connection.querySelector('clockSide')?.textContent?.trim();
    cables.push({ id: `rsm-c${cables.length + 1}`, a, b, ...(serial ? { dce: clockSide === 'destination' ? b : a } : {}) });
  }
  return { name: doc.documentElement.getAttribute('networkName') || 'RouterSim network', topology: { devices, cables } };
}
