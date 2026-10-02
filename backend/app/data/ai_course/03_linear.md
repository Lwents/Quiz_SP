# Hồi quy tuyến tính: học một đường để dự đoán số

**Mục tiêu:** Hiểu mô hình $y = w_0 + w_1x$, ý nghĩa của hệ số và sự khác nhau giữa dự đoán với nhãn thật.

## Một bài toán rất nhỏ

Giả sử ta dùng chiều cao để ước lượng cân nặng. Một mô hình đơn giản có dạng:

$$\hat y = w_0 + w_1x$$

Ở đây `x` là chiều cao, `ŷ` là cân nặng dự đoán. `w₀` là điểm bắt đầu của đường thẳng, `w₁` là mức thay đổi dự đoán khi chiều cao tăng một đơn vị. Nếu `w₁ = 0,4` kg/cm, tăng 1 cm làm dự đoán tăng 0,4 kg **khi các điều kiện khác giữ nguyên**. Hệ số là quan hệ trong dữ liệu, không tự chứng minh nguyên nhân.

Huấn luyện nghĩa là chọn `w₀, w₁` sao cho các dự đoán gần số thật của những người trong bảng. **Sai số** của một mẫu là `dự đoán − số thật`; bình phương sai số giúp các sai lệch lớn bị phạt nhiều hơn.

## Vì sao gọi là “hồi quy”?

Đầu ra là **số có thể thay đổi liên tục**: kg, gram CO₂/km hoặc giá nhà. Ngược lại, câu hỏi “duyệt hay từ chối” có đầu ra rời rạc, là **phân loại**.

## Ba việc nên làm sau khi huấn luyện

1. In hệ số và đơn vị đo. Hệ số không có đơn vị thì rất dễ diễn giải sai.
2. Dự đoán cho một đầu vào mới, rồi xem giá trị đó có nằm trong khoảng dữ liệu từng học không.
3. Đo sai số trên mẫu chưa dùng để học; không chỉ đọc hệ số hoặc một dự đoán đẹp.

Ví dụ bạn học từ chiều cao 147–183 cm rồi hỏi mô hình cho người cao 250 cm. Máy vẫn xuất số, nhưng đó là **ngoại suy** xa dữ liệu huấn luyện; không nên tin như một kết luận chắc chắn.

## Tự kiểm tra

Nếu `w₀ = -5`, `w₁ = 0,4` và `x = 160`, dự đoán là `-5 + 0,4 × 160 = 59` kg. Nếu số thật là 56 kg thì sai số là 3 kg.

**Nguồn học thêm:** [Khóa OLM – phần Hồi quy tuyến tính](https://olm.vn/bg/tri-tue-nhan-tao) và [tài liệu LinearRegression của scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LinearRegression.html).
