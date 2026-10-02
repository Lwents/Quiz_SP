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

## Làm thử: dự đoán đơn hàng giao trễ

Giả sử mỗi đơn có `khu_vực`, `khối_lượng_kg`, `ngày_đặt`, còn nhãn cần dự đoán là `giao_trễ`.

1. Kiểm tra dữ liệu thiếu và đơn vị. Đổi mọi khối lượng về kg; không để một số dòng là gram.
2. Từ `ngày_đặt`, tạo `thứ_trong_tuần` và `cuối_tuần`. Đây là thông tin số hóa từ ngày, không đưa nguyên văn ngày vào mô hình mà không suy nghĩ.
3. `khu_vực` là danh mục không có thứ tự. Dùng one-hot encoding, ví dụ `Bắc`, `Trung`, `Nam` thành ba cột 0/1; không mã hóa chúng thành 1, 2, 3 vì như vậy có thể khiến mô hình nghĩ Nam “lớn gấp ba” Bắc.
4. Tách train/test. Học giá trị điền thiếu, bộ mã hóa và phép chuẩn hóa chỉ trên train; áp dụng lại các bộ đã học cho validation/test.
5. Mọi đặc trưng phải có tại lúc cần dự đoán. Cột `ngày_giao_thực_tế` tiết lộ thẳng việc giao trễ, nên dùng nó sẽ tạo rò rỉ mục tiêu.

Với nhiều cột, pipeline tự động hóa thứ tự bước giúp tránh quên dùng cùng phép biến đổi ở lúc triển khai. Một kỹ sư khác phải có thể nhìn tên đặc trưng và hiểu nó được tính từ dữ liệu nào.

## Bài luyện tập

Mục tiêu là dự đoán khách có hủy đăng ký trước cuối tháng không. Cột `ngày_hủy` có được dùng làm đầu vào không? **Không, vì nó chứa chính thời điểm/sự kiện cần dự đoán.** Cột `số_lần_đăng_nhập_7_ngày_gần_nhất` có phù hợp không? **Có thể, nếu bảy ngày ấy nằm trước thời điểm ra quyết định và được tính giống nhau khi dùng thật.**

## Tự kiểm tra

Bạn chuẩn hóa toàn bộ dữ liệu trước khi tách train/test. Có vấn đề gì? **Phép chuẩn hóa đã nhìn thấy thống kê của test.** Cách đúng? **Tách dữ liệu trước, học bộ chuẩn hóa trên train rồi áp dụng lên test.**

**Nguồn tham khảo:** [Bài 11 về Feature Engineering](https://machinelearningcoban.com/).
