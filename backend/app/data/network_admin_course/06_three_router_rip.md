# Kết nối ba router và học đường đi với RIP

**Mục tiêu:** Cấu hình ba LAN, ba liên kết router và hiểu vì sao định tuyến hai chiều là cần thiết.

Sơ đồ gốc của học phần là tam giác R1–R2–R3, mỗi router có một PC. Tất cả địa chỉ nằm trong khối `192.168.1.0/24` và dùng mask `/27` (`255.255.255.224`), tạo tám mạng con bước nhảy 32.

| Kết nối | Mạng con | Cặp địa chỉ ví dụ trong hướng dẫn |
|---|---|---|
| PC1 – R1 | 192.168.1.0/27 | PC1 .2, R1 .1 |
| R1 – R2 | 192.168.1.32/27 | R1 .40, R2 .41 |
| PC2 – R2 | 192.168.1.64/27 | R2 .65, PC2 .66 |
| R2 – R3 | 192.168.1.96/27 | R2 .97, R3 .98 |
| PC3 – R3 | 192.168.1.128/27 | R3 .129, PC3 .130 |
| R3 – R1 | 192.168.1.160/27 | R3 .161, R1 .162 |

## Cấu hình giao diện

Trên RouterSim, mở router, dùng `enable`, `conf t`, `int F0/1` hoặc `int S0/0`, sau đó `ip add <IP> <mask>` và `no shut`. Đường serial phía cấp đồng hồ cần `clock rate 64000` theo tài liệu. Mỗi PC đặt gateway bằng địa chỉ giao diện F0/1 của router gần nó.

## Khai báo RIP

Tại R1, khai báo ba mạng trực tiếp: `network 192.168.1.0`, `network 192.168.1.32`, `network 192.168.1.160`. R2 khai báo `.32`, `.64`, `.96`; R3 khai báo `.96`, `.128`, `.160`. Sau khi RIP trao đổi đường đi, dùng `show ip route` để xem mạng được học; thử ping PC1 đến PC2 và PC3.

> Trong trình mô phỏng web của khóa học, lệnh RIP được mô phỏng ở mức mạng con và trạng thái liên kết để học nguyên lý đường đi. Nó không thay thế đầy đủ bộ định tuyến thật hoặc RouterSim5.
