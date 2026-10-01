# Định tuyến MANET: biết đường sẵn hay tìm khi cần?

**Mục tiêu:** Chọn được giữa giao thức proactive và reactive theo tình huống và hiểu đánh đổi giữa lưu lượng điều khiển với thời gian chờ tìm đường.

Trong MANET, topo có thể thay đổi liên tục. Nút A đang có tuyến tới D nhưng một nút trung gian di chuyển sẽ làm tuyến đó không còn dùng được. Giao thức định tuyến cần phát hiện và cập nhật sự thay đổi này.

## Proactive: chuẩn bị trước

Giao thức **proactive** duy trì thông tin tuyến thường xuyên, kể cả lúc chưa có dữ liệu cần gửi. Khi A muốn liên lạc với D, đường đi thường đã có trong bảng. Đổi lại mạng phải trao đổi thông điệp điều khiển định kỳ, tiêu tốn băng thông và pin. Slide lấy **OLSR** làm ví dụ.

## Reactive: hỏi khi cần

Giao thức **reactive** chỉ phát sinh thủ tục tìm đường lúc có nhu cầu gửi mà chưa biết tuyến. Lúc nhàn rỗi, nó giảm lượng thông điệp duy trì đường đi; nhưng gói dữ liệu đầu tiên có thể phải chờ khám phá tuyến. Slide lấy **AODV** làm ví dụ. Một số thiết kế còn kết hợp hai cách theo vùng hoặc mức độ hoạt động.

| Tình huống | Cách có thể hợp lý hơn | Vì sao |
| --- | --- | --- |
| Các nút liên lạc thường xuyên, cần gửi ngay | Proactive | Đã chuẩn bị thông tin tuyến. |
| Ít cuộc truyền, nhiều nút dùng pin | Reactive | Tránh cập nhật tuyến liên tục khi không dùng. |
| Topo thay đổi rất nhanh | Cần đánh giá thực nghiệm | Cả chi phí cập nhật và tìm lại đường đều có thể cao. |

Đây là **đánh đổi**, không có một giao thức luôn tốt nhất. Khi so sánh, hãy hỏi: tốc độ thay đổi topo, tần suất gửi dữ liệu, số nút, băng thông, pin và mức độ chấp nhận độ trễ.

## Tự kiểm tra

Một mạng cứu hộ có 100 nút nhưng chỉ vài nút gửi vị trí mỗi phút: vì sao có thể cân nhắc reactive? Nếu tất cả nút liên tục trao đổi cảnh báo, nhược điểm nào của reactive bộc lộ rõ hơn?

*Đọc slide K74 số 5, trang 49–52.*
