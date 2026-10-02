# Bài 11: Biến dữ liệu thô thành đặc trưng hữu ích

**Mục tiêu:** Mô tả được đường đi từ dữ liệu thô qua biến đổi đặc trưng tới mô hình và tránh rò rỉ thông tin giữa train với test.

## Mô hình không đọc dữ liệu như con người

Một người nhìn dòng “đơn đặt hàng ngày 01/10, giao sau 3 ngày” có thể tự hiểu ngày trong tuần và thời gian giao. Phần lớn thuật toán cơ bản cần một biểu diễn số có cấu trúc rõ ràng. **Feature engineering** là bước chọn, tạo và biến đổi các đặc trưng để dữ liệu nói đúng điều liên quan đến mục tiêu.

Ví dụ muốn dự đoán thời gian giao hàng:

| Dữ liệu thô | Đặc trưng có thể tạo |
| --- | --- |
| Ngày đặt | Thứ trong tuần, tháng, cuối tuần hay không |
| Địa chỉ | Khu vực hoặc khoảng cách tới kho |
| “Nhanh”, “thường” | Mã hóa loại dịch vụ |
| Cân nặng gói | Số đo đã đổi sang kg và kiểm tra giá trị thiếu |

## Một pipeline dễ kiểm tra

```text
dữ liệu thô → làm sạch → tạo/chọn đặc trưng → học mô hình → dự đoán
```

- **Làm sạch:** xử lý ô trống, đơn vị lẫn lộn và dữ liệu nhập sai.
- **Mã hóa:** đổi danh mục như “sáng/chiều” thành dạng số mà không tạo thứ tự giả.
- **Chọn hoặc tạo đặc trưng:** dùng thông tin phù hợp, chẳng hạn số ngày từ đơn đặt đến ngày giao.
- **Co giãn thang đo:** chuẩn hóa khi thuật toán phụ thuộc khoảng cách hoặc độ lớn hệ số.

## Rò rỉ dữ liệu làm điểm kiểm tra giả đẹp

Chỉ học các phép biến đổi từ tập train. Nếu lấy trung bình của toàn bộ train lẫn test để chuẩn hóa, thông tin test đã lọt vào quy trình. Cùng lỗi xảy ra khi chọn đặc trưng sau khi đã nhìn nhãn test hoặc khi đưa kết quả tương lai vào làm đầu vào.

Giải pháp là đóng gói biến đổi và mô hình trong cùng pipeline: gọi `fit` trên train; pipeline tự học phép đổi từ train rồi áp dụng y hệt cho test và dữ liệu mới. Trong hệ thống thực tế, cần lưu pipeline để dùng đúng cùng thứ tự cột khi triển khai.

## Cần giữ điều gì khi biến đổi?

Mục đích không phải tạo thật nhiều cột mà là giữ thông tin có liên quan mà mô hình có thể dùng. Nếu dự đoán loại đa giác, số cạnh quan trọng hơn màu; nếu dự đoán màu, cột số cạnh có thể không giúp ích. Trước khi thêm một đặc trưng, hỏi: nó có sẵn tại thời điểm cần dự đoán không, có thể tính ổn định không, và nó có vô tình tiết lộ đáp án không?

## Tự kiểm tra

Bạn chuẩn hóa toàn bộ dữ liệu trước khi tách train/test. Có vấn đề gì? **Phép chuẩn hóa đã nhìn thấy thống kê của test.** Cách đúng? **Tách dữ liệu trước, học bộ chuẩn hóa trên train rồi áp dụng lên test.**

**Nguồn tham khảo:** [Bài 11 về Feature Engineering](https://machinelearningcoban.com/).
