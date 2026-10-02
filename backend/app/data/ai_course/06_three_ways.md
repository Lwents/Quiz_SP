# Thực hành tuần 2: so sánh ba cách giải hồi quy

**Mục tiêu:** Biết khi nào dùng công thức ma trận, thư viện và Gradient Descent; kiểm tra cả ba cách có dự đoán tương tự hay không.

## Cùng một bài toán, ba con đường

Bài CO₂ có dữ liệu `X` và `y`. Ta có thể tìm trọng số bằng **giả nghịch đảo ma trận** (`pinv`), để **scikit-learn** tự ước lượng, hoặc tự lặp **Gradient Descent**. Chúng cùng tối ưu sai số bình phương trong ví dụ cơ bản, nhưng cách tính khác nhau.

| Cách | Ý tưởng | Khi học cần nhìn gì? |
| --- | --- | --- |
| `pinv` | Tính nghiệm từ toàn bộ bảng dữ liệu | Nhớ thêm cột 1 để có bias |
| `LinearRegression` | Thư viện giải bài toán hồi quy | Đọc `intercept_`, `coef_` và thứ tự cột |
| Gradient Descent | Sửa trọng số lặp từng bước | Theo dõi learning rate, chuẩn hóa và số epoch |

Notebook thực hành ngày 18/09 trong Downloads có **hai bài**: dự đoán CO₂ từ `Volume, Weight` và ước lượng cân nặng từ chiều cao. Ở mỗi bài, nó in trọng số và một dự đoán bằng cả ba cách. Đây là cách kiểm tra tốt: nếu một cách cho kết quả quá khác, hãy xem phép chuẩn hóa và cột bias trước khi kết luận thuật toán sai.

## Làm bài CO₂ mà không lẫn cột

1. Viết ra giấy `X[:,0] = Volume`, `X[:,1] = Weight` theo notebook đang dùng.
2. Đầu vào xe mới là `[2300, 1300]` **theo đúng hai cột ấy**. Nếu bạn đang làm theo W3Schools, trang đó đặt cột là `[Weight, Volume]`; phải đổi thứ tự cho khớp.
3. In ba vector trọng số và ba giá trị dự đoán. Chênh lệch vài chữ số thập phân có thể do số vòng lặp; chênh lệch lớn thường là lỗi thứ tự cột hoặc chưa quy đổi trọng số sau chuẩn hóa.
4. Giữ lại vài xe làm test; so dự đoán với CO₂ thật để đánh giá, không chỉ xem một xe mới.

## Câu hỏi tự trả lời

Vì sao không nên nói “mô hình thứ ba tốt hơn” chỉ vì nó ra một số CO₂ đẹp hơn? Vì **chưa có nhãn thật của xe mới** để biết số nào gần thực tế. Ta cần so trên một tập test có đáp án.

**Liên hệ lớp:** Phạm Thọ Hoàn gửi bài hồi quy nhiều biến; Tùng nhắc nộp bài Gradient Descent trên CST trước buổi học kế tiếp. [Ví dụ W3Schools](https://www.w3schools.com/python/python_ml_multiple_regression.asp).
