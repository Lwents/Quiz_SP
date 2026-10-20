# Kết nối ba router và học đường đi với RIP

**Mục tiêu:** Cấu hình ba LAN, ba liên kết router và hiểu vì sao định tuyến hai chiều là cần thiết.

Sơ đồ gốc của học phần là tam giác R1–R2–R3, mỗi router có một PC. Tất cả địa chỉ nằm trong khối `192.168.1.0/24` và dùng mask `/27` (`255.255.255.224`), tạo tám mạng con bước nhảy 32.

## Vì sao mượn 3 bit để thành `/27`?

Đếm sơ đồ trước: có 3 LAN cho PC và 3 liên kết giữa router, vậy cần 6 mạng con. Một khối `/24` còn 8 bit host để chia. Mượn 2 bit chỉ tạo `2² = 4` mạng, thiếu; mượn 3 bit tạo `2³ = 8` mạng, nên prefix thành `/24 + 3 = /27`. Bài dùng 6 mạng, còn 2 mạng dự phòng.

Sau khi mượn 3 bit, còn 5 bit host: `2⁵ = 32` địa chỉ mỗi subnet, trong đó 30 địa chỉ thường gán được cho thiết bị. Mask `/27` kết thúc bằng `224`, nên mỗi mạng bắt đầu cách nhau `256 − 224 = 32` ở octet cuối. Ví dụ `.0/27` chạy từ `.0` đến `.31`, còn `.32/27` chạy từ `.32` đến `.63`.

| Kết nối | Mạng con | Cặp địa chỉ ví dụ trong hướng dẫn |
|---|---|---|
| PC1 – R1 | 192.168.1.0/27 | PC1 .2, R1 .1 |
| R1 – R2 | 192.168.1.32/27 | R1 .40, R2 .41 |
| PC2 – R2 | 192.168.1.64/27 | R2 .65, PC2 .66 |
| R2 – R3 | 192.168.1.96/27 | R2 .97, R3 .98 |
| PC3 – R3 | 192.168.1.128/27 | R3 .129, PC3 .130 |
| R3 – R1 | 192.168.1.160/27 | R3 .161, R1 .162 |

## Thực hành từ canvas trống

### 1. Thêm thiết bị

Trong RouterSim, bấm biểu tượng **Host** ba lần và **Router 2600** ba lần. Kéo R1, R2 lên phía trên và R3 xuống dưới thành hình tam giác; đặt một PC cạnh mỗi router. Nhấp phải PC → **Configs** để đặt tên PC1, PC2, PC3. Tên router sẽ đặt bằng lệnh `hostname`.

### 2. Tự nối cáp

Nhấp phải thiết bị đầu tiên, chọn cổng trên hình mặt sau; nhấp phải thiết bị bên kia rồi chọn cổng còn lại. Làm theo bảng:

| Kết nối | Cổng đầu 1 | Cổng đầu 2 | Subnet | Đầu DCE |
|---|---|---|---|---|
| PC1 – R1 | PC1 Eth0 | R1 F0/1 | 192.168.1.0/27 | — |
| R1 – R2 | R1 S0/1 | R2 S0/1 | 192.168.1.32/27 | R1 S0/1 |
| PC2 – R2 | PC2 Eth0 | R2 F0/1 | 192.168.1.64/27 | — |
| R2 – R3 | R2 S0/0 | R3 S0/0 | 192.168.1.96/27 | R2 S0/0 |
| PC3 – R3 | PC3 Eth0 | R3 F0/1 | 192.168.1.128/27 | — |
| R3 – R1 | R3 S0/1 | R1 S0/0 | 192.168.1.160/27 | R3 S0/1 |

Khi nối cáp serial, bắt đầu chọn cổng ghi là DCE. Trong hộp **Chọn đầu DCE**, chọn **This end · đầu vừa chọn**, rồi bấm **OK** trước khi chọn cổng ở router còn lại. Đầu DCE là đầu sẽ đặt `clock rate 64000`.

### 3. Nhập IP cho các PC

Với từng PC: nhấp phải → **Configs** → chọn **Use the following IP address**, nhập IP, subnet mask và default gateway, rồi bấm **OK**.

| PC | IP address | Subnet mask | Default gateway |
|---|---|---|---|
| PC1 | 192.168.1.2 | 255.255.255.224 | 192.168.1.1 |
| PC2 | 192.168.1.66 | 255.255.255.224 | 192.168.1.65 |
| PC3 | 192.168.1.130 | 255.255.255.224 | 192.168.1.129 |

Gateway là cổng F0/1 của router nối ngay với PC đó. Ví dụ PC2 thuộc mạng `192.168.1.64/27`, nên gateway của nó phải là R2 `192.168.1.65`, cũng nằm trong mạng `.64–.95`.

### 4. Cấu hình giao diện R1

Nhấp đúp R1. Nếu console hiện `Press RETURN to get started!`, bấm Enter. Gõ **từng dòng** rồi bấm Enter sau mỗi dòng:

```text
enable
configure terminal
hostname R1
interface F0/1
ip address 192.168.1.1 255.255.255.224
no shutdown
exit
interface S0/1
ip address 192.168.1.40 255.255.255.224
clock rate 64000
no shutdown
exit
interface S0/0
ip address 192.168.1.162 255.255.255.224
no shutdown
exit
```

R1 `F0/1` nối LAN PC1; `S0/1` nối R2 và là DCE; `S0/0` nối R3. Vì DCE chỉ là R1 `S0/1`, chỉ trên giao diện đó nhập `clock rate 64000`.

### 5. Cấu hình giao diện R2

Mở console R2. Gõ từng dòng và nhấn Enter:

```text
enable
configure terminal
hostname R2
interface F0/1
ip address 192.168.1.65 255.255.255.224
no shutdown
exit
interface S0/1
ip address 192.168.1.41 255.255.255.224
no shutdown
exit
interface S0/0
ip address 192.168.1.97 255.255.255.224
clock rate 64000
no shutdown
exit
```

R2 `S0/1` cùng mạng `.32/27` với R1 `S0/1`; R2 `S0/0` là đầu DCE của dây sang R3, thuộc mạng `.96/27`.

### 6. Cấu hình giao diện R3

Mở console R3. Gõ từng dòng và nhấn Enter:

```text
enable
configure terminal
hostname R3
interface F0/1
ip address 192.168.1.129 255.255.255.224
no shutdown
exit
interface S0/0
ip address 192.168.1.98 255.255.255.224
no shutdown
exit
interface S0/1
ip address 192.168.1.161 255.255.255.224
clock rate 64000
no shutdown
exit
```

R3 `S0/0` cùng mạng `.96/27` với R2; R3 `S0/1` là DCE của dây về R1, thuộc mạng `.160/27`.

### 7. Cấu hình RIP trên từng router

RIP giúp router học các subnet không cắm trực tiếp vào nó. Mở console từng router; nhập `enable`, `configure terminal`, `router rip`, rồi nhập từng mạng trực tiếp như dưới đây. Sau các lệnh `network`, gõ `end` và `write memory`.

**R1:**

```text
enable
configure terminal
router rip
network 192.168.1.0
network 192.168.1.32
network 192.168.1.160
end
write memory
```

**R2:**

```text
enable
configure terminal
router rip
network 192.168.1.32
network 192.168.1.64
network 192.168.1.96
end
write memory
```

**R3:**

```text
enable
configure terminal
router rip
network 192.168.1.96
network 192.168.1.128
network 192.168.1.160
end
write memory
```

Mỗi router chỉ khai báo các mạng nối trực tiếp vào chính nó. Chẳng hạn R1 không khai báo LAN PC2 `.64` vì mạng đó ở phía sau R2; R1 sẽ học mạng ấy qua RIP.

### 8. Kiểm tra kết quả

Mở PC1 console, nhập từng lệnh:

```text
ipconfig
ping 192.168.1.1
ping 192.168.1.66
ping 192.168.1.130
```

Ping lần lượt kiểm tra gateway R1, PC2 và PC3. Trên từng router, dùng `show ip interface brief` để xem trạng thái cổng và `show ip route` để xem các mạng RIP đã học. Nếu ping gateway thất bại, kiểm tra IP/mask PC, cáp LAN và cổng F0/1. Nếu chỉ ping khác LAN thất bại, kiểm tra clock rate ở đầu DCE và các mạng RIP.

Nhấn **Ctrl+S** để lưu sơ đồ thực hành thành tệp JSON.

> Trong trình mô phỏng web của khóa học, lệnh RIP được mô phỏng ở mức mạng con và trạng thái liên kết để học nguyên lý đường đi. Nó không thay thế đầy đủ bộ định tuyến thật hoặc RouterSim5.
