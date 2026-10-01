# Access Point, Bridge, Repeater và bảo mật

**Mục tiêu:** Nhìn một sơ đồ mạng và xác định chức năng của AP, cầu vô tuyến và bộ lặp; biết nguyên tắc chọn cấu hình bảo mật.

Trong WLAN có hạ tầng, **Access Point (AP)** là điểm mà các máy trạm vô tuyến kết nối vào mạng. Vùng mà một AP phục vụ gọi là *cell*. Máy trạm và AP cùng chia sẻ môi trường truyền, nên chỉ thêm AP mà không thiết kế kênh và vị trí hợp lý chưa chắc cải thiện mạng.

## Ba chế độ dễ nhầm

| Chế độ trong slide | Chức năng chính | Dấu hiệu nhận biết |
| --- | --- | --- |
| Root/AP | Nhận máy trạm không dây và nối vào mạng hữu tuyến | AP là cổng vào LAN cho điện thoại/laptop. |
| Bridge | Nối hai đoạn LAN qua liên kết vô tuyến | Hai đầu cầu thường hướng về nhau; máy trạm có thể không kết nối trực tiếp vào cầu. |
| Repeater | Thu rồi phát lại để mở rộng vùng phủ | Không cần đường Ethernet ở vị trí lặp, nhưng dùng thêm thời gian phát nên thông lượng có thể giảm. |

Ví dụ sơ đồ có tòa nhà chính H1 và nhà A bị đường ô tô ngăn cách: hãy tìm liên kết nào là cầu vô tuyến giữa hai LAN. Bên trong từng tòa nhà, máy tính có thể vẫn dùng cáp; “có cầu vô tuyến” không có nghĩa toàn bộ mạng đều không dây.

## Bảo mật cần nhớ

Mạng **Open** không yêu cầu xác thực Wi-Fi. **WEP** là giao thức cũ yếu. **WPA/WPA2/WPA3** là các thế hệ bảo vệ mới hơn trong nội dung slide; khi cấu hình thật, chọn mức mạnh nhất mà thiết bị hỗ trợ và dùng mật khẩu đủ tốt. **WPS** là cách hỗ trợ ghép nối thiết bị, không phải tên của một cơ chế mã hóa thay cho WPA.

## Tự kiểm tra

Một AP trên tầng 2 nối cáp vào switch và cho điện thoại dùng Wi-Fi: chế độ nào? Hai thiết bị chĩa ăng-ten qua sân nối hai LAN: chức năng gì? Một thiết bị đặt giữa hành lang chỉ thu/phát lại tín hiệu: chức năng gì?

*Đọc slide K74 số 2, trang 43–70.*
