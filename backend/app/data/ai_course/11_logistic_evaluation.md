# Thực hành Logistic Regression với 8 đặc trưng

**Mục tiêu:** Đọc đúng bài dự đoán vỡ nợ nhiều biến và đánh giá mô hình bằng tập test, accuracy và ma trận nhầm lẫn.

## Tám cột đầu vào thầy nêu

| Vị trí | Đặc trưng | Hiểu đơn giản |
| --- | --- | --- |
| 0 | `Income` | Thu nhập |
| 1 | `Age` | Tuổi |
| 2 | `Loan_Amount` | Số tiền vay |
| 3 | `Credit_Score` | Điểm tín dụng |
| 4 | `Years_Employed` | Số năm làm việc |
| 5 | `Debt_To_Income` | Tỷ lệ nợ so với thu nhập |
| 6 | `Num_Credit_Cards` | Số thẻ tín dụng |
| 7 | `Prior_Defaults` | Số lần vỡ nợ trước đây |

Theo tin nhắn trong nhóm, **`y=1` là không vỡ nợ; `y=0` là vỡ nợ**. `X_train` phải có 8 cột và `X_test` cũng phải có đúng 8 cột theo **cùng thứ tự**. Nếu đổi chỗ tuổi và thu nhập, chương trình có thể vẫn chạy nhưng kết quả sai ý nghĩa.

## Bài tập theo thứ tự

1. Viết dạng mô hình: `z = w₀ + w₁Income + … + w₈Prior_Defaults`, rồi `P(y=1|X) = sigmoid(z)` theo quy ước trên.
2. Chỉ dùng `X_train, y_train` để `fit`. Nếu chuẩn hóa, học phép chuẩn hóa trên train rồi biến đổi test bằng đúng bộ đã học.
3. In `intercept_`, `coef_`, `classes_` và giải thích vì sao có 1 bias, 8 trọng số.
4. Dự đoán `X_test`, so với `y_test`, tính `accuracy = số đúng / tổng số test`.
5. In ma trận nhầm lẫn để biết sai ở nhóm nào. Trong bài vỡ nợ, bỏ sót người thật sự vỡ nợ có thể nghiêm trọng hơn dự đoán nhầm một người không vỡ nợ.

```python
from sklearn.metrics import accuracy_score, confusion_matrix

y_pred = model.predict(X_test)
print('Accuracy:', accuracy_score(y_test, y_pred))
print('Ma trận nhầm lẫn, thứ tự nhãn [0, 1]:')
print(confusion_matrix(y_test, y_pred, labels=[0, 1]))
```

**Cách đọc:** `confusion_matrix(..., labels=[0,1])` có **hàng là nhãn thật**, **cột là nhãn dự đoán**. Ô `[0,1]` là người **thật sự vỡ nợ** nhưng bị dự đoán **không vỡ nợ**. Đây là lỗi cần nhìn riêng thay vì chỉ báo một con số accuracy.

## Tự kiểm tra

Nếu test có 20 người và mô hình đúng 17 người, accuracy là `17/20 = 85%`. Bạn vẫn phải xem 3 người sai thuộc nhóm nào. Không có số trong câu hỏi này cho phép suy ra accuracy thật của notebook; phải chạy mô hình trên dữ liệu của notebook.

**Nguồn:** Yêu cầu Logistic Regression 8 cột trong tin nhắn Tùng ở nhóm lớp; [hướng dẫn Logistic Regression của scikit-learn](https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression).
