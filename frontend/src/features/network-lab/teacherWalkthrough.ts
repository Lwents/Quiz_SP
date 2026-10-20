import { buildTeacherExample } from './teacherLabs';
import { networkInfo } from './model';
import type { WalkthroughStep } from './threeRouterWalkthrough';

export type GuideTarget = { kind: 'devices' | 'ports' | 'host' | 'console'; deviceId?: string; label: string };
export type TeacherPracticeStep = WalkthroughStep & { target?: GuideTarget; commandInput?: boolean };

export function getTeacherWalkthrough(id: string, studentNumber = 1): TeacherPracticeStep[] {
  const example = buildTeacherExample(id, studentNumber);
  const hosts = example.devices.filter(device => device.kind === 'pc');
  const routers = example.devices.filter(device => device.kind === 'router');
  const switches = example.devices.filter(device => device.kind === 'switch');
  const prefix = networkInfo(hosts[0].ports[0].ip, hosts[0].ports[0].mask)!.prefix;
  const steps: TeacherPracticeStep[] = [{
    title: 'Bấm Insert để thêm thiết bị',
    why: `Bài này cần ${hosts.length} PC${routers.length ? `, ${routers.length} router` : ''}${switches.length ? ` và ${switches.length} switch` : ''}. Bạn sẽ tự đặt thiết bị, nối dây và nhập cấu hình theo bảng ví dụ.`,
    actions: [
      `Bấm menu Insert ở hàng trên cùng → Host. Lặp lại ${hosts.length} lần. Host 1 tương ứng PC1, Host 2 tương ứng PC2${hosts.length > 2 ? ', các Host còn lại theo số thứ tự' : ''}.`,
      ...(routers.length ? [`Bấm Insert → Router 2600, lặp lại ${routers.length} lần. Router 1 tương ứng R1, Router 2 tương ứng R2; tên sẽ đổi bằng lệnh hostname.`] : []),
      ...(switches.length ? ['Bấm Insert → Switch 2950 một lần. Switch 1 tương ứng SW1.'] : []),
      'Giữ chuột trái trên hình thiết bị và kéo để bố trí. Có thể bấm “Mở danh sách thiết bị” bên dưới rồi kéo các biểu tượng vào vùng xanh.',
    ],
    target: { kind: 'devices', label: '👉 Mở danh sách thiết bị để bạn kéo vào' },
    result: `Cần ${example.devices.length} thiết bị. Bạn tự thêm chúng; các bước sau gọi PC/router theo số thứ tự vừa tạo.`,
  }];
  steps.push({
    title: prefix < 26 ? 'Đọc bảng IP trước khi nhập' : `Vì sao mượn ${prefix - 24} bit để thành /${prefix}?`,
    why: id === 'week1-switch'
      ? 'Ba PC cùng LAN 192.168.1.0/24 nên không cần mượn bit hoặc khai báo gateway. Switch nối các máy trong cùng LAN.'
      : id === 'week1-one-router'
        ? 'Hình trong Bài 1.docx dùng hai mạng riêng sẵn: 160.10.0.0/16 và 195.10.10.0/24. PC1 dùng mask 255.255.0.0; PC2 dùng mask 255.255.255.0. Bài này không chia một /24 thành subnet nhỏ hơn, nên không mượn bit. R1 có một cổng trong mỗi mạng để chuyển dữ liệu giữa hai PC.'
        : `Bài cần ${example.cables.length} mạng riêng: ${hosts.length} LAN và ${example.cables.length - hosts.length} liên kết router. Từ /24 còn 8 bit host, cần mượn n bit sao cho 2ⁿ đủ số mạng. Mượn ${prefix - 25} bit chỉ tạo ${2 ** (prefix - 25)} mạng, thiếu; mượn ${prefix - 24} bit tạo ${2 ** (prefix - 24)} mạng, đủ. Prefix mới = 24 + ${prefix - 24} = ${prefix}. Còn ${32 - prefix} bit host, mỗi mạng có ${2 ** (32 - prefix)} địa chỉ và ${2 ** (32 - prefix) - 2} địa chỉ thường gán được.`,
    actions: hosts.map(host => `${host.name}: IP ${host.ports[0].ip}; Subnet ${host.ports[0].mask}; Default Gateway ${host.gateway || 'để trống'}.`),
    result: 'IP là địa chỉ thiết bị; mask xác định subnet; gateway là cổng router trong cùng subnet với PC. Những con số trên là bảng nhập ở các bước tiếp theo.',
  });
  for (const [index, cable] of example.cables.entries()) {
    const first = example.devices.find(device => device.id === cable.a.deviceId)!;
    const second = example.devices.find(device => device.id === cable.b.deviceId)!;
    const firstPortLabel = first.kind === 'pc' ? 'F0/0 (Eth0)' : cable.a.port;
    const secondPortLabel = second.kind === 'pc' ? 'F0/0 (Eth0)' : cable.b.port;
    const dce = cable.dce && example.devices.find(device => device.id === cable.dce!.deviceId)!;
    steps.push({
      title: `Nối dây ${index + 1}: ${first.name} ${firstPortLabel} ↔ ${second.name} ${secondPortLabel}`,
      why: cable.dce ? 'Đây là cáp serial nối hai router. Một đầu DCE cấp nhịp truyền, sau này phải nhập clock rate ở đúng đầu ấy.' : 'Dây này nối PC vào mạng bên cạnh. Chọn đúng cổng để lệnh IP ở bước sau áp dụng lên cổng thật sự có dây.',
      actions: [
        `Nhấp chuột phải ${first.name} (thiết bị thứ ${Number(first.id.replace(/\D/g, ''))} trong nhóm ${first.kind === 'pc' ? 'Host' : first.kind === 'router' ? 'Router' : 'Switch'}). Bấm cổng ${firstPortLabel} trên hình mặt sau.`,
        ...(dce ? [`Hộp Chọn đầu DCE xuất hiện sau khi chọn cổng serial đầu tiên. Chọn “${cable.dce!.deviceId === cable.a.deviceId && cable.dce!.port === cable.a.port ? 'This end' : 'Other end'}” để ${dce.name} ${cable.dce!.port} là DCE, rồi bấm OK. Sau đó chọn đầu dây bên kia.`, 'Word có clock rate ở cả hai đầu serial; trong mô phỏng chỉ nhập clock rate 64000 tại đầu DCE đã chọn.'] : []),
        `Nhấp phải ${second.name}, bấm cổng ${secondPortLabel}. Dây xuất hiện giữa hai thiết bị.`,
        'Nếu chọn sai, bấm × trên cổng đã nối để tháo dây rồi nối lại.',
      ],
      target: { kind: 'ports', deviceId: first.id, label: `👉 Mở mặt sau ${first.name} để chọn ${firstPortLabel}` },
      result: `Dây ${index + 1} phải nối đúng ${first.name} ${firstPortLabel} với ${second.name} ${secondPortLabel}. Chưa cần ping lúc này.`,
    });
  }
  for (const host of hosts) {
    steps.push({
      title: `Nhập IP vào cửa sổ Configs của ${host.name}`,
      why: host.gateway ? `${host.name} muốn gửi sang mạng khác thì cần gateway ${host.gateway}, là cổng router nối ngay với nó.` : 'Các PC cùng LAN chỉ cần IP và mask đúng; bài switch không có router để làm gateway.',
      actions: [
        `Nhấp phải Host ${Number(host.id.replace(/\D/g, ''))} → bấm Configs ở góc phải dưới hình mặt sau. Hoặc bấm nút mở Configs bên dưới.`,
        `Ô Host Name: nhập ${host.name}. Chọn “Use the following IP address”.`,
        `Ô IP Address: nhập ${host.ports[0].ip}. Ô Subnet: nhập ${host.ports[0].mask}.`,
        `Ô Default Gateway: ${host.gateway ? `nhập ${host.gateway}` : 'để trống'}. Bấm OK để lưu rồi sang bước tiếp theo.`,
      ],
      target: { kind: 'host', deviceId: host.id, label: `👉 Mở Configs ${host.name} để bạn nhập` },
      result: `Nhìn nhãn cạnh ${host.name}: phải hiện ${host.ports[0].ip}/${networkInfo(host.ports[0].ip, host.ports[0].mask)!.prefix}.`,
    });
  }
  for (const router of routers) {
    const target: GuideTarget = { kind: 'console', deviceId: router.id, label: `👉 Mở ô nhập lệnh ${router.name}` };
    const addCommand = (command: string, why: string, result: string) => steps.push({
      title: `${router.name}: gõ ${command}`,
      why,
      actions: [`Nhấp đúp Router ${Number(router.id.replace(/\D/g, ''))} để mở console, hoặc dùng nút bên dưới. Giữ console này mở khi làm các bước lệnh tiếp theo của ${router.name}.`, 'Bấm vào ô nhập nằm dưới cùng console. Gõ đúng dòng bên dưới rồi nhấn Enter.'],
      commands: [command], commandInput: true, target, result,
    });
    addCommand('ena', 'Chuyển từ chế độ xem thông thường sang chế độ quản trị. Không gõ cả dấu nhắc > hoặc # vào ô lệnh.', 'Dấu nhắc kết thúc bằng #.');
    addCommand('conf t', 'Vào chế độ cấu hình router để đặt tên, IP các cổng và RIP.', 'Dấu nhắc có (config)#. Có thể viết tắt lệnh này thành conf t.');
    addCommand(`hostname ${router.name}`, 'Đặt tên để dễ biết đang nhập lệnh trên router nào.', `Tên trong dấu nhắc đổi thành ${router.name}.`);
    for (const port of router.ports.filter(port => port.ip).sort((a, b) => ['F0/1', 'F0/0', 'S0/1', 'S0/0'].indexOf(a.name) - ['F0/1', 'F0/0', 'S0/1', 'S0/0'].indexOf(b.name))) {
      const net = networkInfo(port.ip, port.mask)!;
      addCommand(`int ${port.name}`, `Chọn cổng ${port.name}. Các lệnh IP, clock và bật cổng ở các bước sau sẽ áp dụng lên đúng cổng này.`, `Dấu nhắc có (config-if)#. Đang cấu hình ${port.name}.`);
      addCommand(`ip add ${port.ip} ${port.mask}`, `Cổng này thuộc mạng ${net.network}/${net.prefix}. ${port.ip} là IP thiết bị trong mạng ấy, không phải địa chỉ mạng ${net.network} hay broadcast ${net.broadcast}.`, `${port.name} có IP ${port.ip}, mask ${port.mask}.`);
      if (port.clockRate) addCommand(`clock rate ${port.clockRate}`, `${router.name} ${port.name} là DCE đã chọn khi nối dây; nó phải tạo nhịp cho cáp serial.`, `Clock rate của ${port.name} là ${port.clockRate}. Nếu báo không phải DCE, xem lại đầu DCE đã chọn khi nối dây.`);
      addCommand('no shut', 'Cổng router mặc định đang tắt. no shutdown bật cổng; đặt IP thôi chưa làm dây hoạt động.', `${port.name} được bật. Nếu đầu bên kia chưa cấu hình xong thì đường dây vẫn có thể chưa hoạt động.`);
      addCommand('exit', 'Rời chế độ cấu hình cổng, trở về cấu hình chung trước khi chọn cổng khác hoặc RIP.', 'Dấu nhắc trở lại (config)#.');
    }
    if (router.ripNetworks.length) {
      addCommand('router rip', 'Router cần học đường tới LAN ở sau router khác. RIP trao đổi các mạng trực tiếp giữa các router.', 'Dấu nhắc có (config-router)#.');
      for (const network of router.ripNetworks) addCommand(`network ${network}`, `Khai báo mạng ${network} nối trực tiếp vào ${router.name} để tham gia RIP trong trình mô phỏng của bài.`, `RIP có mạng ${network}; tiếp tục nhập các mạng còn lại của ${router.name}.`);
    }
    addCommand('end', 'Kết thúc cấu hình và trở về chế độ quản trị.', 'Dấu nhắc trở lại #.');
    addCommand('show ip route', 'Trong Word, thầy dùng Show ip route để kiểm tra bảng định tuyến. C là mạng nối trực tiếp; R là mạng học qua RIP.', 'Bảng định tuyến hiện các mạng router đã biết.');
    addCommand('write memory', 'Bước bổ sung để lưu cấu hình mô phỏng vừa nhập; Word không yêu cầu lệnh lưu này. Sơ đồ trên trình duyệt cũng được lưu tự động; Ctrl+S xuất tệp để giữ một bản riêng.', 'Console hiện [OK].');
  }
  for (const host of hosts) {
    const target = { kind: 'console' as const, deviceId: host.id, label: `👉 Mở console ${host.name} để nhập ping` };
    if (host.gateway) steps.push({ title: `${host.name}: kiểm tra gateway trước`, why: 'Ping router cạnh PC kiểm tra IP, mask, cáp LAN và cổng router trước khi xét đường đi xa.', actions: [`Nhấp đúp ${host.name}. Bấm ô nhập dưới console, gõ dòng này rồi Enter.`], commands: [`ping ${host.gateway}`], commandInput: true, target, result: 'Cần thấy Reply from và Received = 4. Nếu lỗi, xem lại cáp, IP PC, mask và no shutdown ở cổng LAN.' });
    const other = hosts.find(item => item.id !== host.id)!;
    steps.push({ title: `${host.name}: ping ${other.name}`, why: switches.length ? 'Các PC cùng mạng gửi trực tiếp qua switch; không cần RIP.' : routers.length === 1 ? 'R1 biết cả hai mạng vì cả hai cổng nối trực tiếp. Bài này không cần RIP.' : 'Ping tới PC khác LAN cần cáp serial hoạt động, gateway đúng và RIP học đủ đường đi cả hai chiều.', actions: [`Trong console ${host.name}, gõ dòng bên dưới rồi Enter.`], commands: [`ping ${other.ports[0].ip}`], commandInput: true, target, result: 'Cần thấy Reply from, Received = 4, Lost = 0. Nếu lỗi, kiểm tra từng chặng gần trước rồi mới kiểm tra mạng xa.' });
  }
  steps.push({ title: 'Lưu bài thực hành', why: 'Tệp sơ đồ giữ lại thiết bị, dây và cấu hình bạn vừa tự nhập.', actions: ['Bấm biểu tượng đĩa mềm trên thanh công cụ hoặc nhấn Ctrl+S để tải tệp JSON.', 'Nếu muốn làm lại, chọn Tools → Reset selected lab để bắt đầu lại với vùng vẽ trống.'], result: 'Bạn đã có một bản sơ đồ để mở lại bằng File → Open.' });
  return steps;
}
