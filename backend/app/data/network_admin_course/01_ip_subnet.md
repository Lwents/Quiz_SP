# Ôn địa chỉ IPv4 và chia mạng con

**Mục tiêu:** Tự xác định mạng, dải địa chỉ host và địa chỉ gateway trước khi nối thiết bị trong bài thực hành.

## 1. Một địa chỉ IP luôn đi cùng subnet mask

Địa chỉ `192.168.10.25/24` gồm phần mạng 24 bit và phần host 8 bit. Subnet mask tương ứng là `255.255.255.0`. Thiết bị dùng phần mạng để quyết định đích có ở cùng mạng hay cần gửi qua router.

IPv4 dài 32 bit, thường viết thành bốn số thập phân từ 0 đến 255. Phần mạng (`network ID`) cho biết địa chỉ thuộc mạng nào; phần host (`host ID`) nhận diện giao diện trong mạng đó. Dấu `/24` nói rằng **24 bit đầu là phần mạng**. Số bit phần mạng do mask quyết định, không thể chỉ đoán từ ba số đầu của địa chỉ.

Trong mạng `192.168.10.0/24`, địa chỉ mạng là `192.168.10.0`, địa chỉ broadcast là `192.168.10.255`, các host thông thường dùng `192.168.10.1` đến `192.168.10.254`. Hai host cùng mạng phải có địa chỉ khác nhau; đặt trùng IP sẽ gây xung đột.

## 2. Kiểm tra hai máy có cùng mạng không

Lấy từng địa chỉ IP AND với subnet mask. Nếu kết quả giống nhau thì hai giao diện thuộc cùng mạng con. Ví dụ `192.168.10.25/24` và `192.168.10.80/24` cùng mạng; `192.168.11.10/24` nằm ở mạng khác.

> Mẹo thực hành: ghi rõ IP, mask và gateway trên sơ đồ trước khi đi dây. Gateway của PC phải là địa chỉ giao diện router nằm **cùng mạng con** với PC đó.

## 3. Chia một dải thành hai mạng

Nếu cần hai LAN riêng, có thể dùng `192.168.10.0/24` và `192.168.20.0/24`. Giao diện router hướng LAN thứ nhất là `192.168.10.1/24`; giao diện hướng LAN thứ hai là `192.168.20.1/24`. PC ở LAN thứ nhất đặt gateway `192.168.10.1`, PC ở LAN thứ hai đặt gateway `192.168.20.1`.

## 4. Địa chỉ riêng, địa chỉ công cộng và lớp địa chỉ trong slide

Các bài thực hành dùng dải địa chỉ riêng như `10.0.0.0/8`, `172.16.0.0/12` và `192.168.0.0/16`. Máy trong mạng riêng có thể dùng các địa chỉ này mà không cần mỗi máy một địa chỉ công cộng. Muốn ra Internet, mạng thường cần một thiết bị biên thực hiện NAT và một địa chỉ công cộng; việc có IP riêng không tự làm máy truy cập Internet được.

Slide gốc giới thiệu cách chia địa chỉ theo lớp A (`/8`), B (`/16`), C (`/24`), D (multicast) và E (dự trữ). Đây là cách phân loại lịch sử giúp đọc tài liệu cũ. Khi làm bài, **luôn dùng mask ghi kèm địa chỉ**: `192.168.1.70/26` thuộc `192.168.1.64/26`, còn `192.168.1.70/27` thuộc `192.168.1.64/27`. Cùng một IP có thể thuộc các mạng có kích thước khác nhau.

## 5. Vì sao chia mạng con?

Ví dụ một `/24` có 256 địa chỉ. Chia thành bốn mạng `/26` giúp đặt các nhóm máy ở những LAN riêng; broadcast của một LAN không đi tràn sang các LAN khác qua router. `/26` có `2^(32−26) = 64` địa chỉ mỗi mạng, gồm một địa chỉ mạng, một broadcast và **62 địa chỉ host dùng được**. Các mạng bắt đầu ở `.0`, `.64`, `.128`, `.192`. Nếu cần sáu LAN, `/27` tạo tám mạng, mỗi mạng 32 địa chỉ và 30 host dùng được. Chọn mask theo **cả số LAN cần tạo lẫn số host tối đa của mỗi LAN**.

> Slide có chỗ viết “số mạng con khả dụng = 2^số bit mượn − 2”. Đó là quy tắc lịch sử loại bỏ subnet toàn bit 0 và toàn bit 1. Với cách dùng CIDR hiện nay, cả hai subnet đều dùng được; mượn 3 bit từ `/24` tạo **8 mạng `/27`**, không phải 6. Công thức `2^h − 2` cho **host dùng được** vẫn áp dụng trong các bài IPv4 thông thường.

## Tự kiểm tra

1. `10.0.1.15/24` và `10.0.2.15/24` có cùng mạng con không?
2. Gateway `192.168.20.1` có phù hợp với PC `192.168.10.5/24` không? Vì sao?
3. Trong `172.16.8.0/26`, địa chỉ mạng, broadcast và số host dùng được là bao nhiêu?
4. Cần sáu LAN, mỗi LAN tối đa 30 máy. Vì sao `/27` phù hợp và `/28` không đủ host?
