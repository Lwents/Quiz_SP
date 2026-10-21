import type { TeacherPracticeStep } from './teacherWalkthrough';

// Transcribed from the command tables, including their repeated enable/configure
// lines and clock rate on both serial ends. Do not silently correct the source.
export function sourceRouterPlan(id: string) {
  if (!['week34-two-router-guide', 'week34-three-router-guide'].includes(id)) return null;
  const three = id === 'week34-three-router-guide';
  const mask = three ? '255.255.255.224' : '255.255.255.192';
  const interfaces = three
    ? [[['F0/1', 1], ['S0/1', 40], ['S0/0', 162]], [['F0/1', 65], ['S0/1', 41], ['S0/0', 97]], [['F0/1', 129], ['S0/1', 161], ['S0/0', 98]]] as const
    : [[['F0/1', 1], ['S0/0', 65]], [['F0/1', 129], ['S0/1', 66]]] as const;
  const networks = three ? [[0, 32, 160], [32, 64, 96], [96, 128, 160]] : [[0, 64], [64, 128]];
  return {
    source: three ? 'HD bài tập 3 Router.docx' : 'HD bài tập 2 Router (2).docx / (3).docx',
    configuration: interfaces.map((ports, index) => ({
      deviceId: `r${index + 1}`, name: `R${index + 1}`,
      commands: ['Ena', 'Conf t', `Hostname R${index + 1}`, ...ports.flatMap(([port, last]) => [
        `Int ${port}`, `Ip add 192.168.1.${last} ${mask}`, ...(port.startsWith('S') ? ['Clock rate 64000'] : []), 'No shut',
      ])],
    })),
    routing: networks.map((subnets, index) => ({
      deviceId: `r${index + 1}`, name: `R${index + 1}`,
      commands: [...(three ? [] : ['Ena', 'Conf t']), 'Router RIP', ...subnets.map(last => `Network 192.168.1.${last}`), 'end'],
    })),
  };
}

export function getSourceRouterSteps(id: string): TeacherPracticeStep[] | null {
  const plan = sourceRouterPlan(id);
  if (!plan) return null;
  const steps: TeacherPracticeStep[] = [{
    title: 'Thứ tự lệnh trong tài liệu của thầy',
    why: plan.source,
    actions: ['Cấu hình hết các cổng trên tất cả router trước, sau đó mới đến RIP.', 'Mở lại console sẽ giữ dấu nhắc và nội dung của router đó. Nhập từng dòng, chờ dấu nhắc rồi tiếp tục.'],
    result: 'Các bước dưới giữ lệnh của tài liệu; không thêm exit, write memory hoặc ping.',
  }];
  for (const [phase, blocks] of [['configuration', plan.configuration], ['routing', plan.routing]] as const) {
    for (const block of blocks) {
      for (const [index, command] of block.commands.entries()) {
        const repeated = phase === 'routing' && ['Ena', 'Conf t'].includes(command);
        steps.push({
          title: `${phase === 'configuration' ? 'Cấu hình cổng' : 'RIP'} · ${block.name}: ${command}`,
          why: repeated
            ? 'Dòng này được lặp trong Word. Nếu dấu nhắc vẫn là (config-if)#, app gốc báo Invalid input; tiếp tục dòng kế tiếp trong tài liệu, không cần đổi cấu hình.'
            : command.startsWith('Clock')
              ? 'Tài liệu ghi clock rate ở cả hai đầu serial. Chỉ đầu DCE nhận lệnh; DTE báo %Error: This command applies only to DCE interfaces.'
              : phase === 'routing' ? 'Chỉ làm phần này sau khi đã cấu hình xong cổng của mọi router.' : 'Nhập đúng cổng, địa chỉ và mask theo bảng lệnh của thầy.',
          actions: [index === 0 ? `Mở console ${block.name}. Bấm Enter nếu hiện Press RETURN to get started!.` : `Tiếp tục trong console ${block.name}.`, 'Gõ dòng dưới rồi Enter; không gõ dấu nhắc.'],
          commands: [command], commandInput: true,
          target: { kind: 'console', deviceId: block.deviceId, label: `Mở console ${block.name}` },
        });
      }
    }
  }
  for (const block of plan.routing) steps.push({
    title: `${block.name}: Show ip route`, why: 'Lệnh kiểm tra được nêu trong tài liệu, sau khi đã khai báo RIP trên mọi router.',
    actions: [`Mở lại console ${block.name}, nhập dòng dưới.`], commands: ['Show ip route'], commandInput: true,
    target: { kind: 'console', deviceId: block.deviceId, label: `Mở console ${block.name}` },
    result: 'C là mạng nối trực tiếp; R là mạng học qua RIP. Nếu thiếu tuyến, kiểm tra lại cổng, DCE và các dòng network.',
  });
  return steps;
}
