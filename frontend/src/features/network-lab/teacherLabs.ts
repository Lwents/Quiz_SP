import { createPreset, type Topology } from './model';

export interface TeacherLab {
  id: string;
  title: string;
  source: string;
  basis: 'Sơ đồ trong tài liệu' | 'Yêu cầu bài tập · phương án minh họa';
  summary: string;
  networkPlan: Array<{ network: string; purpose: string; reason: string }>;
  verify: string[];
}

export const TEACHER_LABS: TeacherLab[] = [
  {
    id: 'week1-one-router', title: 'Tuần 1 · 1 router, 2 PC, 2 dải IP',
    source: 'Tong_hop_noi_dung_bai_tap.txt · Tuần 1, bài 1', basis: 'Yêu cầu bài tập · phương án minh họa',
    summary: 'Hai PC ở hai mạng LAN khác nhau, mỗi LAN nối vào một cổng FastEthernet của cùng router.',
    networkPlan: [
      { network: '192.168.10.0/24', purpose: 'PC1 ↔ R1 F0/0', reason: 'PC1 đặt gateway 192.168.10.1 để ra khỏi LAN thứ nhất.' },
      { network: '192.168.20.0/24', purpose: 'R1 F0/1 ↔ PC2', reason: 'PC2 đặt gateway 192.168.20.1; hai cổng router phải ở hai mạng khác nhau.' },
    ],
    verify: ['Ping từ mỗi PC tới gateway của nó.', 'Ping PC1 → PC2; nếu lỗi, kiểm tra mask, gateway và trạng thái hai cổng.'],
  },
  {
    id: 'week1-switch', title: 'Tuần 1 · 3 PC và 1 switch',
    source: 'Tong_hop_noi_dung_bai_tap.txt · Tuần 1, bài 2', basis: 'Yêu cầu bài tập · phương án minh họa',
    summary: 'Ba PC cùng một LAN 192.168.1.0/24, mỗi PC cắm vào một cổng switch.',
    networkPlan: [{ network: '192.168.1.0/24', purpose: 'PC1 .11, PC2 .12, PC3 .13', reason: 'Cùng địa chỉ mạng và mask /24 nên các PC liên lạc qua switch ở lớp 2.' }],
    verify: ['Ping PC1 → PC2 và PC3.', 'Nếu lỗi, kiểm tra dây, cổng switch, IP trùng và mask /24.'],
  },
  {
    id: 'week1-two-router-diagram', title: 'Tuần 1 · 2 router theo sơ đồ chia /26',
    source: 'Cau_hinh_2_router_1_dai_IP.docx · sơ đồ và bảng lệnh', basis: 'Sơ đồ trong tài liệu',
    summary: 'Đúng cổng và IP trên sơ đồ: PC1 .20, R1 F0/1 .1, R1 S0/0 .65, R2 S0/1 .66, R2 F0/0 .130, PC2 .150.',
    networkPlan: [
      { network: '192.168.1.0/26', purpose: 'PC1 .20 ↔ R1 F0/1 .1', reason: 'LAN trái có 62 địa chỉ host dùng được; .1 là gateway.' },
      { network: '192.168.1.64/26', purpose: 'R1 S0/0 .65 ↔ R2 S0/1 .66', reason: 'Đường giữa hai router cần một mạng riêng; hai đầu phải cùng subnet.' },
      { network: '192.168.1.128/26', purpose: 'R2 F0/0 .130 ↔ PC2 .150', reason: 'LAN phải khác hai mạng trước; .130 là gateway của PC2.' },
      { network: '192.168.1.192/26', purpose: 'Dự phòng', reason: 'Tách /24 thành bốn mạng /26; bài này dùng ba mạng.' },
    ],
    verify: ['Ping PC1 → R1 .1, R1 .65 → R2 .66, rồi PC1 → PC2 .150.', 'Dùng show ip route tại R1 và R2 để xem tuyến RIP và kiểm tra đường về.'],
  },
  {
    id: 'week34-two-router-guide', title: 'Tuần 3–4 · 2 router theo ảnh RouterSim',
    source: 'HD_bai_tap_2_Router.docx · sơ đồ RouterSim và lệnh', basis: 'Sơ đồ trong tài liệu',
    summary: 'Biến thể trong ảnh hướng dẫn: PC1 .10; LAN R2 dùng F0/1 .129, PC2 .150. Các mạng /26 và đường serial giữ nguyên.',
    networkPlan: [
      { network: '192.168.1.0/26', purpose: 'PC1 .10 ↔ R1 F0/1 .1', reason: '.10 và .20 đều là địa chỉ host hợp lệ của cùng LAN; tài liệu này dùng .10.' },
      { network: '192.168.1.64/26', purpose: 'R1 S0/0 .65 ↔ R2 S0/1 .66', reason: 'Hai đầu serial cùng mạng .64/26.' },
      { network: '192.168.1.128/26', purpose: 'R2 F0/1 .129 ↔ PC2 .150', reason: 'Ảnh RouterSim dùng F0/1 và .129, khác F0/0 .130 trong sơ đồ Tuần 1; cả hai đều hợp lệ.' },
    ],
    verify: ['Ping PC1 → PC2 .150 và chiều ngược lại.', 'Đối chiếu R2 F0/1 .129 với default gateway .129 của PC2.'],
  },
  {
    id: 'week34-three-router-guide', title: 'Tuần 3–4 · 3 router tam giác theo hướng dẫn',
    source: 'HD_bai_tap_3_Router.docx · cùng nội dung ở Tuần 1 và Tuần 3–4', basis: 'Sơ đồ trong tài liệu',
    summary: 'Ba router nối tam giác, mỗi router có một PC. Sơ đồ hướng dẫn lặp ở hai thư mục nên chỉ tạo một bài.',
    networkPlan: [
      { network: '192.168.1.0/27', purpose: 'PC1 – R1', reason: 'PC1 .2, gateway R1 .1.' },
      { network: '192.168.1.32/27', purpose: 'R1 – R2', reason: 'Hai đầu serial .40 và .41.' },
      { network: '192.168.1.64/27', purpose: 'R2 – PC2', reason: 'R2 .65, PC2 .66.' },
      { network: '192.168.1.96/27', purpose: 'R2 – R3', reason: 'Hai đầu serial .97 và .98.' },
      { network: '192.168.1.128/27', purpose: 'R3 – PC3', reason: 'R3 .129, PC3 .130.' },
      { network: '192.168.1.160/27', purpose: 'R3 – R1', reason: 'Hai đầu serial .161 và .162.' },
    ],
    verify: ['Ping từng PC tới gateway, rồi thử PC1 → PC2, PC3.', 'Dùng show ip route xem các mạng /27 học qua RIP.'],
  },
  {
    id: 'week34-three-router-195', title: 'Tuần 3–4 · 3 router, dải 195.10.10.x',
    source: 'Tong_hop_noi_dung_bai_tap.txt · Tuần 3–4, bài 1', basis: 'Yêu cầu bài tập · phương án minh họa',
    summary: 'Áp dụng hình tam giác ba router của bài hướng dẫn vào khối 195.10.10.0/24 được giao.',
    networkPlan: [
      { network: '195.10.10.0/27', purpose: 'PC1 – R1', reason: 'LAN thứ nhất.' },
      { network: '195.10.10.32/27', purpose: 'R1 – R2', reason: 'Đường serial thứ nhất.' },
      { network: '195.10.10.64/27', purpose: 'R2 – PC2', reason: 'LAN thứ hai.' },
      { network: '195.10.10.96/27', purpose: 'R2 – R3', reason: 'Đường serial thứ hai.' },
      { network: '195.10.10.128/27', purpose: 'R3 – PC3', reason: 'LAN thứ ba.' },
      { network: '195.10.10.160/27', purpose: 'R3 – R1', reason: 'Đường serial thứ ba.' },
    ],
    verify: ['Đổi IP mẫu nếu thầy yêu cầu cách gán khác, miễn các subnet không chồng nhau.', 'Ping giữa cả ba PC và kiểm tra tuyến RIP.'],
  },
  {
    id: 'week34-four-router-stt', title: 'Tuần 3–4 · 4 router, dải 200.10.STT.x',
    source: 'Tong_hop_noi_dung_bai_tap.txt · Tuần 3–4, bài 2', basis: 'Yêu cầu bài tập · phương án minh họa',
    summary: 'Bốn router nối chuỗi, mỗi router có một PC. Thay STT bằng số thứ tự của bạn trước khi mở bài.',
    networkPlan: [
      { network: '200.10.{STT}.0/27', purpose: 'PC1 – R1', reason: 'LAN 1.' },
      { network: '200.10.{STT}.32/27', purpose: 'R1 – R2', reason: 'Serial 1.' },
      { network: '200.10.{STT}.64/27', purpose: 'R2 – PC2', reason: 'LAN 2.' },
      { network: '200.10.{STT}.96/27', purpose: 'R2 – R3', reason: 'Serial 2.' },
      { network: '200.10.{STT}.128/27', purpose: 'R3 – PC3', reason: 'LAN 3.' },
      { network: '200.10.{STT}.160/27', purpose: 'R3 – R4', reason: 'Serial 3.' },
      { network: '200.10.{STT}.192/27', purpose: 'R4 – PC4', reason: 'LAN 4; mạng .224/27 còn dự phòng.' },
    ],
    verify: ['Ping từng PC tới gateway trước, rồi ping PC1 → PC4.', 'Kiểm tra STT và RIP trên cả bốn router nếu ping liên LAN thất bại.'],
  },
];

function replaceIpBlock(topology: Topology, from: string, to: string): Topology {
  for (const device of topology.devices) {
    device.gateway = device.gateway.replace(from, to);
    device.ripNetworks = device.ripNetworks.map(network => network.replace(from, to));
    for (const port of device.ports) port.ip = port.ip.replace(from, to);
  }
  return topology;
}

function keepClockOnlyOnDce(topology: Topology): Topology {
  for (const device of topology.devices) for (const port of device.ports) if (port.name.startsWith('S')) delete port.clockRate;
  for (const cable of topology.cables) {
    const port = topology.devices.find(device => device.id === cable.dce?.deviceId)?.ports.find(item => item.name === cable.dce?.port);
    if (port) port.clockRate = 64000;
  }
  return topology;
}

export function buildTeacherTopology(id: string, studentNumber = 1): Topology {
  let topology: Topology;
  if (id === 'week1-one-router') topology = createPreset('one-router');
  else if (id === 'week1-switch') topology = createPreset('switch');
  else if (id === 'week1-two-router-diagram' || id === 'week34-two-router-guide') {
    topology = createPreset('two-routers');
    topology.devices.find(device => device.id === 'pc1')!.name = 'PC1';
    topology.devices.find(device => device.id === 'pc2')!.name = 'PC2';
    if (id === 'week1-two-router-diagram') topology.devices.find(device => device.id === 'pc1')!.ports[0].ip = '192.168.1.20';
    else {
      const r2 = topology.devices.find(device => device.id === 'r2')!;
      const oldPort = r2.ports.find(port => port.name === 'F0/0')!;
      oldPort.ip = ''; oldPort.enabled = false;
      const lanPort = r2.ports.find(port => port.name === 'F0/1')!;
      lanPort.ip = '192.168.1.129'; lanPort.mask = oldPort.mask; lanPort.enabled = true;
      topology.devices.find(device => device.id === 'pc2')!.gateway = '192.168.1.129';
      const lanCable = topology.cables.find(cable => cable.a.deviceId === 'r2' && cable.a.port === 'F0/0');
      if (lanCable) lanCable.a.port = 'F0/1';
    }
  } else if (id === 'week34-three-router-guide') topology = createPreset('three-routers');
  else if (id === 'week34-three-router-195') topology = replaceIpBlock(createPreset('three-routers'), '192.168.1.', '195.10.10.');
  else if (id === 'week34-four-router-stt') topology = replaceIpBlock(createPreset('four-routers'), '200.10.1.', `200.10.${Math.max(1, Math.min(254, Math.trunc(studentNumber) || 1))}.`);
  else throw new Error(`Unknown teacher lab: ${id}`);
  return keepClockOnlyOnDce(topology);
}

export function teacherText(value: string, studentNumber: number): string {
  return value.replaceAll('{STT}', String(studentNumber));
}
