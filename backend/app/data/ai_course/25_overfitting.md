# Bài 15: Nhận biết và giảm overfitting

**Mục tiêu:** Phân biệt học thuộc với học được quy luật, đọc chênh lệch train/validation và chọn cách xử lý mà không dùng test để tinh chỉnh.

## Điểm cao trên bài đã luyện chưa đủ

Một học sinh có thể thuộc lời giải của bài mẫu nhưng lúng túng trước đề mới. Mô hình gặp **overfitting** khi bám quá sát những chi tiết riêng, nhiễu hoặc lỗi của tập train nên dự đoán kém trên dữ liệu chưa từng thấy.

Mô hình quá đơn giản có thể **underfit**: làm kém cả trên train lẫn dữ liệu mới vì chưa biểu diễn được quy luật. Mục tiêu là mô hình nắm được mẫu chung, không phải ép nó trở nên phức tạp nhất.

## Đọc dấu hiệu bằng hai tập

| Kết quả | Train | Validation | Diễn giải thường gặp |
| --- | --- | --- | --- |
| Kém ở cả hai | Thấp | Thấp | Có thể underfit hoặc đặc trưng chưa đủ |
| Lệch rõ | Rất cao | Thấp hơn nhiều | Có thể overfit hoặc train/validation khác phân phối |
| Tốt gần nhau | Cao | Cao tương tự | Mô hình có vẻ khái quát tốt hơn; vẫn cần test độc lập |

Validation dùng để chọn mô hình, siêu tham số và thời điểm dừng. **Test** nên giữ riêng để đánh giá sau cùng. Nếu thử đi thử lại trên test rồi chọn kết quả cao nhất, test đã thành một phần của quá trình phát triển.

## Cách giảm overfitting

1. Thu thập thêm dữ liệu đại diện hoặc tăng cường dữ liệu theo phép biến đổi hợp lệ.
2. Dùng mô hình ít phức tạp hơn hoặc giảm số đặc trưng không cần thiết.
3. Thêm regularization: phạt trọng số quá lớn để mô hình bớt uốn lượn theo từng mẫu.
4. Dừng huấn luyện khi validation không còn cải thiện (early stopping).
5. Kiểm tra rò rỉ dữ liệu, trùng bản ghi và cách chia tập trước khi đổi thuật toán.

Dropout là một kỹ thuật thường dùng trong mạng nơ-ron, nhưng không phải thuốc chữa cho dữ liệu rò rỉ hoặc chia tập sai. Cần chẩn đoán nguyên nhân trước.

## Ví dụ

Một cây quyết định có thể tiếp tục tách cho tới khi mỗi lá chứa đúng một dòng train: điểm train gần như tuyệt đối nhưng cây đang ghi nhớ từng hồ sơ. Giới hạn độ sâu hoặc yêu cầu mỗi lá có nhiều mẫu hơn làm cây đơn giản lại; sau đó so sánh trên validation xem khả năng tổng quát có tăng không.

## Làm thử: chọn độ phức tạp bằng validation

Ba mô hình dự đoán cùng một dữ liệu cho kết quả loss sau:

| Mô hình | Loss train | Loss validation |
| --- | ---: | ---: |
| Đơn giản | 0.45 | 0.48 |
| Vừa | 0.18 | 0.24 |
| Rất phức tạp | 0.02 | 0.81 |

Mô hình rất phức tạp khớp train tốt nhất nhưng validation xấu nhất — dấu hiệu học thuộc hoặc tập train/validation khác nhau. Chọn mô hình “vừa” theo validation trong ví dụ này. Sau khi khóa lựa chọn, mới dùng test để ước lượng kết quả cuối.

Nếu chỉ có ít mẫu, `k`-fold cross-validation chia train thành `k` phần: mỗi lượt giữ một phần làm validation và huấn luyện trên `k−1` phần còn lại. Lấy trung bình các lượt giúp quyết định bớt phụ thuộc một lần chia, nhưng tốn nhiều lần huấn luyện. Test cuối vẫn cần giữ ngoài vòng lựa chọn.

## Ba kiểu regularization dễ hiểu

- **Early stopping:** dừng khi loss validation ngừng cải thiện; giữ trọng số ở thời điểm validation tốt nhất.
- **L2 / weight decay:** thêm hình phạt cho bình phương trọng số lớn, khuyến khích mô hình dùng hệ số vừa phải.
- **L1:** phạt trị tuyệt đối của trọng số; có thể đẩy một số hệ số về 0, tạo mô hình thưa hơn.

Regularization quá yếu không ngăn được việc học nhiễu; quá mạnh làm mô hình mất cả quy luật thật và underfit. Chọn cường độ trên validation.

## Tự kiểm tra

Train đạt 99%, validation đạt 65%. Nên khoe accuracy 99% không? **Không; cần tìm lý do chênh lệch và ưu tiên kết quả validation.** Nếu bạn chọn tham số bằng validation, tập nào nên để dành cho báo cáo cuối? **Test độc lập.**

**Nguồn tham khảo:** [Bài 15 về overfitting](https://machinelearningcoban.com/).
