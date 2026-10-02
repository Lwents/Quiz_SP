# MLP: học ranh giới phi tuyến bằng nhiều lớp

**Mục tiêu:** Mô tả được luồng tính toán trong một MLP, liên hệ backpropagation với Gradient Descent và nhận ra rủi ro học thuộc.

## Vì sao cần nhiều hơn một đường thẳng?

Perceptron chia hai nhóm bằng một đường thẳng (hoặc một mặt phẳng trong nhiều chiều). Nếu điểm nhóm A nằm ở giữa, còn nhóm B bao quanh thành vòng, một đường thẳng không thể tách hai nhóm đúng hết. Thêm dữ liệu cũng không sửa được giới hạn hình dạng của mô hình.

**Multi-Layer Perceptron (MLP)** là mạng nơ-ron truyền thẳng có lớp đầu vào, một hoặc nhiều lớp ẩn và lớp đầu ra. Mỗi nơ-ron lấy đầu vào, nhân với trọng số, cộng hệ số lệch rồi áp dụng một hàm kích hoạt:

```text
đầu vào → tổng có trọng số → hàm kích hoạt → đầu ra của nơ-ron
```

## Các lớp làm nhiệm vụ gì?

1. **Lớp đầu vào:** nhận các đặc trưng. Ví dụ hai số là chiều dài và chiều rộng cánh hoa.
2. **Lớp ẩn:** kết hợp thông tin để tạo các biểu diễn trung gian. Nhiều nơ-ron có thể phát hiện những kiểu kết hợp khác nhau.
3. **Lớp đầu ra:** tạo dự đoán. Bài hồi quy có thể có một số đầu ra; phân loại nhiều lớp có thể có một điểm/xác suất cho mỗi lớp.

Nếu tất cả lớp chỉ thực hiện biến đổi tuyến tính, nối nhiều lớp vẫn tương đương một phép tuyến tính lớn. **Hàm kích hoạt phi tuyến** như ReLU cho phép mạng tạo ranh giới cong hoặc nhiều vùng quyết định.

## Mạng học bằng vòng lặp nào?

1. **Lan truyền xuôi:** đưa một mẫu qua các lớp để tính dự đoán.
2. **Đo lỗi:** so sánh dự đoán với nhãn thật bằng hàm mất mát.
3. **Lan truyền ngược (backpropagation):** tính xem mỗi trọng số góp phần vào lỗi nhiều đến mức nào, dùng quy tắc đạo hàm từ lớp cuối ngược về lớp đầu.
4. **Gradient Descent:** cập nhật trọng số để giảm lỗi, với tốc độ học (*learning rate*) đã chọn.
5. **Lặp lại:** xử lý nhiều mẫu qua nhiều vòng, rồi kiểm tra trên dữ liệu chưa dùng khi huấn luyện.

Backpropagation tính **gradient**; Gradient Descent dùng gradient đó để **đổi trọng số**. Hai khái niệm liên quan nhưng không phải cùng một bước. Điều này nối trực tiếp với bài Gradient Descent đã học: điểm mới là đạo hàm được truyền qua nhiều lớp.

## Ví dụ nhìn thấy ranh giới cong

Hãy tưởng tượng trên mặt phẳng, nhóm xanh nằm gần tâm còn nhóm đỏ nằm thành vòng bao quanh. Một đường thẳng duy nhất không thể bao lấy nhóm xanh. MLP có thể dùng lớp ẩn tạo các đặc trưng trung gian gần với “điểm này có nằm gần tâm không?”, sau đó lớp đầu ra kết hợp chúng để chia hai nhóm. MLP học trọng số từ ví dụ; người viết chương trình không cần tự vẽ trước đường cong chính xác.

## Một ví dụ sử dụng scikit-learn

Đoạn mã dưới đây tạo dữ liệu minh họa hai nhóm cong, chia riêng tập test và chuẩn hóa đặc trưng trước khi huấn luyện:

```python
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = make_moons(n_samples=300, noise=0.20, random_state=7)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=7, stratify=y
)

model = make_pipeline(
    StandardScaler(),
    MLPClassifier(hidden_layer_sizes=(16, 8), max_iter=1000, random_state=7)
)
model.fit(X_train, y_train)
print("Accuracy trên test:", model.score(X_test, y_test))
```

`(16, 8)` nghĩa là có hai lớp ẩn, lần lượt 16 và 8 nơ-ron; đây là lựa chọn minh họa, không phải cấu hình tốt cho mọi bài. `StandardScaler` giúp các đặc trưng nằm trên thang đo dễ tối ưu hơn. `stratify=y` giữ tỷ lệ hai nhãn gần giống nhau khi chia train/test. Accuracy chỉ là một chỉ số; nếu lớp mất cân bằng, cần xem thêm precision, recall và ma trận nhầm lẫn.

## Đổi lại, mô hình có thể phức tạp hơn mức cần thiết

- Mạng nhiều trọng số có thể **học thuộc** tập train, nhưng dự đoán kém cho dữ liệu mới.
- Huấn luyện phụ thuộc vào tốc độ học, số lớp, số nơ-ron, khởi tạo và cách chia dữ liệu.
- Dữ liệu đầu vào khác thang đo thường cần chuẩn hóa; phép chuẩn hóa phải được học từ tập train rồi áp dụng cho test.
- MLP khó giải thích hơn một phương trình hồi quy đơn giản.

Vì vậy, hãy thử mô hình đơn giản làm mốc, xem khoảng cách train/test và chỉ tăng độ phức tạp khi có lý do. Mô hình mạnh hơn không tự động đồng nghĩa với kết quả đáng tin hơn.

## Tự kiểm tra

Nơ-ron lấy tổng có trọng số rồi áp dụng điều gì để mạng học quan hệ phi tuyến? **Hàm kích hoạt phi tuyến.** Backpropagation làm gì? **Tính gradient/đóng góp của trọng số vào lỗi.** Gradient Descent làm gì? **Dùng gradient để cập nhật trọng số.**

**Nguồn:** [Mạng nơ-ron nhiều lớp trong tài liệu scikit-learn](https://scikit-learn.org/stable/modules/neural_networks_supervised.html) và [lộ trình AI trên OLM](https://olm.vn/bg/tri-tue-nhan-tao).
