# Thực hành ba sơ đồ mạng Tuần 1

**Mục tiêu:** Tự bố trí thiết bị, nối dây, gán địa chỉ và kiểm tra ping cho các sơ đồ được nêu ở Tuần 1 của COMP303.

Mở **Phòng thực hành mạng** bằng nút ở đầu trang khóa học. Các bài dưới đây là cách triển khai mẫu để luyện kỹ năng; địa chỉ IP là ví dụ có thể thay đổi nếu vẫn tuân thủ quy tắc mạng con.

## Bài 1: Một router, hai PC, hai dải IP

Sơ đồ: `PC1 — Router — PC2`. Đặt PC1 `192.168.10.10/24`, gateway `192.168.10.1`; giao diện router bên PC1 `192.168.10.1/24`. Đặt PC2 `192.168.20.10/24`, gateway `192.168.20.1`; giao diện router bên PC2 `192.168.20.1/24`. Nối đúng các giao diện rồi ping từ PC1 đến PC2.

## Bài 2: Ba PC và một switch

Sơ đồ: ba PC đều nối vào switch. Đặt địa chỉ `192.168.1.11/24`, `192.168.1.12/24`, `192.168.1.13/24`. Kiểm tra ping từng cặp. Sau đó cố ý đổi PC3 sang `192.168.2.13/24` và giải thích vì sao không còn liên lạc trong mô hình này.

## Bài 3: Hai router và các PC

Sơ đồ: `PC1 — Router1 — Router2 — PC2`. Theo tài liệu hướng dẫn của học phần, dùng **một khối `192.168.1.0/24` chia thành các mạng con `/26`**: LAN trái `192.168.1.0/26`, liên kết hai router `192.168.1.64/26`, LAN phải `192.168.1.128/26`. PC1 `192.168.1.10/26` có gateway `192.168.1.1`; Router1 có `F0/1 = 192.168.1.1/26` và `S0/0 = 192.168.1.65/26`; Router2 có `S0/1 = 192.168.1.66/26` và `F0/0 = 192.168.1.130/26`; PC2 `192.168.1.150/26` có gateway `192.168.1.130`. Bật các cổng router bằng `no shut`, rồi khai báo các mạng trên RIP ở cả hai router để thông tin đường đi được trao đổi.

> “Dùng 1 dải IP” ở đây nghĩa là lấy các mạng con từ cùng một khối `/24`, không có nghĩa mọi giao diện đều đặt trong cùng một mạng con. Hướng dẫn gốc dùng subnet mask `255.255.255.192` cho các giao diện.

## Bàn giao bài thực hành

Với mỗi sơ đồ, ghi lại bảng địa chỉ IP, ảnh hoặc bản lưu sơ đồ, kết quả ping thành công và một lỗi bạn đã tự tạo rồi sửa.
