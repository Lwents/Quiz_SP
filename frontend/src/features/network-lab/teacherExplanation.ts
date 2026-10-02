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

const schoolGate = 'Hãy tưởng tượng trường có nhiều khu, mỗi khu có một cổng ra riêng. Người ở khu A muốn sang khu B phải đến cổng của khu A trước; không thể tự chọn cổng ở khu B. Gateway của PC cũng là đúng cổng router nằm trong khu mạng của PC.';

function firstThingsToKnow(): TeachingStep[] {
  return [
    {
      title: 'Trước hết, các hình trong sơ đồ là gì?',
      explanation: 'PC là máy tính. Đường kẻ là dây nối. Switch nối các máy trong cùng một nhóm. Router nối những nhóm khác nhau. Mỗi chỗ cắm dây trên router có tên như F0/1 hoặc S0/0; tên này giúp ta cấu hình đúng chỗ.',
      example: 'F0/1 là tên một cổng trên router, không phải địa chỉ IP. 192.168.1.1 mới là địa chỉ IP có thể đặt cho cổng đó.',
      analogy: 'PC là một người trong trường; cổng router là cổng ra của một khu; dây là lối đi giữa các nơi.',
    },
    {
      title: 'IP và subnet mask giúp máy biết điều gì?',
      explanation: 'IP là địa chỉ của một máy hoặc một cổng router. Subnet mask cho biết những địa chỉ nào thuộc cùng một nhóm gần nhau, gọi là mạng con. Máy so địa chỉ người nhận với mask: cùng mạng con thì tìm trực tiếp; khác mạng con thì phải nhờ router.',
      example: 'Dấu /26 hoặc /27 viết sau IP là cách viết ngắn của subnet mask. Nó không phải phép chia IP cho 26 hay 27.',
      analogy: 'IP giống số phòng. Mask giống thông tin phòng nào thuộc cùng một khu; chỉ nhìn số phòng mà không biết ranh giới khu thì dễ đi sai đường.',
    },
  ];
}

function subnet26(): TeachingStep[] {
  return [
    {
      title: 'Vì sao trong bài 2 router lại dùng /26?',
      explanation: 'Bài có ba đoạn cần tách: khu PC1, đường nối hai router, khu PC2. Một đoạn phải có một mạng con riêng. Giữ nguyên /24 thì mới là một mạng; /25 chia được hai mạng, vẫn thiếu. /26 chia được bốn mạng nên đủ ba đoạn và còn dư một mạng.',
      example: 'Một dải 192.168.1.0/24 được chia thành: 192.168.1.0/26, .64/26, .128/26 và .192/26. Bài dùng ba dải đầu.',
      analogy: 'Có ba nhóm học sinh cần ba khu có biển tên riêng. Chia sân trường thành hai khu là thiếu; chia thành bốn khu thì đủ và còn một khu trống.',
    },
    {
      title: 'Từ /26 làm sao ra các số 0, 64, 128, 192?',
      explanation: 'Mask /26 là 255.255.255.192. Lấy 256 trừ số cuối 192 được 64. Vậy cứ 64 địa chỉ thì sang một mạng mới. Trong mỗi nhóm 64 số, số đầu là tên của cả mạng; số cuối dành để gửi cho tất cả máy trong mạng (broadcast). Hai số đó không đặt cho PC.',
      example: 'Nhóm .0–.63 dùng được .1–.62. Nhóm .64–.127 dùng được .65–.126. Nhóm .128–.191 dùng được .129–.190. PC2 .150 nằm ở nhóm thứ ba.',
      analogy: 'Một dãy có số phòng 0–63: biển tên dãy là số 0, loa gọi cả dãy là số 63; người ở các phòng 1–62.',
    },
  ];
}

function subnet27(base: string, needed: number): TeachingStep[] {
  return [
    {
      title: 'Vì sao bài này dùng /27?',
      explanation: `Đếm trên sơ đồ có ${needed} đoạn cần mạng riêng. /26 chỉ tạo được bốn mạng từ một dải /24, không đủ. /27 tạo được tám mạng, nên đủ ${needed} đoạn. Đây là cách chia đều để dễ học, không phải mọi hệ thống ngoài đời đều bắt buộc dùng /27.`,
      example: `Mask /27 là 255.255.255.224. Lấy 256 − 224 = 32. Vì vậy các mạng bắt đầu ở ${base}.0, .32, .64, .96, .128, .160, .192 và .224.`,
      analogy: `Cần ${needed} khu có biển tên riêng. Chia thành bốn khu không đủ; chia thành tám khu thì xếp được hết và còn chỗ dự phòng.`,
    },
    {
      title: 'Một mạng /27 chứa các địa chỉ nào?',
      explanation: 'Mỗi mạng /27 chiếm 32 địa chỉ liên tiếp. Số đầu gọi tên mạng, số cuối dùng để gọi cả mạng; 30 số ở giữa mới đặt cho máy và cổng router. Hai đầu một dây phải nằm trong cùng một nhóm 32 số.',
      example: `${base}.64/27 gồm .64–.95. .64 là tên mạng, .65–.94 gán được, .95 là broadcast. PC ${base}.66 và cổng router ${base}.65 cùng nhóm nên nối trực tiếp được.`,
      analogy: 'Một khu có 32 số phòng; hai số ở hai đầu dành cho biển khu và loa chung, còn 30 số là phòng thật.',
    },
  ];
}

function twoRouterExplanation(otherGuide: boolean): TeacherExplanation {
  const pc1 = otherGuide ? '10' : '20';
  const gateway2 = otherGuide ? '129' : '130';
  const port2 = otherGuide ? 'F0/1' : 'F0/0';
  return {
    steps: [
      ...firstThingsToKnow(),
      ...subnet26(),
      {
        title: 'Default gateway là gì, chọn số nào?',
        explanation: 'Khi PC muốn gửi cho máy ở mạng khác, nó gửi trước cho router ngay bên cạnh. Địa chỉ cổng router bên cạnh đó gọi là default gateway. Gateway phải thuộc cùng mạng con với PC; nếu chọn cổng của router ở khu khác, PC không tới được cổng ấy.',
        example: `PC1 192.168.1.${pc1}/26 dùng gateway R1 F0/1 = 192.168.1.1. PC2 192.168.1.150/26 dùng gateway R2 ${port2} = 192.168.1.${gateway2}. PC2 không dùng 192.168.1.1 vì đó là cổng ở khu PC1.`,
        analogy: schoolGate,
      },
      {
        title: 'Hai router nối nhau để làm gì?',
        explanation: 'R1 là cổng ra của khu PC1, R2 là cổng ra của khu PC2. Đường giữa R1 và R2 cho hai khu thông nhau. Hai đầu dây phải ở cùng mạng con; mạng của dây này phải khác mạng của hai khu PC.',
        example: 'R1 S0/0 = 192.168.1.65/26, R2 S0/1 = 192.168.1.66/26. Cả hai thuộc nhóm .64–.127, còn PC1 ở nhóm .0–.63 và PC2 ở nhóm .128–.191.',
        analogy: 'Hai tòa nhà có một hành lang nối riêng; hai đầu hành lang thuộc cùng lối đi, còn phòng học ở mỗi tòa mang biển khu khác.',
      },
      {
        title: 'Vì sao phải có RIP?',
        explanation: 'R1 biết đường trong khu mình và đường sang R2, nhưng ban đầu chưa biết khu PC2 nằm sau R2. R2 cũng chưa biết khu PC1. RIP giúp hai router báo cho nhau mình biết những khu nào. Nhờ thế gói đi được tới nơi và câu trả lời cũng quay về được.',
        example: 'R1 cần biết muốn tới mạng 192.168.1.128/26 thì đi qua R2. R2 cần biết muốn về 192.168.1.0/26 thì đi qua R1. Gõ show ip route để xem các đường đã học.',
        analogy: 'Hai bảo vệ trao đổi bản đồ: người ở tòa A biết đường sang tòa B, người ở tòa B biết đường quay lại tòa A.',
      },
      {
        title: 'DCE, clock rate và no shutdown nghĩa là gì?',
        explanation: 'Dây serial giữa router cần một đầu tạo nhịp truyền tín hiệu, gọi là DCE. Trong bài này R1 S0/0 là đầu DCE nên đặt clock rate 64000 tại đó. no shutdown nghĩa là bật cổng. Cắm dây và điền IP đúng vẫn chưa đủ nếu cổng còn tắt hoặc DCE chưa cấp nhịp.',
        example: 'Ở R1: chọn cổng S0/0 → đặt clock rate 64000 → no shutdown. R2 S0/1 cũng cần no shutdown nhưng không đặt clock rate vì không phải DCE.',
        analogy: 'Hai người dùng bộ đàm: phải bật máy ở cả hai đầu; một đầu giữ nhịp để tín hiệu được truyền đều.',
      },
      ...(otherGuide ? [{
        title: 'Tại sao hai tài liệu ghi IP và cổng khác nhau?',
        explanation: 'Hai tài liệu cùng dùng cách chia ba mạng /26. Thầy chọn hai bộ số hợp lệ khác nhau; thay số gateway thì PC cũng phải đổi theo. Hãy làm đúng bản hướng dẫn đang học, đừng trộn cổng của bản này với gateway của bản kia.',
        example: 'Bản Tuần 1: PC1 .20, R2 F0/0 .130. Bản ảnh RouterSim: PC1 .10, R2 F0/1 .129. PC2 đều là .150.',
      }] : []),
    ],
    packetJourney: [`PC1 192.168.1.${pc1} muốn gửi cho PC2 .150. Mask /26 cho biết .150 ở khu khác, nên PC1 gửi tới gateway R1 .1.`, 'R1 đi theo bản đồ RIP qua dây .65 → .66 đến R2.', `R2 chuyển từ cổng ${port2} .${gateway2} tới PC2 .150. PC2 gửi lời đáp qua gateway R2; R2 chuyển lại cho R1.`],
    commonMistakes: ['Chọn gateway ở khu khác: PC không tìm được cổng ra ngay cạnh mình.', 'Gán .0, .63, .64, .127, .128 hoặc .191 cho PC: đó là tên mạng hoặc địa chỉ gọi cả mạng.', 'Đặt hai đầu cùng một dây với mask khác nhau; một đầu nghĩ “cùng khu”, đầu kia lại nghĩ “khác khu”.', 'Quên bật cổng, cấp nhịp ở đầu DCE hoặc cấu hình RIP cho đường quay về.'],
  };
}

function threeRouterExplanation(base: string, exactGuide: boolean): TeacherExplanation {
  return {
    steps: [
      ...firstThingsToKnow(),
      {
        title: 'Đếm các đoạn trên hình trước khi chia IP',
        explanation: 'Ba PC ở ba khu riêng: cần ba mạng. Ba dây giữa R1–R2, R2–R3, R3–R1: cần thêm ba mạng. Tổng cộng sáu mạng. Một mạng là một nhóm địa chỉ; hai thiết bị ở hai đầu cùng đoạn phải ở cùng nhóm đó.',
        example: `Khu PC1 dùng ${base}.0/27; dây R1–R2 dùng .32/27; khu PC2 dùng .64/27; dây R2–R3 dùng .96/27; khu PC3 dùng .128/27; dây R3–R1 dùng .160/27.`,
        analogy: 'Ba tòa học và ba hành lang nối giữa các tòa: mỗi tòa, mỗi hành lang được gắn một biển khu riêng.',
      },
      ...subnet27(base, 6),
      {
        title: 'Mỗi PC phải đi qua cổng nào để ra khỏi khu?',
        explanation: 'Đó chính là default gateway. PC không cần biết hết ba router; nó chỉ cần biết cổng router nối ngay với khu của mình. Khi gửi cho PC cùng khu thì không qua gateway; gửi sang khu khác mới cần gateway.',
        example: `PC1 ${base}.2 → gateway R1 ${base}.1. PC2 ${base}.66 → R2 ${base}.65. PC3 ${base}.130 → R3 ${base}.129.`,
        analogy: schoolGate,
      },
      {
        title: 'RIP giúp chọn đường nào trong hình tam giác?',
        explanation: 'Mỗi router biết các dây cắm trực tiếp vào nó. RIP giúp nó học tiếp những khu ở xa. Để tới PC2, R1 có thể đi thẳng sang R2 thay vì vòng qua R3. Khi PC2 trả lời, R2 cũng cần biết đường về khu PC1.',
        example: `PC1 ${base}.2 → R1 → R2 → PC2 ${base}.66. Trên R1, dùng show ip route để xem đường tới mạng PC2 ${base}.64/27.`,
        analogy: 'Ba tòa có nhiều hành lang. Bản đồ ở mỗi cổng chỉ đường tới tòa cần đến, thường ưu tiên lối có ít chặng hơn.',
      },
      {
        title: 'Dây serial chưa chạy dù IP đúng thì xem gì?',
        explanation: 'Trên mỗi dây serial, hai đầu phải cùng mạng con và cả hai cổng phải bật. Một đầu DCE cần đặt clock rate để tạo nhịp. Kiểm tra từng dây trước, rồi mới thử gửi từ PC này sang PC khác.',
        example: `Dây R1–R2 có hai đầu ${base}.40/27 và ${base}.41/27, cùng mạng .32/27. Nếu hai IP này chưa liên lạc được, hãy xem cổng có no shutdown và đầu DCE có clock rate chưa.`,
      },
      ...(!exactGuide ? [{
        title: 'Những số IP này có bắt buộc không?',
        explanation: 'Đề giao dải 195.10.10.x nhưng chưa chỉ rõ từng cổng. Bản này lấy hình tam giác của tài liệu hướng dẫn rồi thay phần đầu địa chỉ cho đúng dải được giao. Đây là ví dụ để học cách làm; nếu thầy đưa bảng IP cụ thể khác, hãy dùng bảng đó.',
        example: 'Địa chỉ 192.168.1.40 trong sơ đồ hướng dẫn được đổi thành 195.10.10.40; phần .40 giữ nguyên để dễ đối chiếu.',
      }] : []),
    ],
    packetJourney: [`PC1 ${base}.2 thấy PC2 ${base}.66 ở khu khác nên gửi cho gateway R1 ${base}.1.`, 'R1 tra đường đã học qua RIP và chuyển thẳng sang R2.', `R2 chuyển tới PC2 ${base}.66; PC2 trả lời qua gateway R2 ${base}.65, rồi R2 tìm đường về R1.`],
    commonMistakes: ['Dùng /26 chỉ có bốn mạng, trong khi hình có sáu đoạn cần mạng riêng.', 'Nhầm số .64 của tên mạng với IP có thể cấp cho PC; PC2 dùng .66, R2 dùng .65.', 'Chọn gateway PC3 là R1 hoặc R2 thay vì cổng R3 .129 ở ngay khu PC3.', 'Kiểm tra ping qua cả hình khi một dây serial còn tắt hoặc thiếu clock rate.'],
  };
}

function oneRouterExplanation(): TeacherExplanation {
  return {
    steps: [
      ...firstThingsToKnow(),
      {
        title: 'Vì sao hai PC có hai dải IP khác nhau?',
        explanation: 'Bài yêu cầu hai khu mạng. PC1 ở khu 192.168.10.x, PC2 ở khu 192.168.20.x. Hai cổng của router nối vào hai khu này nên mỗi cổng mang địa chỉ thuộc khu của nó. Các số cụ thể là ví dụ minh họa vì đề không ấn định từng IP.',
        example: 'PC1 192.168.10.10 nối với R1 192.168.10.1. PC2 192.168.20.10 nối với R1 192.168.20.1.',
        analogy: 'Hai lớp ở hai tòa nhà có hai dãy số phòng khác nhau; R1 là chỗ nối giữa hai tòa.',
      },
      {
        title: '/24 và mask 255.255.255.0 nghĩa là gì?',
        explanation: 'Hai cách viết này chỉ cùng một ranh giới mạng: ba nhóm số đầu dùng để gọi tên khu, nhóm cuối là số của từng thiết bị. Một khu /24 có 256 số; số .0 là tên khu, .255 là địa chỉ gọi cả khu, còn .1–.254 đặt được cho máy.',
        example: '192.168.10.10 và 192.168.10.1 cùng khu 192.168.10.0/24. 192.168.20.10 thuộc khu 192.168.20.0/24 khác.',
      },
      {
        title: 'Vì sao PC phải đặt default gateway?',
        explanation: 'PC1 không tự bước sang khu PC2 được. Khi gặp địa chỉ ngoài khu mình, PC1 đưa gói cho cổng R1 ngay cạnh là 192.168.10.1. PC2 cũng phải có cổng về là 192.168.20.1 để gửi lời đáp. Gateway của mỗi PC luôn là cổng router cùng khu với PC đó.',
        example: 'PC1 đặt gateway 192.168.10.1; PC2 đặt gateway 192.168.20.1. Đặt PC1 thành 192.168.20.1 là sai vì cổng đó ở khu khác.',
        analogy: schoolGate,
      },
      {
        title: 'Vì sao chưa cần RIP?',
        explanation: 'R1 cắm trực tiếp vào cả hai khu nên đã biết đường tới cả hai. RIP chỉ cần khi có nhiều router và một router phải hỏi router khác về khu mình không nối trực tiếp.',
        example: 'Trên R1, show ip route sẽ thấy cả 192.168.10.0/24 và 192.168.20.0/24 là mạng nối trực tiếp.',
      },
    ],
    packetJourney: ['PC1 gửi gói cho cổng R1 192.168.10.1.', 'R1 thấy PC2 ở khu 192.168.20.x và chuyển qua cổng 192.168.20.1.', 'PC2 trả lời qua gateway 192.168.20.1, R1 chuyển về PC1.'],
    commonMistakes: ['Chọn gateway của PC1 ở khu 192.168.20.x thay vì khu 192.168.10.x.', 'Đặt hai cổng router cùng một dải IP nên không tách được hai khu.', 'Quên bật cổng router bằng no shutdown.'],
  };
}

function switchExplanation(): TeacherExplanation {
  return {
    steps: [
      ...firstThingsToKnow(),
      {
        title: 'Vì sao ba PC được đặt cùng một dải?',
        explanation: 'Ba PC cùng cắm vào một switch và cùng ở một khu mạng. Vì thế ba máy cần ba IP khác nhau nhưng cùng phần tên khu. Bài dùng /24, tức mask 255.255.255.0; ba nhóm số đầu giống nhau là 192.168.1.',
        example: 'PC1 192.168.1.11, PC2 192.168.1.12, PC3 192.168.1.13. Cả ba thuộc mạng 192.168.1.0/24.',
        analogy: 'Ba phòng khác số nhưng nằm cùng một tòa; thư chuyển giữa các phòng vẫn ở trong tòa đó.',
      },
      {
        title: 'Switch làm gì khi PC1 gửi cho PC2?',
        explanation: 'Switch nhận dữ liệu từ cổng cắm PC1 rồi chuyển tới cổng của PC2. Nó giúp các máy cùng khu liên lạc; mỗi cổng switch không cần một dải IP riêng. Router mới là thiết bị đưa dữ liệu sang khu mạng khác.',
        example: 'PC1 .11 → switch → PC2 .12. Đường đi không qua router vì bài này không có router.',
        analogy: 'Switch giống bàn tiếp nhận thư trong cùng một tòa; không phải cổng ra khỏi trường.',
      },
      {
        title: 'Tại sao bài này không cần default gateway?',
        explanation: 'Gateway là cổng ra khi muốn tới khu mạng khác. Trong bài chỉ có một khu và các PC chỉ gửi cho nhau, nên chưa phải đi ra ngoài. Không đặt gateway vẫn ping được giữa ba PC. Nếu sau này thêm router để ra Internet, lúc đó mới đặt gateway là IP cổng router nối với khu này.',
        example: 'PC1 .11 ping PC3 .13 đi qua switch. Không có IP router nào để điền vào ô gateway trong sơ đồ này.',
        analogy: 'Gửi thư giữa hai phòng cùng tòa thì chưa cần biết cổng nào ra khỏi trường.',
      },
    ],
    packetJourney: ['PC1 xem mask và nhận ra PC2 thuộc cùng khu 192.168.1.x.', 'PC1 gửi dữ liệu tới switch; switch chuyển sang dây của PC2.', 'PC2 trả lời qua switch. Không cần gateway.'],
    commonMistakes: ['Cho ba PC cùng một IP: mỗi máy phải có số riêng.', 'Đặt các PC vào ba dải khác nhau trong khi bài không có router nối các dải.', 'Tưởng switch là gateway hoặc mỗi cổng switch cần một dải IP.'],
  };
}

function fourRouterExplanation(): TeacherExplanation {
  return {
    steps: [
      ...firstThingsToKnow(),
      {
        title: 'STT trong 200.10.STT.x là gì?',
        explanation: 'STT là số thứ tự của bạn. Thay STT vào tất cả địa chỉ trong bài, không chỉ một máy. Sau đó mới chia dải thành các mạng nhỏ. Hình bốn router nối thành chuỗi là một cách làm minh họa vì yêu cầu chỉ cho dải IP, chưa ấn định sơ đồ từng cổng.',
        example: 'Nếu STT = 23, dải ban đầu là 200.10.23.0/24. IP PC1 là 200.10.23.2, cổng router cạnh PC1 là 200.10.23.1.',
      },
      {
        title: 'Đếm xem phải chia thành bao nhiêu mạng',
        explanation: 'Có bốn khu PC riêng. Giữa bốn router có ba dây nối. Mỗi khu PC và mỗi dây cần một mạng riêng: 4 + 3 = 7 mạng. Ta đếm đoạn trước rồi mới chọn mask; nếu chia quá ít mạng sẽ không đủ chỗ cho sơ đồ.',
        example: 'Khu PC1, PC2, PC3, PC4 là 4 mạng. Dây R1–R2, R2–R3, R3–R4 là 3 mạng nữa.',
        analogy: 'Bốn tòa nhà và ba hành lang nối giữa chúng: tổng cộng bảy nơi cần biển địa chỉ riêng.',
      },
      ...subnet27('200.10.{STT}', 7),
      {
        title: 'Default gateway của từng PC nằm ở đâu?',
        explanation: 'Mỗi PC chỉ cần biết cổng router sát với mình. PC1 gửi cho R1, PC2 cho R2, PC3 cho R3, PC4 cho R4. Những cổng này thuộc cùng mạng con với PC tương ứng. PC không chọn ngẫu nhiên một cổng trong bốn router.',
        example: 'PC1 .2 → R1 .1; PC2 .66 → R2 .65; PC3 .130 → R3 .129; PC4 .194 → R4 .193. Các địa chỉ đều bắt đầu bằng 200.10.{STT}.',
        analogy: schoolGate,
      },
      {
        title: 'Tại sao cần RIP và dây serial phải bật?',
        explanation: 'R1 không nối trực tiếp với khu PC4 nên cần bản đồ để biết đi qua R2, rồi R3, rồi R4. RIP giúp các router chia sẻ bản đồ đó. Trên mỗi dây serial, hai cổng phải bật; một đầu DCE phải cấp nhịp bằng clock rate. Thiếu một chặng là PC1 chưa tới được PC4.',
        example: 'Thử theo thứ tự: PC1→R1, R1→R2, R2→R3, R3→R4, R4→PC4. Bước nào hỏng thì xem IP, mask, no shutdown, clock rate và RIP ở đúng chặng đó.',
        analogy: 'Bốn cổng bảo vệ nối nhau bằng ba lối đi; mỗi bảo vệ cần bản đồ các khu xa và mỗi lối đi phải mở.',
      },
    ],
    packetJourney: ['PC1 .2 gửi cho gateway R1 .1 vì PC4 .194 ở khu khác.', 'R1 theo đường RIP qua R2, R3 rồi R4.', 'R4 chuyển tới PC4 .194. PC4 dùng gateway R4 .193 để trả lời theo chiều ngược lại.'],
    commonMistakes: ['Đổi STT ở PC nhưng quên đổi gateway hoặc IP router.', 'Dùng /26 chỉ tạo bốn mạng, không đủ bảy đoạn.', 'Điền số .32, .64, .96 làm IP máy: đó là tên các mạng.', 'Thử ping qua cả bốn router khi một dây serial còn tắt hoặc thiếu nhịp DCE.'],
  };
}

export function getTeacherExplanation(id: string): TeacherExplanation {
  if (id === 'week1-one-router') return oneRouterExplanation();
  if (id === 'week1-switch') return switchExplanation();
  if (id === 'week1-two-router-diagram') return twoRouterExplanation(false);
  if (id === 'week34-two-router-guide') return twoRouterExplanation(true);
  if (id === 'week34-three-router-guide') return threeRouterExplanation('192.168.1', true);
  if (id === 'week34-three-router-195') return threeRouterExplanation('195.10.10', false);
  if (id === 'week34-four-router-stt') return fourRouterExplanation();
  throw new Error(`Unknown teacher lab: ${id}`);
}
