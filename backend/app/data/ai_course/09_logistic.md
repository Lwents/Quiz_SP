# Logistic Regression: dự đoán xác suất của một nhãn

**Mục tiêu:** Hiểu vì sao Logistic Regression là bài toán phân loại, ý nghĩa của sigmoid và cách đọc đúng xác suất.

## PLA còn thiếu điều gì?

PLA cho một **điểm** nằm phía nào của đường phân chia. Người học thường hỏi thêm: mô hình tự tin đến mức nào? Logistic Regression lấy điểm tuyến tính `z = w₀ + w₁x₁ + …` rồi đưa qua hàm **sigmoid** để nhận số trong khoảng từ 0 đến 1:

$$p=\frac{1}{1+e^{-z}}$$

Nếu `z = 0`, `p = 0,5`. Nếu `z` rất dương, `p` gần 1. Nếu `z` rất âm, `p` gần 0. Dù tên có chữ “Regression”, mô hình này thường dùng để **phân loại**; `p` là xác suất ước lượng cho **một nhãn được quy ước trước**, không phải lượng CO₂ hay cân nặng.

## Đừng nhầm ý nghĩa nhãn

Trong tin bài Logistic Regression của lớp, **`y = 1` là không bị vỡ nợ**, **`y = 0` là vỡ nợ**. Do đó `P(y=1)` là xác suất *không* vỡ nợ. Nếu câu hỏi đòi “khả năng vỡ nợ”, phải đọc **`P(y=0)`**. Với bài PLA trước, nhãn lại là `+1/-1` cho duyệt/từ chối. Hai bài không dùng chung quy ước.

`sklearn` sắp xếp xác suất theo `model.classes_`. Đừng mặc định “cột thứ hai luôn là vỡ nợ”. Kiểm tra nhãn trước:

```python
classes = list(model.classes_)
probabilities = model.predict_proba(X_new)[0]
print(dict(zip(classes, probabilities)))
```

Nếu `classes = [0, 1]` và đầu ra là `[0.27, 0.73]`, theo quy ước bài này mô hình ước lượng **27% vỡ nợ**, **73% không vỡ nợ**. Đây là kết quả minh họa để đọc mảng; không phải kết quả cho khách nào trong đề.

## Từ xác suất sang quyết định

Ngưỡng thường dùng là `0,5`: xác suất nhãn dương từ 0,5 trở lên thì dự đoán nhãn dương. Trong bối cảnh tín dụng, ngưỡng có thể phải điều chỉnh theo chi phí của hai loại sai sót. Accuracy cao chưa đủ để quyết định ngưỡng.

**Nguồn:** [Lộ trình Logistic Regression trên OLM](https://olm.vn/bg/tri-tue-nhan-tao) và [giải thích mô hình trong tài liệu scikit-learn](https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression).
