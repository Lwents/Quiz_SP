# Thực hành tuần 3: 20 khách train, 10 khách test

**Mục tiêu:** Làm đúng yêu cầu PLA của thầy, dự đoán khách mới `(15,630)` và so với `sklearn` một cách công bằng.

## Đọc đúng yêu cầu

Tin của Phạm Thọ Hoàn ngày 25/09 yêu cầu: huấn luyện PLA trên **20 khách đã gán nhãn**; đánh giá trên **10 khách độc lập**; dự đoán khách `(thu nhập=15, điểm tín dụng=630)`; tính `accuracy_train` và `accuracy_test`; cuối cùng so với `sklearn.Perceptron`. Tùng báo đã tạo chỗ nộp bài tuần 3 trên CST.

## Các bước thực hiện

1. Kiểm tra kích thước `X_train: 20 × 2`, `y_train: 20`, `X_test: 10 × 2`, `y_test: 10`.
2. Dùng **cùng phép đổi** `điểm tín dụng / 100` cho train, test và khách `(15,630)`.
3. Thêm cột 1 nếu tự cài đặt PLA để học `w₀`.
4. Lặp qua từng mẫu train, cập nhật khi `y_i × score ≤ 0`, nhưng có giới hạn số epoch.
5. In `w₀, w₁, w₂`, dự đoán của khách mới và hai độ chính xác. Ghi rõ nhãn `+1 = duyệt`, `-1 = từ chối`.
6. Huấn luyện `sklearn.Perceptron` **trên đúng tập train đã đổi thang**; dự đoán trên đúng tập test. So sánh kết quả, không ép hai vector trọng số phải giống hệt nhau vì thứ tự cập nhật và điều kiện dừng có thể khác.

```python
import numpy as np
from sklearn.linear_model import Perceptron
from sklearn.metrics import accuracy_score

# X_train, y_train, X_test, y_test lấy từ bảng bài tập.
X_train_scaled = X_train.copy().astype(float)
X_test_scaled = X_test.copy().astype(float)
X_train_scaled[:, 1] /= 100
X_test_scaled[:, 1] /= 100

model = Perceptron(max_iter=2000, tol=None, shuffle=False, random_state=42)
model.fit(X_train_scaled, y_train)
print('Train:', accuracy_score(y_train, model.predict(X_train_scaled)))
print('Test:', accuracy_score(y_test, model.predict(X_test_scaled)))
print('Khách mới:', model.predict([[15, 6.3]])[0])
```

Đoạn mã này cần bốn mảng dữ liệu của bài tập; nó không tự tạo kết quả khi chưa có dữ liệu. Đừng chép một tỷ lệ accuracy hoặc quyết định cho vay từ người khác rồi gắn vào bài mình: kết quả phụ thuộc đúng bảng, cách đổi thang và thuật toán đang chạy.

## Nộp bài có thể kiểm tra được

Bài nộp nên ghi **dữ liệu, quy ước nhãn, phương pháp chuẩn hóa, trọng số, dự đoán, train accuracy và test accuracy**. Nếu hai cách khác nhau, kèm vài dòng giải thích về điều kiện dừng, thứ tự mẫu và cách cài đặt.
