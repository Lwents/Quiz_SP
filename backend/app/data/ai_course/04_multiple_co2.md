# Bài CO₂: hồi quy tuyến tính nhiều biến

**Mục tiêu:** Đọc đúng thứ tự cột của `X`, hiểu từng hệ số và thực hiện bài dự đoán CO₂ thầy giao.

## Từ một đầu vào sang hai đầu vào

Xe có **dung tích động cơ** và **khối lượng**. Mô hình hai đặc trưng là:

$$\widehat{CO_2}=w_0+w_1\times Volume+w_2\times Weight$$

Nếu có 10 xe, `X` là bảng `10 × 2`; `y` gồm 10 số CO₂. Một xe mới phải được nhập thành **một hàng có đúng hai số theo đúng thứ tự đã học**.

> **Cẩn thận thứ tự cột:** Ví dụ W3Schools tạo `X` theo `[Weight, Volume]`; notebook thực hành trong Downloads tạo `X1` theo `[Volume, Weight]`. Cùng cặp số `2300, 1300` sẽ có ý nghĩa khác nhau nếu đổi thứ tự. Hãy nhìn dòng tạo `X` trước khi gọi `predict`.

## Làm bài theo từng bước

1. Đọc ba cột dữ liệu: `Volume`, `Weight`, `CO2`. Không đưa cột `CO2` vào `X`, vì đó là đáp án cần dự đoán.
2. Tạo `X` từ **hai** cột đầu vào, `y` từ cột CO₂.
3. Huấn luyện mô hình và in `intercept_` (`w₀`) cùng `coef_` (`w₁,w₂`).
4. Dự đoán xe mới theo đúng thứ tự cột của bước 2.
5. Ghi rõ đơn vị: `Volume` thường là cm³, `Weight` là kg, CO₂ có thể là g/km theo bảng ví dụ.

```python
from sklearn.linear_model import LinearRegression

# Ví dụ nhỏ tự tạo; cột 0 là Volume, cột 1 là Weight.
X = [[1000, 790], [1200, 1160], [1500, 1140], [1600, 1150]]
y = [99, 95, 105, 99]
model = LinearRegression().fit(X, y)
print(model.intercept_, model.coef_)
print(model.predict([[2300, 1300]]))
```

Bốn dòng minh họa quá ít để kết luận khoa học; chúng chỉ giúp bạn thấy đầu vào và đầu ra của lệnh. Để làm bài thầy giao, dùng bảng đầy đủ trong notebook và báo rõ nguồn dữ liệu.

## Hệ số nói gì?

Khi `Volume` tăng 1 cm³ còn `Weight` giữ nguyên, dự đoán đổi `w₁` đơn vị CO₂. Khi `Weight` tăng 1 kg còn `Volume` giữ nguyên, dự đoán đổi `w₂`. Không được so độ lớn `w₁` và `w₂` như thể hai đơn vị đo giống nhau.

**Bài tự làm:** Trả lời bốn câu thầy gửi ngày 11/09: `X` có mấy chiều, nhãn `y` biểu diễn gì, hàm tuyến tính học được gồm các hệ số nào, và dự đoán vài xe mới ra sao. [Trang ví dụ W3Schools thầy chia sẻ](https://www.w3schools.com/python/python_ml_multiple_regression.asp).
