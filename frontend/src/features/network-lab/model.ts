export type DeviceKind = 'pc' | 'switch' | 'router' | 'netconnect';
export type SwitchModel = '1900' | '2950' | '3550';
export type LabPreset = 'one-router' | 'switch' | 'two-routers' | 'three-routers' | 'four-routers' | 'blank';

export interface Port {
  name: string;
  ip: string;
  mask: string;
  enabled: boolean;
  clockRate?: number;
}

export interface Device {
  id: string;
  kind: DeviceKind;
  switchModel?: SwitchModel;
  name: string;
  x: number;
  y: number;
  ports: Port[];
  gateway: string;
  ripNetworks: string[];
}

export interface Endpoint { deviceId: string; port: string }
export interface Cable { id: string; a: Endpoint; b: Endpoint; dce?: Endpoint }
export interface Topology { devices: Device[]; cables: Cable[] }
export interface PingResult { ok: boolean; path: string[]; message: string; why: string }

export const PORT_NAMES: Record<DeviceKind, string[]> = {
  pc: ['Eth0'],
  switch: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'],
  router: ['F0/0', 'F0/1', 'S0/0', 'S0/1'],
  netconnect: ['N0', 'N1'],
};

export function makeDevice(id: string, kind: DeviceKind, name: string, x: number, y: number, switchModel: SwitchModel = '2950'): Device {
  const names = kind === 'switch' ? Array.from({ length: switchModel === '1900' ? 14 : switchModel === '3550' ? 10 : 12 }, (_, index) => `P${index + 1}`) : PORT_NAMES[kind];
  return {
    id, kind, name, x, y,
    ...(kind === 'switch' ? { switchModel } : {}),
    gateway: '', ripNetworks: [],
    ports: names.map(port => ({ name: port, ip: '', mask: '255.255.255.0', enabled: kind !== 'router' })),
  };
}

function setPort(device: Device, name: string, ip: string, mask: string): Device {
  return { ...device, ports: device.ports.map(port => port.name === name ? { ...port, ip, mask, enabled: true } : port) };
}

function pc(id: string, name: string, x: number, y: number, ip: string, mask: string, gateway = ''): Device {
  return { ...setPort(makeDevice(id, 'pc', name, x, y), 'Eth0', ip, mask), gateway };
}

function router(id: string, name: string, x: number, y: number, config: Record<string, [string, string]>, ripNetworks: string[] = []): Device {
  let result = makeDevice(id, 'router', name, x, y);
  for (const [port, [ip, mask]] of Object.entries(config)) result = setPort(result, port, ip, mask);
  return { ...result, ripNetworks, ports: result.ports.map(port => port.name.startsWith('S') && port.ip ? { ...port, clockRate: 64000 } : port) };
}

function switchDevice(id: string, name: string, x: number, y: number): Device {
  return makeDevice(id, 'switch', name, x, y);
}

function cable(id: string, a: string, aPort: string, b: string, bPort: string): Cable {
  const first = { deviceId: a, port: aPort };
  const second = { deviceId: b, port: bPort };
  return { id, a: first, b: second, ...((aPort.startsWith('S') || bPort.startsWith('S')) ? { dce: aPort.startsWith('S') ? first : second } : {}) };
}

export const PRESET_LABELS: Record<LabPreset, string> = {
  'one-router': '1 router · 2 PC · 2 dải IP',
  switch: '3 PC · 1 switch',
  'two-routers': '2 router · 1 khối /24',
  'three-routers': '3 router · RIP · /27',
  'four-routers': '4 router · /27 (STT=1)',
  blank: 'Sơ đồ trống',
};

export function createPreset(preset: LabPreset): Topology {
  const m24 = '255.255.255.0';
  const m26 = '255.255.255.192';
  const m27 = '255.255.255.224';
  if (preset === 'one-router') return {
    devices: [
      pc('pc1', 'PC1', 95, 225, '192.168.10.10', m24, '192.168.10.1'),
      router('r1', 'R1', 435, 225, { 'F0/0': ['192.168.10.1', m24], 'F0/1': ['192.168.20.1', m24] }),
      pc('pc2', 'PC2', 785, 225, '192.168.20.10', m24, '192.168.20.1'),
    ],
    cables: [cable('c1', 'pc1', 'Eth0', 'r1', 'F0/0'), cable('c2', 'r1', 'F0/1', 'pc2', 'Eth0')],
  };
  if (preset === 'switch') return {
    devices: [
      pc('pc1', 'PC1', 80, 115, '192.168.1.11', m24),
      pc('pc2', 'PC2', 780, 115, '192.168.1.12', m24),
      pc('pc3', 'PC3', 440, 405, '192.168.1.13', m24),
      switchDevice('sw1', 'SW1', 435, 175),
    ],
    cables: [cable('c1', 'pc1', 'Eth0', 'sw1', 'P1'), cable('c2', 'pc2', 'Eth0', 'sw1', 'P2'), cable('c3', 'pc3', 'Eth0', 'sw1', 'P3')],
  };
  if (preset === 'two-routers') return {
    devices: [
      pc('pc1', 'Host A', 145, 125, '192.168.1.10', m26, '192.168.1.1'),
      router('r1', 'R1', 285, 375, { 'F0/1': ['192.168.1.1', m26], 'S0/0': ['192.168.1.65', m26] }, ['192.168.1.0', '192.168.1.64']),
      router('r2', 'R2', 830, 320, { 'F0/0': ['192.168.1.130', m26], 'S0/1': ['192.168.1.66', m26] }, ['192.168.1.64', '192.168.1.128']),
      pc('pc2', 'Host B', 1080, 125, '192.168.1.150', m26, '192.168.1.130'),
    ],
    cables: [cable('c1', 'pc1', 'Eth0', 'r1', 'F0/1'), cable('c2', 'r1', 'S0/0', 'r2', 'S0/1'), cable('c3', 'r2', 'F0/0', 'pc2', 'Eth0')],
  };
  if (preset === 'three-routers') return {
    devices: [
      pc('pc1', 'PC1', 45, 110, '192.168.1.2', m27, '192.168.1.1'),
      pc('pc2', 'PC2', 850, 110, '192.168.1.66', m27, '192.168.1.65'),
      pc('pc3', 'PC3', 445, 475, '192.168.1.130', m27, '192.168.1.129'),
      router('r1', 'R1', 270, 175, { 'F0/1': ['192.168.1.1', m27], 'S0/0': ['192.168.1.162', m27], 'S0/1': ['192.168.1.40', m27] }, ['192.168.1.0', '192.168.1.32', '192.168.1.160']),
      router('r2', 'R2', 620, 175, { 'F0/1': ['192.168.1.65', m27], 'S0/0': ['192.168.1.97', m27], 'S0/1': ['192.168.1.41', m27] }, ['192.168.1.32', '192.168.1.64', '192.168.1.96']),
      router('r3', 'R3', 445, 340, { 'F0/1': ['192.168.1.129', m27], 'S0/0': ['192.168.1.98', m27], 'S0/1': ['192.168.1.161', m27] }, ['192.168.1.96', '192.168.1.128', '192.168.1.160']),
    ],
    cables: [
      cable('c1', 'pc1', 'Eth0', 'r1', 'F0/1'), cable('c2', 'pc2', 'Eth0', 'r2', 'F0/1'), cable('c3', 'pc3', 'Eth0', 'r3', 'F0/1'),
      cable('c4', 'r1', 'S0/1', 'r2', 'S0/1'), cable('c5', 'r2', 'S0/0', 'r3', 'S0/0'), cable('c6', 'r3', 'S0/1', 'r1', 'S0/0'),
    ],
  };
  if (preset === 'four-routers') {
    const base = '200.10.1.';
    return {
      devices: [
        pc('pc1', 'PC1', 20, 90, base + '2', m27, base + '1'),
        pc('pc2', 'PC2', 275, 90, base + '66', m27, base + '65'),
        pc('pc3', 'PC3', 560, 90, base + '130', m27, base + '129'),
        pc('pc4', 'PC4', 840, 90, base + '194', m27, base + '193'),
        router('r1', 'R1', 20, 340, { 'F0/1': [base + '1', m27], 'S0/0': [base + '33', m27] }, [base + '0', base + '32']),
        router('r2', 'R2', 275, 340, { 'F0/1': [base + '65', m27], 'S0/0': [base + '34', m27], 'S0/1': [base + '97', m27] }, [base + '32', base + '64', base + '96']),
        router('r3', 'R3', 560, 340, { 'F0/1': [base + '129', m27], 'S0/0': [base + '98', m27], 'S0/1': [base + '161', m27] }, [base + '96', base + '128', base + '160']),
        router('r4', 'R4', 840, 340, { 'F0/1': [base + '193', m27], 'S0/0': [base + '162', m27] }, [base + '160', base + '192']),
      ],
      cables: [
        cable('c1', 'pc1', 'Eth0', 'r1', 'F0/1'), cable('c2', 'pc2', 'Eth0', 'r2', 'F0/1'), cable('c3', 'pc3', 'Eth0', 'r3', 'F0/1'), cable('c4', 'pc4', 'Eth0', 'r4', 'F0/1'),
        cable('c5', 'r1', 'S0/0', 'r2', 'S0/0'), cable('c6', 'r2', 'S0/1', 'r3', 'S0/0'), cable('c7', 'r3', 'S0/1', 'r4', 'S0/0'),
      ],
    };
  }
  return { devices: [], cables: [] };
}

export function ipNumber(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((value, part) => (value * 256 + Number(part)) >>> 0, 0);
}

export function networkInfo(ip: string, mask: string): { network: string; broadcast: string; prefix: number; hosts: number } | null {
  const address = ipNumber(ip);
  const bits = ipNumber(mask);
  if (address === null || bits === null) return null;
  const maskBits = bits.toString(2).padStart(32, '0');
  if (!/^1+0*$/.test(maskBits)) return null;
  const prefix = maskBits.indexOf('0') < 0 ? 32 : maskBits.indexOf('0');
  if (prefix < 1 || prefix > 30) return null;
  return {
    network: formatIp((address & bits) >>> 0),
    broadcast: formatIp(((address & bits) | (~bits >>> 0)) >>> 0),
    prefix,
    hosts: 2 ** (32 - prefix) - 2,
  };
}

export function formatIp(value: number): string {
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
}

function sameNetwork(ipA: string, maskA: string, ipB: string, maskB: string): boolean {
  const a = networkInfo(ipA, maskA);
  const b = networkInfo(ipB, maskB);
  return Boolean(a && b && a.network === b.network && a.prefix === b.prefix);
}

function endpointKey(point: Endpoint): string { return `${point.deviceId}:${point.port}`; }

export function cableIsActive(topology: Topology, link: Cable): boolean {
  if (!link.dce) return true;
  const device = topology.devices.find(item => item.id === link.dce?.deviceId);
  const port = device?.ports.find(item => item.name === link.dce?.port);
  return Boolean(port?.enabled && port.clockRate && port.clockRate > 0);
}

export function lanPeers(topology: Topology, start: Endpoint): Endpoint[] {
  const queue = [start];
  const seen = new Set<string>();
  const result: Endpoint[] = [];
  while (queue.length) {
    const point = queue.shift()!;
    const key = endpointKey(point);
    if (seen.has(key)) continue;
    seen.add(key);
    const device = topology.devices.find(item => item.id === point.deviceId);
    if (!device) continue;
    if (device.kind === 'switch' || device.kind === 'netconnect') {
      if (!device.ports.find(port => port.name === point.port)?.enabled) continue;
      for (const port of device.ports.filter(port => port.enabled)) queue.push({ deviceId: device.id, port: port.name });
    } else {
      result.push(point);
    }
    for (const link of topology.cables) {
      if (!cableIsActive(topology, link)) continue;
      if (endpointKey(link.a) === key) queue.push(link.b);
      if (endpointKey(link.b) === key) queue.push(link.a);
    }
  }
  return result;
}

function getPort(topology: Topology, point: Endpoint): Port | undefined {
  return topology.devices.find(device => device.id === point.deviceId)?.ports.find(port => port.name === point.port);
}

function findOnLan(topology: Topology, from: Endpoint, ip: string): Endpoint | undefined {
  return lanPeers(topology, from).find(point => {
    const port = getPort(topology, point);
    return port?.enabled && port.ip === ip;
  });
}

function hasRip(device: Device, port: Port): boolean {
  const info = networkInfo(port.ip, port.mask);
  return Boolean(info && device.ripNetworks.includes(info.network));
}

function traceOneWay(topology: Topology, source: Device, target: Device): PingResult {
  const sourcePort = source.ports[0];
  const targetPort = target.ports[0];
  const sourceInfo = networkInfo(sourcePort.ip, sourcePort.mask);
  const targetInfo = networkInfo(targetPort.ip, targetPort.mask);
  const path = [source.name];
  const fail = (message: string, why: string): PingResult => ({ ok: false, path, message, why });
  if (!sourcePort.enabled || !targetPort.enabled) return fail('Cổng PC đang tắt.', 'Bật cổng mạng trước khi thử ping.');
  if (!sourceInfo || !targetInfo) return fail('IP hoặc subnet mask không hợp lệ.', 'Nhập IPv4 và mask liên tiếp như 255.255.255.192.');
  const sourcePoint = { deviceId: source.id, port: sourcePort.name };
  if (sameNetwork(sourcePort.ip, sourcePort.mask, targetPort.ip, targetPort.mask)) {
    if (findOnLan(topology, sourcePoint, targetPort.ip)) return { ok: true, path: [...path, target.name], message: 'Ping thành công.', why: 'Hai PC cùng mạng con và nối chung một miền LAN.' };
    return fail('Hai PC cùng mạng IP nhưng không thông nhau qua dây/switch.', 'Kiểm tra cáp nối và cổng switch. Router không tự chuyển frame giữa hai cổng ở cùng mạng IP.');
  }
  if (!source.gateway) return fail('PC chưa có default gateway.', 'Đích nằm ngoài mạng con của PC, nên PC cần gửi gói tới router gần mình.');
  if (!sameNetwork(sourcePort.ip, sourcePort.mask, source.gateway, sourcePort.mask)) {
    return fail('Gateway nằm ngoài mạng con của PC.', `PC thuộc ${sourceInfo.network}/${sourceInfo.prefix}; gateway phải nằm trong chính mạng này.`);
  }
  const gatewayPoint = findOnLan(topology, sourcePoint, source.gateway);
  const firstRouter = topology.devices.find(device => device.id === gatewayPoint?.deviceId);
  if (!firstRouter || firstRouter.kind !== 'router') return fail('Không tìm thấy router gateway trên LAN.', 'Kiểm tra IP cổng router, trạng thái cổng và dây nối PC–router/switch.');
  const queue: { device: Device; path: string[]; crossedRouter: boolean }[] = [{ device: firstRouter, path: [...path, firstRouter.name], crossedRouter: false }];
  const visited = new Set<string>();
  while (queue.length) {
    const step = queue.shift()!;
    const current = step.device;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    for (const port of current.ports) {
      if (!port.enabled || !port.ip || !sameNetwork(port.ip, port.mask, targetPort.ip, targetPort.mask)) continue;
      if (step.crossedRouter && !hasRip(current, port)) continue;
      if (findOnLan(topology, { deviceId: current.id, port: port.name }, targetPort.ip)) {
        return { ok: true, path: [...step.path, target.name], message: 'Ping thành công.', why: `Router chuyển gói tới mạng ${targetInfo.network}/${targetInfo.prefix}; tuyến đi và dây nối đều hợp lệ.` };
      }
    }
    for (const port of current.ports) {
      if (!port.enabled || !port.ip || !hasRip(current, port)) continue;
      const peers = lanPeers(topology, { deviceId: current.id, port: port.name });
      for (const peer of peers) {
        const neighbor = topology.devices.find(device => device.id === peer.deviceId);
        const neighborPort = getPort(topology, peer);
        if (!neighbor || neighbor.kind !== 'router' || neighbor.id === current.id || !neighborPort?.enabled || !neighborPort.ip || visited.has(neighbor.id)) continue;
        if (!sameNetwork(port.ip, port.mask, neighborPort.ip, neighborPort.mask) || !hasRip(neighbor, neighborPort)) continue;
        queue.push({ device: neighbor, path: [...step.path, neighbor.name], crossedRouter: true });
      }
    }
  }
  return fail('Router chưa có đường đến mạng đích.', `Đích thuộc ${targetInfo.network}/${targetInfo.prefix}. Kiểm tra RIP trên mạng nối các router và mạng LAN đích; dùng show ip route để xem đường học được.`);
}

export function simulatePing(topology: Topology, sourceId: string, targetIp: string): PingResult {
  const source = topology.devices.find(device => device.id === sourceId);
  if (!source || source.kind !== 'pc') return { ok: false, path: [], message: 'Chọn PC nguồn.', why: 'Ping được phát từ PC trong bài thực hành.' };
  const target = topology.devices.find(device => device.kind === 'pc' && device.ports[0].ip === targetIp);
  if (!target) return { ok: false, path: [source.name], message: 'Không tìm thấy PC đích với IP này.', why: 'Kiểm tra IP đích đã cấu hình và nhập đúng bốn octet.' };
  if (source.id === target.id) return { ok: false, path: [source.name], message: 'Đang ping chính PC nguồn.', why: 'Chọn IP của một PC khác để kiểm tra đường mạng.' };
  const ips = topology.devices.flatMap(device => device.ports.filter(port => port.ip).map(port => port.ip));
  if (new Set(ips).size !== ips.length) return { ok: false, path: [source.name], message: 'Có địa chỉ IP bị dùng trùng.', why: 'Mỗi giao diện lớp 3 phải có một IP riêng.' };
  const forward = traceOneWay(topology, source, target);
  if (!forward.ok) {
    const unclocked = topology.cables.find(link => link.dce && !cableIsActive(topology, link));
    if (unclocked && forward.message === 'Router chưa có đường đến mạng đích.') return { ...forward, message: 'Đầu cáp serial DCE chưa có clock rate.', why: `Cấu hình clock rate 64000 trên cổng ${unclocked.dce?.port} của router ở đầu DCE, rồi thử lại. ${forward.why}` };
    return forward;
  }
  const backward = traceOneWay(topology, target, source);
  if (!backward.ok) return { ok: false, path: forward.path, message: 'Gói đi tới đích nhưng đường phản hồi bị lỗi.', why: `${target.name}: ${backward.message} ${backward.why}` };
  return { ...forward, why: `${forward.why} Phản hồi từ ${target.name} cũng tìm được đường về ${source.name}.` };
}

export function simulateRouterPing(topology: Topology, routerId: string, targetIp: string): PingResult {
  const source = topology.devices.find(device => device.id === routerId && device.kind === 'router');
  if (!source) return { ok: false, path: [], message: 'Không tìm thấy router nguồn.', why: 'Chọn console của router để ping.' };
  if (ipNumber(targetIp) === null) return { ok: false, path: [source.name], message: 'Địa chỉ IP đích không hợp lệ.', why: 'Nhập địa chỉ IPv4 sau lệnh ping.' };
  const targets = topology.devices.flatMap(device => device.ports.filter(port => port.ip === targetIp).map(port => ({ device, port })));
  if (targets.length !== 1) return { ok: false, path: [source.name], message: targets.length ? 'Địa chỉ IP bị dùng trùng.' : 'Không tìm thấy IP đích.', why: 'Kiểm tra IP trên PC hoặc cổng router đích.' };
  const target = targets[0];
  const queue: Array<{ router: Device; path: string[] }> = [{ router: source, path: [source.name] }];
  const visited = new Set<string>();
  while (queue.length) {
    const { router, path } = queue.shift()!;
    if (visited.has(router.id)) continue;
    visited.add(router.id);
    if (router.id === target.device.id && target.port.enabled) return { ok: true, path, message: 'Ping thành công.', why: 'IP đích thuộc cổng đang bật của router.' };
    for (const port of router.ports) {
      if (!port.enabled || !networkInfo(port.ip, port.mask)) continue;
      const peers = lanPeers(topology, { deviceId: router.id, port: port.name });
      for (const peer of peers) {
        const neighbor = topology.devices.find(device => device.id === peer.deviceId);
        const neighborPort = neighbor?.ports.find(item => item.name === peer.port);
        if (!neighbor || neighbor.id === router.id || !neighborPort?.enabled || !sameNetwork(port.ip, port.mask, neighborPort.ip, neighborPort.mask)) continue;
        if (neighbor.id === target.device.id && neighborPort.name === target.port.name) {
          if (neighbor.kind === 'pc' && neighbor.gateway !== port.ip) return { ok: false, path: [...path, neighbor.name], message: 'Đích nhận được gói nhưng không có đường trả lời.', why: `Gateway của ${neighbor.name} phải là ${port.ip}.` };
          return { ok: true, path: [...path, neighbor.name], message: 'Ping thành công.', why: 'Các cổng, dây nối và đường định tuyến đến IP đích đều hợp lệ.' };
        }
        if (neighbor.kind === 'router' && !visited.has(neighbor.id) && hasRip(router, port) && hasRip(neighbor, neighborPort)) queue.push({ router: neighbor, path: [...path, neighbor.name] });
      }
    }
  }
  return { ok: false, path: [source.name], message: 'Không có đường đến IP đích.', why: 'Kiểm tra trạng thái cổng, cáp serial/DCE, địa chỉ mạng và các mạng khai báo trong RIP.' };
}
