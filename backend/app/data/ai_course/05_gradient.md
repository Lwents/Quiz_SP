# Gradient Descent: sửa mô hình từng bước nhỏ

**Mục tiêu:** Hiểu vì sao mô hình phải cập nhật hệ số, vai trò của learning rate và cách nhận ra mô hình không hội tụ.

## Hình dung đường xuống dốc

Bạn đang đứng trên một sườn đồi trong sương, chỉ biết hướng nào xuống thấp hơn ở chỗ mình đứng. Bạn bước một đoạn theo hướng xuống, đo lại, rồi bước tiếp. **Gradient Descent** làm việc như vậy trên “đồi sai số”: nó đổi các hệ số `w` để sai số dự đoán giảm.

Với hồi quy tuyến tính, dự đoán của mọi hàng là `X @ w`. Một cách đo sai số là trung bình bình phương sai lệch. Vector `gradient` chỉ hướng sai số **tăng** nhanh nhất; muốn giảm sai số, ta đi ngược hướng đó:

$$w_{mới}=w_{cũ}-\eta\,gradient$$

`η` (eta) là **learning rate**, tức độ dài bước đi. Quá lớn có thể nhảy qua điểm tốt và dao động; quá nhỏ làm học rất chậm. `epoch` là một lượt đi qua tập dữ liệu khi cập nhật kiểu toàn bộ tập.

## Một vòng lặp minh họa

```python
import numpy as np

def gradient_descent(X, y, lr=0.1, epochs=1000):
    w = np.zeros(X.shape[1])
    for _ in range(epochs):
        error = X @ w - y
        gradient = X.T @ error / len(y)
        w -= lr * gradient
    return w
```

Trong đoạn mã này, `X` đã có một cột toàn số 1 ở đầu để học `w₀` (bias). Nếu quên cột 1, mô hình bị ép đi qua gốc tọa độ. Công thức gradient ở trên tương ứng với hàm mất mát `1/(2N) × tổng bình phương sai số`.

## Vì sao cần đổi thang đo?

Trong bài xe, `Volume` cỡ 1000–2000, còn CO₂ cỡ 90–110. Trong bài khách hàng, thu nhập cỡ 5–40 còn điểm tín dụng cỡ 500–800. Các cột lệch thang đo khiến một learning rate dùng chung dễ cập nhật thiếu cân đối. Có thể **chuẩn hóa** mỗi cột bằng trung bình và độ lệch chuẩn của tập train, hoặc dùng một quy tắc minh họa như chia điểm tín dụng cho 100. Cần áp dụng đúng phép đổi cho dữ liệu mới.

## Tự kiểm tra

Nếu sai số tăng sau nhiều vòng, đừng chỉ tăng số epoch. Hãy kiểm tra thứ tự cột, dấu trừ trong công thức cập nhật, thang đo đầu vào và learning rate. In vài giá trị sai số theo epoch để biết mô hình đang giảm, dao động hay phát nổ.

**Nguồn học thêm:** [Lộ trình Gradient Descent trên OLM](https://olm.vn/bg/tri-tue-nhan-tao). Tùng thông báo có bài nộp Gradient Descent tuần 2 trên CST.
