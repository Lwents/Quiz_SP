# Perceptron (PLA): học đường phân chia hai nhóm

**Mục tiêu:** Đọc được nhãn `+1/-1`, công thức cập nhật PLA và vai trò của chuẩn hóa dữ liệu.

## Từ dự đoán số sang chọn nhóm

Trong bài vay vốn, mỗi khách hàng là một điểm với tọa độ `(thu nhập, điểm tín dụng)`. Ta muốn vẽ một đường sao cho khách **duyệt vay** ở một phía, khách **từ chối** ở phía kia. PLA học các trọng số của đường ấy:

$$score=w_0+w_1\times income+w_2\times credit\_score$$

Quy ước trong **bài PLA của lớp** là `score ≥ 0` dự đoán `+1` = duyệt, còn `score < 0` dự đoán `-1` = từ chối. Đây là quy ước nhãn của bài này, không phải quy tắc chung cho mọi bộ dữ liệu.

## Mô hình học ra sao?

Ban đầu chọn `w = 0`. Đi qua từng khách hàng trong tập train. Nếu dự đoán sai, sửa trọng số về phía nhãn đúng. Với một mẫu đã thêm cột 1, công thức là:

$$w_{mới}=w_{cũ}+\eta\,y_i x_i$$

Trong đó `yᵢ` là `+1` hoặc `-1`. Nếu khách hàng đáng được duyệt (`+1`) mà bị từ chối, phép cộng đẩy điểm của khách hàng ấy lên. Nếu đáng từ chối (`-1`) mà được duyệt, phép cộng số âm kéo điểm xuống.

PLA có thể dừng khi đi qua toàn bộ tập train mà không sai mẫu nào. **Nếu hai nhóm không thể tách hoàn toàn bằng một đường thẳng**, nó có thể không đạt điều kiện dừng; vì vậy phải đặt giới hạn số epoch.

## Vì sao điểm tín dụng chia 100?

Thu nhập trong bảng khoảng 5–40, điểm tín dụng khoảng 500–800. Đem hai số chênh nhau hàng chục lần vào cập nhật khiến một cột lấn át về độ lớn. Bài thực hành chia `credit_score / 100` để hai cột ở thang gần hơn. Khi dự đoán khách mới `(15, 630)`, phải đưa vào `(15, 6.3)` cho **chính mô hình ấy**.

## Tự kiểm tra

Nếu trong bài này mô hình tính `score = -2`, kết luận gì? `-2 < 0`, nên dự đoán nhãn `-1` = từ chối. Số `-2` chưa phải “xác suất 2%”; PLA chỉ cho điểm và phía của đường phân chia.

**Nguồn học thêm:** [Perceptron trong tài liệu scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Perceptron.html) và [lộ trình OLM](https://olm.vn/bg/tri-tue-nhan-tao).
