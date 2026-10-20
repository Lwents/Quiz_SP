export interface WalkthroughConnection {
  name: string;
  first: string;
  second: string;
  subnet: string;
  dce?: string;
}

export interface WalkthroughStep {
  title: string;
  why: string;
  actions: string[];
  commands?: string[];
  commandGroups?: Array<{ label: string; lines: string[] }>;
  result?: string;
  connections?: WalkthroughConnection[];
}

export function getThreeRouterWalkthrough(base: string): WalkthroughStep[] {
  const ip = (last: number) => `${base}.${last}`;
  return [
    {
      title: 'Đọc ví dụ của thầy và tự tính subnet',
      why: `Bài có 6 đoạn mạng riêng: 3 LAN nối PC với router và 3 dây nối router thành tam giác. Khối ${ip(0)}/24 có 8 bit host ở octet cuối. Mượn 2 bit chỉ đánh số được 2² = 4 subnet, thiếu 6 mạng; mượn 3 bit được 2³ = 8 subnet, nên prefix mới là /24 + 3 = /27. Còn 5 bit host, mỗi subnet có 2⁵ = 32 địa chỉ, trong đó 30 địa chỉ gán được cho thiết bị.`,
      actions: [
        'Ghi sáu mạng cần dùng: .0 cho PC1–R1; .32 cho R1–R2; .64 cho PC2–R2; .96 cho R2–R3; .128 cho PC3–R3; .160 cho R3–R1. Tất cả dùng /27.',
        'Mask /27 là 255.255.255.224. Bước nhảy là 256 − 224 = 32; .192/27 và .224/27 còn để dự phòng.',
        'Đây là phép chia đều theo bài mẫu. Trước khi cấu hình, hãy tự trả lời: vì sao mượn 2 bit chưa đủ? Vì sao mỗi mạng còn 30 địa chỉ host?',
      ],
      result: 'Chưa nhập lệnh ở bước này. Hãy dùng sáu mạng trên làm bảng địa chỉ để cấu hình đúng từng đầu cáp.',
    },
    {
      title: 'Tự thêm 3 PC và 3 router lên vùng vẽ',
      why: 'Bài thực hành bắt đầu bằng canvas trống để bạn tự dựng sơ đồ. PC tạo lưu lượng; router nối các mạng con. Bài này không cần switch vì mỗi LAN chỉ có một PC và một cổng router.',
      actions: [
        'Trên thanh công cụ, bấm Host ba lần rồi bấm Router 2600 ba lần. Bạn cũng có thể kéo biểu tượng vào vùng vẽ.',
        'Kéo ba router thành hình tam giác: R1 ở trên trái, R2 ở trên phải, R3 ở dưới. Đặt mỗi PC cạnh router tương ứng.',
        'Nhấp phải từng PC → Configs để đặt Host Name lần lượt PC1, PC2, PC3. Tạm thời chưa nhập IP. Tên R1, R2, R3 sẽ đặt bằng lệnh hostname ở các bước cấu hình router.',
      ],
      result: 'Trên vùng vẽ cần có đúng 6 thiết bị: PC1, PC2, PC3, R1, R2, R3. Chưa có dây nối.',
    },
    {
      title: 'Tự nối sáu đoạn cáp đúng cổng',
      why: 'Mỗi LAN và mỗi liên kết router thuộc một subnet riêng. Hai đầu cùng một dây phải cùng subnet. Ba dây router dùng cổng serial S; chọn đầu DCE trước để sau đó biết cổng nào phải phát nhịp clock.',
      actions: [
        'Để nối một dây: nhấp phải thiết bị đầu tiên, bấm cổng cần dùng trong hình mặt sau; nhấp phải thiết bị thứ hai rồi bấm cổng còn lại.',
        'Với dây serial, bắt đầu từ đầu DCE ghi trong bảng. Ở thanh vàng phía dưới vùng vẽ, giữ lựa chọn “This end” làm DCE. Đầu DCE sẽ nhận clock rate ở bước cấu hình.',
        'Nối lần lượt theo bảng. Dùng Eth0 trên PC; dùng F0/1 cho LAN; dùng đúng S0/0 hoặc S0/1 cho dây giữa router.',
      ],
      connections: [
        { name: 'LAN PC1', first: 'PC1 Eth0', second: 'R1 F0/1', subnet: `${ip(0)}/27` },
        { name: 'R1 – R2', first: 'R1 S0/1 (DCE)', second: 'R2 S0/1', subnet: `${ip(32)}/27`, dce: 'R1 S0/1' },
        { name: 'LAN PC2', first: 'PC2 Eth0', second: 'R2 F0/1', subnet: `${ip(64)}/27` },
        { name: 'R2 – R3', first: 'R2 S0/0 (DCE)', second: 'R3 S0/0', subnet: `${ip(96)}/27`, dce: 'R2 S0/0' },
        { name: 'LAN PC3', first: 'PC3 Eth0', second: 'R3 F0/1', subnet: `${ip(128)}/27` },
        { name: 'R3 – R1', first: 'R3 S0/1 (DCE)', second: 'R1 S0/0', subnet: `${ip(160)}/27`, dce: 'R3 S0/1' },
      ],
      result: 'Bộ đếm cuối cửa sổ phải hiện 6 devices · 6 cables. Các dây serial có màu đỏ; dây PC–router nối vào cổng F0/1.',
    },
    {
      title: 'Tự đặt IP, mask và gateway cho từng PC',
      why: 'Gateway là cổng router nằm ngay trong subnet của PC. Địa chỉ mạng (.0, .64, .128) và broadcast (.31, .95, .159) không gán cho thiết bị.',
      actions: [
        'Nhấp phải PC1 → Configs. Chọn “Use the following IP address”, nhập đủ ba dòng rồi bấm OK. Làm tương tự cho PC2 và PC3.',
        'Subnet mask của cả ba PC là 255.255.255.224. Mỗi gateway phải trùng với IP cổng F0/1 của router nối trực tiếp với PC đó.',
      ],
      commands: [
        `PC1  | IP ${ip(2)}       | Mask 255.255.255.224 | Gateway ${ip(1)}`,
        `PC2  | IP ${ip(66)}      | Mask 255.255.255.224 | Gateway ${ip(65)}`,
        `PC3  | IP ${ip(130)}     | Mask 255.255.255.224 | Gateway ${ip(129)}`,
      ],
      result: 'Địa chỉ .2 nằm trong mạng .0/27; .66 nằm trong .64/27; .130 nằm trong .128/27. Mỗi PC và gateway cùng subnet.',
    },
    {
      title: 'Mở console R1 và tự cấu hình các cổng',
      why: `R1 nối ba subnet: LAN PC1 ${ip(0)}/27, dây sang R2 ${ip(32)}/27 và dây sang R3 ${ip(160)}/27. IP .40 thuộc dải .32–.63; IP .162 thuộc dải .160–.191. R1 S0/1 là đầu DCE của dây R1–R2 nên chỉ cổng đó đặt clock rate.`,
      actions: [
        'Nhấp đúp R1. Nếu console hiện “Press RETURN to get started!”, bấm Enter một lần.',
        'Gõ từng dòng bên dưới rồi bấm Enter sau mỗi dòng. Lệnh interface chọn cổng; các lệnh IP và no shutdown áp dụng cho cổng đang chọn.',
      ],
      commands: [
        'enable', 'configure terminal', 'hostname R1',
        'interface F0/1', `ip address ${ip(1)} 255.255.255.224`, 'no shutdown', 'exit',
        'interface S0/1', `ip address ${ip(40)} 255.255.255.224`, 'clock rate 64000', 'no shutdown', 'exit',
        'interface S0/0', `ip address ${ip(162)} 255.255.255.224`, 'no shutdown', 'exit',
      ],
      result: 'R1 F0/1 nối PC1; R1 S0/1 là DCE nối R2; R1 S0/0 nối R3. Chỉ R1 S0/1 có clock rate.',
    },
    {
      title: 'Tự cấu hình các cổng trên R2',
      why: `R2 nối subnet .32/27 sang R1, LAN .64/27 của PC2 và subnet .96/27 sang R3. S0/0 của R2 là DCE trên dây R2–R3.`,
      actions: ['Nhấp đúp R2, bấm Enter nếu console yêu cầu, rồi gõ từng dòng lệnh.'],
      commands: [
        'enable', 'configure terminal', 'hostname R2',
        'interface F0/1', `ip address ${ip(65)} 255.255.255.224`, 'no shutdown', 'exit',
        'interface S0/1', `ip address ${ip(41)} 255.255.255.224`, 'no shutdown', 'exit',
        'interface S0/0', `ip address ${ip(97)} 255.255.255.224`, 'clock rate 64000', 'no shutdown', 'exit',
      ],
      result: 'R2 F0/1 nối PC2; S0/1 nối R1; S0/0 là DCE nối R3. Hai IP .40 và .41 cùng subnet .32/27.',
    },
    {
      title: 'Tự cấu hình các cổng trên R3',
      why: `R3 nối subnet .96/27 sang R2, LAN .128/27 của PC3 và subnet .160/27 sang R1. S0/1 của R3 là DCE trên dây R3–R1.`,
      actions: ['Nhấp đúp R3, bấm Enter nếu console yêu cầu, rồi gõ từng dòng lệnh.'],
      commands: [
        'enable', 'configure terminal', 'hostname R3',
        'interface F0/1', `ip address ${ip(129)} 255.255.255.224`, 'no shutdown', 'exit',
        'interface S0/0', `ip address ${ip(98)} 255.255.255.224`, 'no shutdown', 'exit',
        'interface S0/1', `ip address ${ip(161)} 255.255.255.224`, 'clock rate 64000', 'no shutdown', 'exit',
      ],
      result: 'R3 F0/1 nối PC3; S0/0 nối R2; S0/1 là DCE nối R1. Chỉ R3 S0/1 có clock rate.',
    },
    {
      title: 'Tự khai báo RIP để ba router học đường đi',
      why: 'Các router đã biết những mạng cắm trực tiếp vào mình. RIP trao đổi thông tin đó để R1 biết đường tới PC2/PC3 và các router còn lại biết đường phản hồi. Chỉ khai báo các mạng thật sự nối vào từng router.',
      actions: [
        'Mở lại từng router. Gõ enable rồi configure terminal, sau đó router rip để vào chế độ cấu hình RIP.',
        'Chọn đúng router theo tiêu đề từng khối. Gõ từng dòng trong khối đó; không gõ tiêu đề R1, R2, R3. Cuối mỗi router, gõ end và write memory.',
      ],
      commandGroups: [
        { label: 'Mở console R1, nhập các dòng này', lines: ['enable', 'configure terminal', 'router rip', `network ${ip(0)}`, `network ${ip(32)}`, `network ${ip(160)}`, 'end', 'write memory'] },
        { label: 'Mở console R2, nhập các dòng này', lines: ['enable', 'configure terminal', 'router rip', `network ${ip(32)}`, `network ${ip(64)}`, `network ${ip(96)}`, 'end', 'write memory'] },
        { label: 'Mở console R3, nhập các dòng này', lines: ['enable', 'configure terminal', 'router rip', `network ${ip(96)}`, `network ${ip(128)}`, `network ${ip(160)}`, 'end', 'write memory'] },
      ],
      result: 'Sau router rip, dấu nhắc đổi thành (config-router)#. Trên mỗi router, chỉ thêm các subnet được nối trực tiếp vào router đó.',
    },
    {
      title: 'Tự kiểm tra từng chặng rồi ping xuyên mạng',
      why: 'Kiểm tra từ gần đến xa giúp khoanh vùng lỗi: PC tới gateway kiểm tra LAN; ping PC khác kiểm tra cả dây serial, RIP và đường trả lời.',
      actions: [
        'Mở PC1 console và chạy ipconfig để chắc chắn IP, mask, gateway đúng. Ping gateway trước, rồi ping PC2 và PC3.',
        'Nếu PC1 ping gateway không được, kiểm tra cáp PC1–R1, R1 F0/1, địa chỉ và gateway. Nếu chỉ ping máy ở xa lỗi, mở R1/R2/R3 chạy show ip route.',
        'Trong console router, chạy show ip interface brief. Mọi cổng đang dùng phải có IP đúng và trạng thái up/up. Kiểm tra thêm show ip protocols để xem các mạng RIP.',
      ],
      commandGroups: [
        { label: 'Mở console PC1 để kiểm tra địa chỉ và ping', lines: ['ipconfig', `ping ${ip(1)}`, `ping ${ip(66)}`, `ping ${ip(130)}`] },
        { label: 'Mở console router để kiểm tra cổng, RIP và bảng đường đi', lines: ['show ip interface brief', 'show ip protocols', 'show ip route'] },
      ],
      result: `Ping tới ${ip(1)}, ${ip(66)} và ${ip(130)} đều thành công. Trên R1, route table cần có các tuyến RIP tới mạng ${ip(64)}/27, ${ip(96)}/27 và ${ip(128)}/27.`,
    },
    {
      title: 'Lưu bài và tự giải thích lại cách chia',
      why: 'Tự nói lại được lý do chọn prefix giúp bạn kiểm tra mình hiểu quy tắc, thay vì chỉ chép lệnh.',
      actions: [
        'Nhấn Ctrl+S để lưu sơ đồ đang làm thành tệp JSON.',
        'Tự giải thích bằng lời: sáu mạng cần bao nhiêu bit subnet; vì sao mượn 3 bit; /27 còn mấy bit host; subnet .64/27 gồm dải địa chỉ nào?',
      ],
      result: 'Đáp án tự đối chiếu: 3 bit tạo 8 subnet; /27 còn 5 bit host; .64/27 chạy từ .64 đến .95, host dùng được .65–.94, broadcast .95.',
    },
  ];
}
