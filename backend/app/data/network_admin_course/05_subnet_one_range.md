# Từ một khối /24 đến nhiều mạng /26

**Mục tiêu:** Chia đúng dải `192.168.1.0/24` cho hai LAN và đường nối hai router trong bài của học phần.

## Bốn mạng con `/26`

Một khối `/24` có `32 − 24 = 8` bit host, tức `2⁸ = 256` địa chỉ. Bài hai router cần ít nhất **ba mạng lớp 3**: LAN trái, đường R1–R2, LAN phải. Mượn 2 bit từ phần host tạo `2² = 4` mạng con, đủ ba mạng đang dùng và còn một mạng dự phòng. Tiền tố mới là `/26`; còn `32 − 26 = 6` bit host cho mỗi mạng, tức `2⁶ = 64` địa chỉ.

Subnet mask `/26` là `255.255.255.192` vì octet cuối có hai bit mạng `11000000₂ = 192`. Bước nhảy giữa các địa chỉ mạng là `256 − 192 = 64`, nên bốn mạng bắt đầu tại `.0`, `.64`, `.128`, `.192`. Mỗi mạng có 62 địa chỉ host thông thường: trừ địa chỉ đầu (địa chỉ mạng) và địa chỉ cuối (broadcast).

| Mạng | Địa chỉ host dùng được | Broadcast | Dùng cho |
|---|---|---|---|
| 192.168.1.0/26 | .1–.62 | .63 | LAN của R1 |
| 192.168.1.64/26 | .65–.126 | .127 | Kết nối R1–R2 |
| 192.168.1.128/26 | .129–.190 | .191 | LAN của R2 |
| 192.168.1.192/26 | .193–.254 | .255 | Dự phòng |

## Gán địa chỉ theo sơ đồ hướng dẫn

PC1 `192.168.1.10/26` → gateway R1 F0/1 `192.168.1.1/26`. R1 S0/0 `192.168.1.65/26` nối R2 S0/1 `192.168.1.66/26`. R2 F0/0 `192.168.1.130/26` → PC2 `192.168.1.150/26`, gateway `192.168.1.130`.

Khi PC1 ping `192.168.1.150`, nó lấy IP đích AND với mask `/26` được mạng `.128`, khác mạng `.0` của mình. Vì vậy PC1 gửi frame đến gateway R1 `.1`. R1 biết đường nối `.64` nhưng chưa tự biết LAN `.128` ở sau R2; RIP hoặc tuyến tĩnh bổ sung đường này. Chiều phản hồi cũng cần tuyến từ R2 về LAN `.0`, nếu không ping vẫn thất bại.

## Tự kiểm tra

`192.168.1.66/26` thuộc mạng nào? `192.168.1.127` có dùng cho giao diện router được không? Vì sao PC `192.168.1.150/26` không thể đặt gateway `192.168.1.1`?
