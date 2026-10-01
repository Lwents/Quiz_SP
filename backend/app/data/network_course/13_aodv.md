# AODV: tìm đường và sửa đường khi mạng đổi

**Mục tiêu:** Kể đúng vai trò của RREQ, RREP, RERR, HELLO và sequence number; xử lý được một tình huống bảng định tuyến mất nút kế tiếp.

**AODV** là giao thức định tuyến theo nhu cầu cho mạng ad-hoc. Nút không liên tục tìm mọi đường có thể; nó khám phá tuyến khi cần gửi gói tin tới đích chưa biết.

## Ví dụ A muốn gửi cho D

1. A tra bảng định tuyến. Nếu không có tuyến còn dùng được, A phát **RREQ** (*Route Request*).
2. Nút nhận RREQ kiểm tra: nếu là D hoặc có thông tin tuyến đủ mới tới D, nó có thể trả **RREP** (*Route Reply*). Nếu chưa biết đường, nó chuyển tiếp yêu cầu theo quy tắc giao thức.
3. RREP quay về theo đường ngược, giúp A ghi nhớ nút kế tiếp để chuyển gói DATA.
4. Nếu liên kết trên tuyến đứt, nút phát hiện lỗi phát **RERR** (*Route Error*) để các nút liên quan bỏ hoặc đánh dấu không dùng tuyến hỏng.

**HELLO** giúp phát hiện hàng xóm đang còn liên lạc. Không thấy tín hiệu từ một hàng xóm trong khoảng quy định có thể là dấu hiệu liên kết đã mất. **RREP-ACK** chỉ xuất hiện khi phản hồi tuyến yêu cầu xác nhận.

## Sequence number và thời gian sống

Mạng nhiều nút có thể đưa cùng yêu cầu đi vòng rồi quay lại chỗ cũ. **Sequence number** giúp nhận biết thông tin mới/cũ và tránh lặp vô hạn; yêu cầu tuyến còn được nhận diện theo nguồn và số yêu cầu. **TTL/lifespan** giới hạn phạm vi hoặc thời gian lan của thông điệp. Đừng nhầm sequence number với số hop: một trường nói về độ mới/nhận diện, trường kia nói về độ dài đường đi.

Giả sử nút 3 đang chuyển gói qua nút 5 nhưng liên kết tới 5 mất. Nút 3 cần xem tuyến nào phụ thuộc nút 5 làm **next hop**, đánh dấu chúng hỏng và báo lỗi phù hợp. Nó không thể cứ gửi DATA lên liên kết đã mất rồi coi như đến đích.

## Tự kiểm tra

A không biết đường tới D: thông điệp đầu tiên để hỏi đường là gì? Một nút đã biết đường nhận được RREQ: nó trả gì? Khi tuyến đang dùng bị đứt: thông điệp báo lỗi là gì? Đáp án lần lượt: **RREQ, RREP, RERR**.

*Đọc slide K74 số 6, trang 1–30.*
