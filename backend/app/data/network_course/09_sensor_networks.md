# Mạng cảm biến không dây và 802.15.4

**Mục tiêu:** Vẽ được đường đi “cảm biến → nút trung gian → gateway → người dùng” và giải thích vì sao mạng cảm biến ưu tiên tiết kiệm pin.

**Cảm biến** biến một đại lượng của môi trường thành dữ liệu: nhiệt độ, độ ẩm, ánh sáng, chuyển động hoặc nhịp tim. Một **mạng cảm biến không dây (WSN)** gồm nhiều nút có cảm biến, bộ xử lý nhỏ và phần vô tuyến. Các nút có thể gửi dữ liệu trực tiếp hoặc qua nhiều nút trung gian tới **sink/gateway**, nơi dữ liệu tiếp tục đi đến ứng dụng giám sát.

## Ví dụ dễ hình dung

Trong nhà kính, mỗi nút đo nhiệt độ và độ ẩm rồi gửi kết quả định kỳ. Một nút xa gateway chuyển dữ liệu qua nút gần hơn. Ứng dụng nhận số đo và có thể bật quạt hoặc gửi cảnh báo. Nút phải vừa **đo**, vừa **truyền**, đôi khi còn **chuyển tiếp** dữ liệu của nút khác.

## Vì sao 802.15.4 phù hợp?

Slide giới thiệu IEEE 802.15.4 ở tầng vật lý và MAC cho thiết bị công suất thấp, tốc độ dữ liệu thấp, gói nhỏ. Đó là lựa chọn hợp với thông tin như “nhiệt độ 29°C”, thay vì video liên tục. ZigBee được nhắc như một hệ dùng 802.15.4 cho các thiết bị IoT. Đừng đồng nhất mọi WSN với ZigBee: slide cũng liệt kê các kết nối khác tùy bài toán.

## Bốn khó khăn quan trọng

- **Pin ít:** phát sóng liên tục làm pin mau hết; cho nút ngủ và đánh thức theo lịch có thể giúp tiết kiệm.
- **Phần cứng nhỏ:** RAM và CPU hạn chế; phần mềm và giao thức phải gọn.
- **Liên kết không ổn định:** vật cản và thiết bị khác có thể làm mất gói.
- **Định tuyến đa chặng:** nút gần gateway có thể phải chuyển tiếp nhiều, nên hao pin nhanh hơn.

Slide còn giới thiệu **truyền năng lượng không dây** ở gần bằng ghép từ và ở xa bằng sóng điện từ. Đây là hướng bổ sung nguồn năng lượng, không thay thế việc thiết kế giao thức tiết kiệm điện.

## Tự kiểm tra

Một cảm biến chỉ gửi nhiệt độ mỗi 10 phút. Vì sao dùng kết nối công suất thấp và chế độ ngủ sẽ hợp lý hơn giữ Wi-Fi truyền liên tục? Nút nào trong mạng đa chặng có nguy cơ hết pin sớm nhất?

*Đọc slide K74 số 4, trang 1–18.*
