# CSMA/CA: lắng nghe, xin phát và xác nhận

**Mục tiêu:** Kể lại được một vòng truyền Wi-Fi bằng các từ RTS, CTS, DATA, ACK; phân biệt tránh xung đột với phát hiện xung đột.

Trong Ethernet cổ điển, CSMA/CD cố phát hiện xung đột khi đang truyền. Máy vô tuyến thường không thể vừa phát vừa thu cùng kênh đủ tin cậy để dùng cách đó. Vì vậy Wi-Fi dùng **CSMA/CA**, tức cố giảm khả năng xung đột trước và trong khi gửi.

## Một vòng truyền điển hình

1. **Nghe kênh:** máy phát kiểm tra môi trường. Nếu đang bận, nó chờ và chọn thời gian lùi ngẫu nhiên (*backoff*).
2. **Chờ khoảng ưu tiên:** khi kênh rảnh, các loại khung có thời gian chờ khác nhau. Khung điều khiển cần phản hồi sớm được ưu tiên.
3. **RTS/CTS khi được sử dụng:** máy phát gửi *Request To Send*; máy thu trả *Clear To Send* nếu sẵn sàng. Các trạm nghe được tín hiệu có thể dành thời gian kênh qua bộ đếm **NAV**. RTS/CTS đặc biệt hữu ích để giảm vấn đề trạm ẩn, nhưng không bắt buộc có trong mọi lần gửi.
4. **DATA và ACK:** máy phát gửi dữ liệu. Máy thu kiểm tra khung; nếu nhận đúng thì phản hồi ACK. Không thấy ACK sau thời gian chờ thì máy phát coi lần gửi chưa thành công và thử lại theo quy tắc backoff.

Điểm hay nhầm: **khung lỗi không được xác nhận bằng ACK**. ACK chỉ xác nhận máy thu đã nhận hợp lệ. Một khung bị lỗi hoặc ACK bị mất đều có thể khiến máy phát phải truyền lại.

## Các khoảng IFS và khung 802.11

Slide giới thiệu **SIFS, PIFS, DIFS, EIFS**. Cách nhớ trước tiên là thứ tự ưu tiên: phản hồi điều khiển sau **SIFS** được đi sớm; truyền dữ liệu cạnh tranh thông thường chờ lâu hơn qua **DIFS**. Đừng học thuộc một giá trị micro giây cho mọi chuẩn vì thời gian phụ thuộc PHY và cấu hình.

Khung 802.11 có ba nhóm: **management** (quản lý kết nối), **control** (RTS, CTS, ACK) và **data**. Những trường như Duration/NAV, địa chỉ, số thứ tự, checksum giúp trạm biết ai gửi, dành kênh bao lâu và khung có hợp lệ hay không.

## Tự kiểm tra

C gửi RTS tới B nhưng không nhận CTS. C có nên gửi DATA ngay không? Vì sao? Nếu B nhận DATA bị lỗi, B có gửi ACK không?

*Đọc slide K74 số 3, trang 16–47.*
