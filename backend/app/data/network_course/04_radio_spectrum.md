# Tần số, vật cản và dải ISM

**Mục tiêu:** Dùng mối quan hệ tần số–bước sóng để giải thích lựa chọn môi trường truyền, đồng thời hiểu vì sao thiết bị trên dải ISM vẫn có thể nhiễu nhau.

Sóng vô tuyến là một phần của phổ điện từ. Tần số càng cao thì bước sóng càng ngắn: **bước sóng = tốc độ lan truyền / tần số**. Trong cùng điều kiện, tín hiệu tần số cao thường suy hao và khó vượt vật cản hơn; đổi lại nó có thể hỗ trợ những thiết kế kênh truyền dung lượng lớn. Đây là xu hướng cần xét cùng công suất, ăng-ten và môi trường, không phải quy tắc đủ để đoán chính xác tốc độ.

## Ba kiểu truyền trong slide

- **Radio tần số thấp:** có thể đi xa và vượt một số vật cản tốt hơn, nhưng thường dành cho lưu lượng thấp.
- **Viba:** thường dùng đường truyền định hướng giữa hai điểm có tầm nhìn tương đối thông suốt, ví dụ hai trạm trên cao. Viba cũng xuất hiện trong hạ tầng di động và thông tin vệ tinh.
- **Hồng ngoại:** phù hợp phạm vi gần hoặc không gian kín; vật cản che đường đi rất rõ. Có thể phát chùm tia hướng đích hoặc phủ trong phòng.

Một đường truyền giữa hai mái nhà cần khảo sát tầm nhìn, độ cao ăng-ten và ảnh hưởng thời tiết. Chỉ biết “hai nhà cách nhau 500 m” là chưa đủ để chọn thiết bị.

## Dải ISM là gì?

ISM là *Industrial, Scientific, Medical*. Slide dùng Wi-Fi, Bluetooth và các thiết bị tầm ngắn làm ví dụ. Thiết bị hoạt động trên dải được phép dùng chung **không có kênh riêng tuyệt đối**: các thiết bị ở gần, kể cả loại khác mục đích, vẫn có thể gây nhiễu. Vì vậy cấu hình kênh và khảo sát thực địa rất quan trọng.

Quản lý phổ tần còn phụ thuộc địa điểm và quy định áp dụng. Khi triển khai thực tế, luôn kiểm tra quy định hiện hành thay vì lấy con số giấy phép trong slide cũ làm mặc định.

## Tự kiểm tra

Hai AP dùng kênh gần nhau trong cùng hành lang, một AP đặt sau tủ kim loại. Hãy tách nguyên nhân chậm mạng thành **nhiễu đồng kênh/kênh kề**, **suy hao do vật cản** và **số máy đang chia sẻ AP**.

*Đọc slide K74 số 2, trang 1–42.*
