# PC, switch và router làm việc cùng nhau

**Mục tiêu:** Giải thích được đường đi của gói tin trong LAN và giữa hai mạng con, rồi chọn đúng thiết bị cho từng sơ đồ.

## PC: nơi gửi và nhận

Một PC cần ít nhất IP và subnet mask. Khi muốn gửi đến địa chỉ khác mạng, PC còn cần default gateway. Lệnh `ping` giúp kiểm tra đích có phản hồi, nhưng một lần ping thất bại chưa đủ để kết luận dây hay router hỏng: có thể IP, mask hoặc gateway sai.

## Switch: nối các máy cùng LAN

Switch chuyển frame dựa trên địa chỉ MAC. Trong bài ba PC và một switch, đặt ba PC cùng một mạng, ví dụ `192.168.1.11/24`, `.12/24`, `.13/24`; nối từng PC vào switch. Ba máy có thể ping nhau mà không cần router hoặc gateway.

## Router: nối các mạng IP

Router có giao diện riêng cho từng mạng trực tiếp kết nối. Với hai PC ở hai dải, dùng hai giao diện router: `192.168.10.1/24` và `192.168.20.1/24`. Router nhận gói ở một giao diện, xem địa chỉ đích và chuyển sang giao diện phù hợp. Nếu mạng đích không trực tiếp kết nối, router cần một tuyến tĩnh hoặc giao thức định tuyến.

| Thiết bị | Thông tin cấu hình quan trọng | Vai trò trong bài Tuần 1 |
|---|---|---|
| PC | IP, mask, gateway | Tạo và nhận lưu lượng |
| Switch | Cổng kết nối | Nối nhiều PC cùng LAN |
| Router | IP từng giao diện, tuyến đi | Chuyển gói giữa các mạng |

## Tự kiểm tra

Nếu PC1 `192.168.1.11/24` ping PC2 `192.168.1.12/24` qua switch, gateway có bắt buộc không? Nếu PC2 đổi thành `192.168.2.12/24`, cần bổ sung gì?
