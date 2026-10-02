# Học và kiểm tra: vì sao cần tách dữ liệu?

**Mục tiêu:** Phân biệt dữ liệu huấn luyện với dữ liệu kiểm thử, tránh nhìn trước đáp án và hiểu độ chính xác có nghĩa gì.

## Hình dung như ôn thi

Bạn làm 20 bài mẫu rồi nhớ đáp án. Nếu được kiểm tra lại bằng đúng 20 bài đó, điểm cao chưa chứng minh bạn giải được bài mới. Mô hình học máy cũng vậy. **Tập huấn luyện** (`train`) dùng để tìm tham số. **Tập kiểm thử** (`test`) được để riêng cho lần đánh giá cuối.

Trong bài PLA thầy giao, mô hình học từ **20 khách hàng**, rồi thử trên **10 khách hàng độc lập**. Không dùng nhãn của 10 khách hàng kiểm thử để sửa mô hình trước khi báo điểm kiểm thử.

## Quy trình ngắn nhất

1. Xác định các cột đầu vào `X` và cột nhãn `y`.
2. Tách các hàng thành `X_train`, `y_train`, `X_test`, `y_test`.
3. Nếu cần chuẩn hóa thang đo, **học** giá trị trung bình/độ lệch chuẩn trên `X_train`; áp dụng lại phép đổi đó cho `X_test`.
4. Gọi `fit(X_train, y_train)` để học.
5. Gọi `predict(X_test)` rồi so với `y_test`.

Lý do của bước 3: lấy trung bình của cả tập kiểm thử trước khi học sẽ đưa thông tin từ bài kiểm tra vào quá trình huấn luyện. Đó là **rò rỉ dữ liệu**. Với bài thực hành đã cho sẵn quy tắc “chia điểm tín dụng cho 100”, ta dùng cùng một quy tắc cho cả hai tập.

## Độ chính xác là gì?

Nếu mô hình dự đoán đúng 8 trong 10 khách hàng kiểm thử, `accuracy_test = 8/10 = 80%`. Đây là tỷ lệ dự đoán đúng **trên đúng 10 mẫu ấy**; không phải lời hứa rằng mọi khách hàng mới sẽ đúng 80%.

Ví dụ có 100 khách, 95 người được duyệt. Một mô hình luôn nói “duyệt” đã đạt 95% accuracy nhưng có thể bỏ sót toàn bộ 5 trường hợp quan trọng. Vì vậy, bài phân loại còn xem ma trận nhầm lẫn, precision và recall. Ta sẽ giải thích ở bài đánh giá Logistic Regression.

## Tự kiểm tra

Bạn chạy mô hình 10 lần trên tập test, mỗi lần sửa tham số cho điểm test cao hơn. Tập ấy có còn là kiểm thử độc lập không? **Không.** Nó đã trở thành tập dùng để lựa chọn mô hình. Cần một tập kiểm thử mới nếu muốn ước lượng kết quả cuối cùng.

**Liên hệ bài trên lớp:** Bài thực hành PLA tuần 3 yêu cầu tách 20 mẫu train và 10 mẫu test; phần Logistic Regression cũng hỏi kết quả trên `X_test, y_test`.
