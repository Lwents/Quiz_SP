export interface TeachingStep {
  title: string;
  explanation: string;
  example: string;
  analogy?: string;
}

export interface TeacherExplanation {
  steps: TeachingStep[];
  packetJourney: string[];
  commonMistakes: string[];
}

const schoolGateway = 'Hãy hình dung mỗi LAN là một khu trong trường. Gửi thư cho người cùng khu thì đưa trực tiếp; gửi sang khu khác phải tới đúng cổng ra của khu mình. Default gateway là địa chỉ cổng router nối ngay với LAN của PC, không phải một cổng bất kỳ trên sơ đồ.';

function subnet26(): TeachingStep[] {
  return [
    {
      title: 'Vì sao bài này chọn /26?',
      explanation: 'Tài liệu dùng một khối 192.168.1.0/24 cho 3 liên kết lớp 3: LAN PC1–R1, dây R1–R2 và LAN R2–PC2. Nếu giữ nguyên /24 thì các liên kết trông như cùng một mạng; router không có ba mạng riêng để chuyển tiếp. Mượn 2 bit từ phần host của /24 tạo 2² = 4 mạng con, tức /26. /25 chỉ tạo 2 mạng, không đủ 3. Đây là lựa chọn chia đều để học; ngoài thực tế dây chỉ nối 2 router thường dùng subnet nhỏ hơn để tiết kiệm IP.',
      example: 'Mask /26 = 255.255.255.192. Bước nhảy ở octet cuối là 256 − 192 = 64, nên bốn mạng bắt đầu tại .0, .64, .128 và .192.',
      analogy: 'Giống chia một khu có 256 số phòng thành 4 dãy, mỗi dãy 64 số. Hai đầu dây phải ở cùng dãy; LAN bên trái và LAN bên phải phải ở hai dãy khác nhau.',
    },
    {
      title: 'Địa chỉ mạng, host và broadcast khác nhau thế nào?',
      explanation: 'Mỗi subnet /26 có 64 địa chỉ, nhưng địa chỉ đầu gọi tên cả mạng và địa chỉ cuối dùng để phát tới toàn mạng. Chỉ 62 địa chỉ ở giữa gán cho PC hoặc cổng router được.',
      example: '192.168.1.0/26: host .1–.62, broadcast .63. 192.168.1.64/26: host .65–.126, broadcast .127. 192.168.1.128/26: host .129–.190, broadcast .191. Mạng .192/26 còn dự phòng.',
    },
  ];
}

function subnet27(base: string, links: number): TeachingStep[] {
  return [
    {
      title: 'Vì sao cần /27?',
      explanation: `Sơ đồ có ${links} liên kết lớp 3 cần ${links} mạng riêng. Chia /24 thành /26 chỉ được 4 mạng, không đủ. Mượn 3 bit tạo 2³ = 8 mạng con, tức /27; bài dùng ${links} mạng, phần còn lại dự phòng. Đây là cách chia đều theo bài học; khi thiết kế mạng thật có thể dùng VLSM để cấp subnet nhỏ hơn cho dây router–router.`,
      example: `Mask /27 = 255.255.255.224. Bước nhảy = 256 − 224 = 32. Các mạng ${base}.0, .32, .64, .96, .128, .160, .192, .224; mỗi mạng có 32 địa chỉ, dùng được 30 host.`,
      analogy: 'Giống một tòa nhà 256 phòng được chia thành 8 tầng, mỗi tầng 32 phòng. Mỗi LAN hoặc đường nối router chiếm một tầng riêng; hai thiết bị nối trực tiếp phải ở cùng tầng.',
    },
    {
      title: 'Kiểm tra một IP có thuộc subnet không',
      explanation: 'Nhìn octet cuối và khoảng cách 32. Một địa chỉ thuộc mạng bắt đầu ở bội số 32 gần nhất không vượt quá nó. Địa chỉ đầu là network, địa chỉ cuối trước mạng kế tiếp là broadcast; không gán hai địa chỉ này cho thiết bị.',
      example: `${base}.66 thuộc ${base}.64/27 vì 64 ≤ 66 ≤ 95. Network là .64, host dùng được .65–.94, broadcast là .95. Vì vậy PC .66 và gateway router .65 nằm cùng LAN.`,
    },
  ];
}

function twoRouterExplanation(guideVariant: boolean): TeacherExplanation {
  const pc1 = guideVariant ? '.10' : '.20';
  const r2Gateway = guideVariant ? '.129' : '.130';
  const r2Port = guideVariant ? 'F0/1' : 'F0/0';
  return {
    steps: [
      ...subnet26(),
      {
        title: 'Tại sao PC cần default gateway?',
        explanation: `PC1 ${pc1}/26 chỉ thấy các địa chỉ từ .1 đến .62 là người cùng LAN. Khi gửi tới PC2 .150 ở mạng .128/26, PC1 không gửi thẳng qua dây tới PC2 được mà giao gói cho R1 F0/1 .1. Tương tự, PC2 đặt gateway R2 ${r2Port} ${r2Gateway}; gateway phải là IP cổng router nối vào LAN của chính PC2 và cùng subnet /26.`,
        example: `PC1 192.168.1${pc1}/26 → gateway 192.168.1.1. PC2 192.168.1.150/26 → gateway 192.168.1${r2Gateway}. Đặt gateway PC2 thành .1 sẽ sai vì .1 ở LAN khác.`,
        analogy: schoolGateway,
      },
      {
        title: 'Vì sao dây R1–R2 cần mạng .64/26 riêng?',
        explanation: 'Mỗi đầu serial là một cổng lớp 3 và cần một IP. R1 .65 và R2 .66 cùng thuộc mạng .64/26 nên trao đổi trực tiếp. Mạng này không được trùng với LAN .0/26 hay .128/26, nếu không router sẽ không phân biệt được hướng chuyển gói.',
        example: 'R1 S0/0 192.168.1.65/26 ↔ R2 S0/1 192.168.1.66/26. Cả hai đều nằm trong khoảng host .65–.126.',
        analogy: 'Đường nối giữa hai tòa nhà có một dãy địa chỉ riêng cho hai đầu cầu, tách khỏi các phòng ở mỗi tòa.',
      },
      {
        title: 'DCE, clock rate và no shutdown để làm gì?',
        explanation: 'Dây serial cần nhịp đồng hồ để hai đầu biết khi nào gửi bit. Trong mô phỏng, đầu DCE là R1 S0/0 và đặt clock rate 64000 ở đó; đầu DTE R2 S0/1 không đặt clock. Cổng router còn phải bật bằng no shutdown. Có IP đúng nhưng cổng tắt hoặc đầu DCE thiếu clock thì dây vẫn không hoạt động.',
        example: 'Ở console R1: conf t → int S0/0 → clock rate 64000 → no shutdown. Kiểm tra bằng show ip interface brief.',
        analogy: 'Hai người nói chuyện qua bộ đàm cần cùng nhịp phát tín hiệu; DCE cấp nhịp, còn no shutdown giống bật công tắc bộ đàm.',
      },
      {
        title: 'Vì sao phải bật RIP trên cả hai router?',
        explanation: 'R1 biết trực tiếp mạng .0 và .64 nhưng không tự biết mạng PC2 .128. R2 biết .64 và .128 nhưng không tự biết mạng PC1 .0. RIP trao đổi thông tin mạng giữa hai router, tạo đường đi và đường trả lời. Nếu thiếu đường về, PC2 nhận được gói nhưng phản hồi không quay lại PC1.',
        example: 'R1 quảng bá .0 và .64; R2 quảng bá .64 và .128. Dùng show ip route: R1 phải học .128/26 và R2 phải học .0/26.',
        analogy: 'Hai bảo vệ ở hai khu trao đổi bản đồ: người ở cổng R1 biết khu PC2 đi qua R2, người ở R2 cũng biết đường quay lại khu PC1.',
      },
      ...(guideVariant ? [{
        title: 'Vì sao có hai bản 2 router?',
        explanation: 'Hai tài liệu của thầy dùng cùng ba mạng /26 nhưng chọn IP PC1 và cổng LAN của R2 khác nhau. Các địa chỉ đó đều hợp lệ. Khi thực hành, hãy bám đúng bản tài liệu đang được giao và sửa gateway PC2 theo cổng R2 tương ứng.',
        example: 'Bản Tuần 1: PC1 .20, R2 F0/0 .130. Bản ảnh RouterSim: PC1 .10, R2 F0/1 .129. PC2 .150 ở cả hai bản.',
      }] : []),
    ],
    packetJourney: [`PC1 ${pc1} thấy PC2 .150 ở ngoài mạng .0/26 nên gửi tới gateway R1 .1.`, 'R1 nhìn bảng định tuyến, chuyển qua serial .65 → .66 tới R2.', `R2 thấy LAN .128/26 kết nối trực tiếp qua ${r2Port} ${r2Gateway} và chuyển tới PC2 .150.`, 'PC2 trả lời qua gateway R2; RIP giúp R2 tìm đường về LAN PC1 qua R1.'],
    commonMistakes: ['Gán .63, .127 hoặc .191 cho thiết bị: đó là broadcast, không phải địa chỉ host.', 'Đặt gateway của PC ở một LAN khác hoặc gõ sai IP cổng router nối PC.', 'Dùng /24 cho một cổng và /26 cho cổng đối diện: hai đầu hiểu ranh giới mạng khác nhau.', 'Quên no shutdown, clock rate ở DCE hoặc khai báo RIP/đường về.'],
  };
}

function threeRouterExplanation(base: string, exactGuide: boolean): TeacherExplanation {
  return {
    steps: [
      ...subnet27(base, 6),
      {
        title: 'Vì sao có 6 mạng trong hình tam giác?',
        explanation: 'Mỗi router có một LAN riêng cho PC: tổng 3 LAN. R1–R2, R2–R3 và R3–R1 là 3 đường serial; mỗi đường cũng là một mạng riêng. 3 + 3 = 6. Mỗi cổng router nối một đường phải mang IP thuộc đúng mạng của đường đó.',
        example: `${base}.0/27 cho PC1–R1; .32/27 cho R1–R2; .64/27 cho R2–PC2; .96/27 cho R2–R3; .128/27 cho R3–PC3; .160/27 cho R3–R1.`,
        analogy: 'Ba khu học có cổng ra riêng, giữa ba khu có ba lối đi. Mỗi khu và mỗi lối đi được đánh số thành một dãy địa chỉ riêng.',
      },
      {
        title: 'Default gateway của ba PC là cổng nào?',
        explanation: 'Mỗi PC chỉ ghi một gateway mặc định: cổng Ethernet của router nằm cùng LAN với nó. Gateway không phải cổng serial và cũng không phải router bất kỳ trong tam giác. Với đích cùng LAN, PC liên lạc trực tiếp; với đích ngoài LAN, PC gửi cho gateway.',
        example: `PC1 ${base}.2 → R1 ${base}.1; PC2 ${base}.66 → R2 ${base}.65; PC3 ${base}.130 → R3 ${base}.129. Tất cả dùng mask /27.`,
        analogy: schoolGateway,
      },
      {
        title: 'RIP chọn đường trong tam giác như thế nào?',
        explanation: 'Mỗi router chỉ biết chắc các mạng cắm trực tiếp vào mình. RIP giúp nó biết LAN của hai router còn lại. Với nhiều đường hợp lệ, RIP ưu tiên tuyến có ít bước qua router hơn; đường R1→R2 tới PC2 ngắn hơn đường R1→R3→R2. Cả chiều đi và chiều về đều cần tuyến.',
        example: `PC1 ${base}.2 → R1 → R2 → PC2 ${base}.66. Dùng show ip route ở R1 để tìm tuyến RIP tới ${base}.64/27.`,
        analogy: 'Ba khu có nhiều lối đi; bảng định tuyến giống biển chỉ đường, chỉ lối có ít chặng hơn tới đúng khu.',
      },
      {
        title: 'Vì sao cáp serial cần DCE và clock rate?',
        explanation: 'Mỗi đường serial cần một đầu cấp nhịp DCE. Chỉ cổng DCE đặt clock rate; hai đầu đều cần IP cùng subnet và no shutdown. Nếu một đường hỏng, RIP có thể tìm lối khác trong tam giác, nhưng chỉ khi các đường và RIP còn lại được cấu hình đúng.',
        example: `Đường R1–R2 dùng ${base}.40/27 và ${base}.41/27 trong mạng .32/27. Ping hai IP này trước khi thử ping qua nhiều router.`,
      },
      ...(!exactGuide ? [{
        title: 'Đây có phải IP bắt buộc của thầy không?',
        explanation: 'Yêu cầu bài tập cho khối 195.10.10.x; sơ đồ này tái sử dụng cách nối tam giác và cách chia /27 của bài hướng dẫn. Đây là một cách làm minh họa. Nếu thầy giao bảng IP/cổng khác, ưu tiên bảng đó và vẫn giữ quy tắc mỗi liên kết một subnet.',
        example: 'Thay 192.168.1.x trong sơ đồ hướng dẫn thành 195.10.10.x nhưng giữ các phần cuối .1, .2, .40, .41… để dễ đối chiếu.',
      }] : []),
    ],
    packetJourney: [`PC1 ${base}.2 nhận thấy PC2 ${base}.66 ở ngoài subnet .0/27 nên gửi gói tới R1 ${base}.1.`, `R1 xem tuyến tới ${base}.64/27 và chuyển qua đường serial .32/27 đến R2.`, `R2 đưa gói ra LAN .64/27 tới PC2; PC2 trả lời về gateway ${base}.65 và R2 dùng RIP để quay lại PC1.`],
    commonMistakes: ['Dùng /26 sẽ chỉ tạo 4 subnet, không đủ 6 liên kết của sơ đồ này.', 'Nhầm .32, .64, .96… là địa chỉ host: đó là địa chỉ mạng của từng subnet.', 'Đặt gateway PC3 thành IP của R1 hoặc R2 thay vì cổng R3 .129 cùng LAN.', 'Thiếu RIP/clock rate/no shutdown làm gói đi một chiều hoặc không qua được serial.'],
  };
}

export function getTeacherExplanation(id: string): TeacherExplanation {
  if (id === 'week1-two-router-diagram') return twoRouterExplanation(false);
  if (id === 'week34-two-router-guide') return twoRouterExplanation(true);
  if (id === 'week34-three-router-guide') return threeRouterExplanation('192.168.1', true);
  if (id === 'week34-three-router-195') return threeRouterExplanation('195.10.10', false);
  if (id === 'week1-one-router') return {
    steps: [
      {
        title: 'Vì sao hai PC dùng hai dải /24 khác nhau?',
        explanation: 'Bài yêu cầu 2 dải IP: PC1 ở 192.168.10.0/24 và PC2 ở 192.168.20.0/24. /24 nghĩa là 24 bit đầu xác định mạng, mask 255.255.255.0; mỗi dải có 256 địa chỉ, 254 địa chỉ host dùng được. Hai mạng phải khác nhau để router có nhiệm vụ chuyển gói giữa chúng. Đây là cách gán minh họa vì yêu cầu không cho IP cụ thể.',
        example: 'PC1 192.168.10.10/24 cùng mạng với R1 F0/0 192.168.10.1. PC2 192.168.20.10/24 cùng mạng với R1 F0/1 192.168.20.1. Địa chỉ .0 là network, .255 là broadcast.',
        analogy: 'Hai lớp học ở hai tòa khác nhau có hai dãy số phòng; mỗi tòa có một cổng riêng đi tới phòng bảo vệ chung.',
      },
      {
        title: 'Default gateway là cổng nào?',
        explanation: 'PC1 phải dùng R1 F0/0 .10.1 làm gateway; PC2 phải dùng R1 F0/1 .20.1. Mỗi gateway ở cùng subnet với PC của nó. PC nhìn mask để quyết định đích cùng LAN hay khác LAN; khác LAN thì gửi cho gateway.',
        example: 'PC1 → 192.168.20.10: đích không thuộc 192.168.10.0/24, nên PC1 gửi cho 192.168.10.1. Đặt gateway PC1 là 192.168.20.1 sẽ không tìm được cổng đó trên LAN của PC1.',
        analogy: schoolGateway,
      },
      {
        title: 'Vì sao bài này chưa cần RIP?',
        explanation: 'R1 nối trực tiếp cả hai LAN nên bảng định tuyến của nó tự có cả hai mạng. RIP chỉ cần khi nhiều router phải trao đổi đường tới những mạng không cắm trực tiếp vào mình.',
        example: 'show ip route trên R1 sẽ có mạng 192.168.10.0/24 và 192.168.20.0/24 ở dạng connected (C).',
      },
    ],
    packetJourney: ['PC1 thấy PC2 ở mạng khác, gửi tới gateway R1 F0/0 .10.1.', 'R1 nhìn thấy mạng 192.168.20.0/24 gắn trực tiếp ở F0/1 và gửi tới PC2 .20.10.', 'PC2 dùng gateway .20.1 để gửi phản hồi về mạng PC1.'],
    commonMistakes: ['Đặt hai cổng router cùng một subnet nên không tách được hai LAN.', 'Nhập gateway của LAN bên kia thay vì cổng router cùng LAN.', 'Quên bật cổng router bằng no shutdown.'],
  };
  if (id === 'week1-switch') return {
    steps: [
      {
        title: 'Vì sao cả ba PC dùng cùng /24?',
        explanation: 'Switch nối các PC trong cùng một LAN lớp 2. Ba IP 192.168.1.11, .12 và .13 đều thuộc 192.168.1.0/24 vì cùng 24 bit mạng. Mask 255.255.255.0 cho biết phần cuối là số host; /24 có 254 IP host dùng được. Bài không yêu cầu chia nhiều subnet nên dùng một LAN là đủ.',
        example: 'PC1 .11 muốn gửi cho PC2 .12: cả hai cùng 192.168.1.0/24 nên PC1 tìm địa chỉ MAC của PC2 rồi gửi frame qua switch.',
        analogy: 'Ba phòng trong cùng một tòa: chuyển thư nội bộ qua bàn tiếp nhận của tòa, chưa cần ra cổng trường.',
      },
      {
        title: 'Vì sao chưa cần default gateway?',
        explanation: 'Gateway chỉ dùng khi PC cần đi ra mạng khác. Bài này chỉ có một LAN và không có router, nên ping giữa ba PC không cần gateway. Nếu sau này nối thêm router để ra Internet hoặc LAN khác, lúc đó mỗi PC mới đặt gateway bằng IP cổng router cùng LAN.',
        example: 'PC1 .11 → PC3 .13 đi qua switch. Nếu đặt một gateway không tồn tại, ping nội bộ vẫn có thể chạy nhưng đi mạng ngoài sẽ thất bại.',
        analogy: 'Gửi thư giữa các phòng cùng tòa thì không cần biết cổng chính của trường; chỉ khi gửi ra ngoài mới cần cổng ra.',
      },
      {
        title: 'Switch khác router ở điểm nào?',
        explanation: 'Switch chuyển frame dựa trên địa chỉ MAC trong LAN; nó không tự nối các subnet IP khác nhau. Router có cổng ở nhiều subnet và quyết định gói đi sang subnet nào. Vì vậy không chia một subnet mới cho từng cổng switch.',
        example: 'P1, P2, P3 là các cổng switch nối PC1–PC3; ba cổng vẫn ở cùng miền LAN trong bài này.',
      },
    ],
    packetJourney: ['PC1 nhìn mask /24 và biết PC2 .12 cùng LAN.', 'PC1 tìm MAC của PC2; switch chuyển frame từ cổng PC1 sang cổng PC2.', 'PC2 trả lời qua cùng switch, không đi qua router.'],
    commonMistakes: ['Đặt các PC vào những subnet khác nhau dù bài không có router.', 'Gán IP trùng nhau cho hai PC.', 'Nhầm switch là gateway hoặc nghĩ mỗi cổng switch cần một dải IP riêng.'],
  };
  if (id === 'week34-four-router-stt') return {
    steps: [
      ...subnet27('200.10.{STT}', 7),
      {
        title: 'STT trong 200.10.STT.x nghĩa là gì?',
        explanation: 'STT là số thứ tự của sinh viên, thay vào octet thứ ba trước khi mở bài. STT phải từ 1 đến 254 trong giao diện này. Sau khi thay, tất cả PC, cổng router, gateway và mạng RIP phải dùng cùng octet thứ ba; không thể chỉ đổi IP một PC.',
        example: 'Nếu STT = 23 thì khối bài tập là 200.10.23.0/24. PC1 = 200.10.23.2/27, gateway = 200.10.23.1; mạng R1–R2 là 200.10.23.32/27.',
      },
      {
        title: 'Vì sao sơ đồ chuỗi cần 7 mạng?',
        explanation: 'Bốn PC đặt ở bốn LAN khác nhau: 4 mạng. Ba dây serial R1–R2, R2–R3, R3–R4: thêm 3 mạng. Tổng 7 mạng. /27 tạo 8 mạng, đủ dùng một mạng còn lại dự phòng. Sơ đồ chuỗi là phương án minh họa vì yêu cầu thầy chỉ nêu dải IP và số router.',
        example: 'LAN: .0, .64, .128, .192/27. Serial: .32, .96, .160/27. Mạng .224/27 chưa dùng.',
        analogy: 'Bốn khu học nối bằng ba hành lang. Mỗi khu và hành lang có dãy địa chỉ riêng để người chỉ đường biết rẽ theo hướng nào.',
      },
      {
        title: 'Gateway của từng PC và RIP của router',
        explanation: 'Mỗi PC gửi gói ra ngoài LAN qua cổng Ethernet router ngay cạnh mình. Router chỉ biết các mạng nối trực tiếp; RIP giúp bốn router học các LAN ở xa. Cần kiểm tra cả đường đi lẫn đường về, nhất là PC1↔PC4 đi qua tất cả router.',
        example: 'PC1 .2 → R1 .1; PC2 .66 → R2 .65; PC3 .130 → R3 .129; PC4 .194 → R4 .193 (đều có tiền tố 200.10.{STT}).',
        analogy: schoolGateway,
      },
      {
        title: 'Serial, DCE và trạng thái cổng',
        explanation: 'Hai đầu mỗi dây serial phải cùng subnet /27; đầu DCE cấp clock rate, cả hai đầu phải no shutdown. Sau đó mới kiểm tra RIP. Nếu PC1 ping PC4 lỗi, hãy đi từng chặng: PC1→R1, R1→R2, R2→R3, R3→R4, R4→PC4.',
        example: 'R1–R2: 200.10.{STT}.33/27 ↔ .34/27, thuộc mạng .32/27. Dùng show ip interface brief để xem cổng up/down.',
      },
    ],
    packetJourney: ['PC1 .2 thấy PC4 .194 ở ngoài LAN .0/27 nên gửi tới R1 .1.', 'R1→R2 qua .32/27; R2→R3 qua .96/27; R3→R4 qua .160/27.', 'R4 chuyển ra LAN .192/27 tới PC4 .194. Phản hồi theo gateway R4 .193 và các tuyến RIP quay về PC1.'],
    commonMistakes: ['Nhập STT ở PC nhưng quên đổi gateway hoặc mạng RIP ở router.', 'Dùng /26 chỉ có 4 subnet nên không đủ 7 liên kết.', 'Nhầm .32, .64, .96… là IP host thay vì địa chỉ mạng.', 'Thiếu tuyến RIP hoặc quên clock rate ở một trong ba dây serial.'],
  };
  throw new Error(`Unknown teacher lab: ${id}`);
}
