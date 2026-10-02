# Thực hành Logistic Regression với 2 đặc trưng

**Mục tiêu:** Đọc notebook Tùng gửi, in hệ số sau huấn luyện và tính đúng xác suất vỡ nợ của khách hàng mới.

## Bài Tùng gửi cho nhóm

Notebook Google Colab về Logistic Regression đặt câu hỏi: hiển thị giá trị các tham số sau huấn luyện; với khách có **thu nhập 32** và **điểm tín dụng 400**, mô hình dự đoán bao nhiêu phần trăm khả năng vỡ nợ; đồng thời đánh giá sai số trên dữ liệu thật.

[Mở notebook Colab được chia sẻ trong nhóm](https://colab.research.google.com/drive/1UOhgooUFajbnTgdZHw5-7nmkOeNWBzFk?usp=sharing). Nếu Google yêu cầu quyền, dùng tài khoản được cấp quyền trong lớp. Bài học này vẫn có thể đọc mà không mở notebook.

## Làm chậm từng bước để tránh sai

1. Xác định thứ tự hai cột trong notebook: `[income, credit_score]` hay `[credit_score, income]`. Hai số `[32, 400]` chỉ đúng nếu thứ tự là thu nhập trước, điểm sau.
2. Tìm dòng đổi thang đo. Nếu `credit_score` được chia 100 khi train, khách mới phải nhập `[32, 4.0]`, không phải `[32, 400]`.
3. Sau `fit`, in `intercept_` và `coef_`. `intercept_` là bias, `coef_` chứa trọng số theo đúng thứ tự cột của `X`.
4. In `model.classes_`; đọc `predict_proba` theo đúng **nhãn vỡ nợ** của notebook. Nếu `0 = vỡ nợ`, lấy cột xác suất tương ứng nhãn 0. Nếu notebook dùng quy ước khác, làm theo quy ước ấy và viết rõ trong bài.
5. Đánh giá trên mẫu có nhãn thật chưa dùng train. Báo tỷ lệ sai, không chỉ một xác suất của khách mới.

```python
# Giả sử X_new đã được đổi thang đo y hệt dữ liệu train.
print('Lớp:', model.classes_)
print('Bias:', model.intercept_)
print('Trọng số:', model.coef_)
proba = model.predict_proba(X_new)[0]
for label, value in zip(model.classes_, proba):
    print(f'P(y={label}) = {value:.2%}')
```

## Lưu ý quan trọng

Không thể trả lời bằng một con số phần trăm chính xác chỉ từ `(32,400)`. Còn cần **trọng số đã học, thứ tự cột, phép chuẩn hóa và ý nghĩa nhãn**. Nếu hai bạn cho ra hai tỷ lệ khác nhau, hãy so bốn điều này trước khi tranh luận về thuật toán.
