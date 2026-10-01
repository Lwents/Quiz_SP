# Mô phỏng mạng: thử lớn, đo rõ, hiểu giới hạn

**Mục tiêu:** Biết đặt câu hỏi thí nghiệm mạng, chọn chỉ số đo và đọc được ý nghĩa cơ bản của kịch bản NS-2 trong slide.

Làm thử trên mạng thật với hàng nghìn hoặc hàng trăm nghìn nút rất tốn tiền và khó lặp lại đúng điều kiện cũ. **Mô phỏng** biểu diễn nút, đường truyền, băng thông, độ trễ, lỗi và chuyển động bằng một mô hình; ta có thể đổi từng tham số rồi so kết quả. Slide nêu SimGrid, GloMoSim và NS-2 như những môi trường mô phỏng phục vụ các bài toán khác nhau.

## Thiết kế một thí nghiệm dễ hiểu

Giả sử muốn so sánh AODV với OLSR khi các nút di chuyển:

1. Chọn số nút, vùng mô phỏng, cách các nút di chuyển, tốc độ gửi dữ liệu và thời lượng chạy.
2. Giữ các điều kiện giống nhau giữa hai lần thử; chỉ đổi giao thức định tuyến.
3. Đo **tỷ lệ gói đến đích**, **độ trễ**, **thông lượng** và **số thông điệp điều khiển**.
4. Chạy nhiều lần với hạt giống ngẫu nhiên khác nhau rồi xem xu hướng, thay vì kết luận từ một lần chạy.

Trong NS-2 của slide, `set ns [new Simulator]` tạo đối tượng mô phỏng, `$ns at <time> <event>` xếp sự kiện vào mốc thời gian, và `$ns run` bắt đầu xử lý lịch sự kiện. Ví dụ có thể cho ứng dụng bắt đầu ở giây 0,1 và dừng ở giây 124.

## Giới hạn cần nhớ

Mô hình chỉ chứa những yếu tố người thiết kế đưa vào. Nhiễu bất ngờ, tường thật, lỗi thiết bị, hành vi người dùng và biến động hệ thống có thể khác giả định. Vì vậy kết quả mô phỏng là **bằng chứng trong điều kiện đã đặt**, cần đối chiếu thử nghiệm thực tế khi triển khai.

Slide có ví dụ máy ảo và mật khẩu phục vụ buổi thực hành cũ; phần khóa học tập trung vào nguyên lý mô phỏng và không dùng những thông tin đó như hướng dẫn cài đặt hiện nay.

## Tự kiểm tra

Nếu kết quả cho thấy AODV ít thông điệp điều khiển hơn nhưng gói đầu tiên đến chậm hơn OLSR, điều đó có phù hợp đặc điểm hai họ giao thức không? Vì sao?

*Đọc slide K74 số 7, trang 1–18.*
