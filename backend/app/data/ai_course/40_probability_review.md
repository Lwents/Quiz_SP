# Bài 30: Ôn xác suất để hiểu mô hình

**Mục tiêu:** Đọc được xác suất có điều kiện và dùng Bayes để hiểu vì sao một kết quả dương tính chưa chắc đồng nghĩa với khả năng bệnh cao.

## Xác suất có điều kiện hỏi gì?

`P(A)` là xác suất sự kiện A xảy ra. `P(A | B)` là xác suất A **khi đã biết** B xảy ra. Ví dụ, `P(mưa)` khác với `P(mưa | trời nhiều mây)`: thông tin mây làm thay đổi dự đoán.

Hai sự kiện độc lập nếu biết một sự kiện xảy ra không làm đổi xác suất sự kiện kia. Trong học máy, không nên mặc định các đặc trưng độc lập; đó là một giả định cần nói rõ.

## Bayes đảo chiều câu hỏi

Ta thường biết một kết quả đo và muốn suy ra nguyên nhân. Bayes nối xác suất trước khi thấy kết quả với độ thường gặp của kết quả trong từng nhóm:

```text
P(A | B) = P(B | A) × P(A) / P(B)
```

Ví dụ sàng lọc một bệnh hiếm gặp: trong 10.000 người, giả sử 1% mắc bệnh. Xét nghiệm bắt được 90% người bệnh và báo dương tính giả ở 5% người khỏe.

| Nhóm | Số người | Kết quả dương tính dự kiến |
| --- | ---: | ---: |
| Mắc bệnh | 100 | 90 |
| Khỏe | 9.900 | 495 |

Trong 585 kết quả dương tính, chỉ khoảng 90 người mắc bệnh: `90 / 585 ≈ 15.4%`. Xét nghiệm khá nhạy, nhưng bệnh hiếm nên số dương tính giả vẫn nhiều hơn số dương tính thật.

## Vì sao phải nhớ tỷ lệ ban đầu?

`P(mắc bệnh)` là **base rate** (tỷ lệ nền). Nếu chỉ nhìn “xét nghiệm đúng 90%” mà bỏ tỷ lệ bệnh trong cộng đồng, ta có thể hiểu sai ý nghĩa một kết quả cá nhân. Cùng nguyên tắc áp dụng cho phát hiện gian lận hiếm hoặc thư rác trong hòm thư ít thư rác.

## Tự kiểm tra

Nếu lớp dương tính rất hiếm, một mô hình báo dương tính có chắc người ấy thuộc lớp dương không? **Không; cần biết tỷ lệ nền và tỷ lệ báo sai/bắt đúng của mô hình.** `P(A|B)` hỏi xác suất nào? **Xác suất A khi đã biết B xảy ra.**

**Nguồn tham khảo:** [Bài 30 ôn xác suất](https://machinelearningcoban.com/).
