# Bài 33: Đánh giá bộ phân loại ngoài accuracy

**Mục tiêu:** Tính precision, recall, specificity và F1 từ ma trận nhầm lẫn, rồi chọn chỉ số theo hậu quả của từng kiểu sai.

## Accuracy có thể giấu lỗi nghiêm trọng

Giả sử trong 100 giao dịch có 12 giao dịch gian lận. Mô hình luôn nói “không gian lận” đạt 88% accuracy nhưng bắt được 0 giao dịch xấu. Cần mở ma trận nhầm lẫn:

|  | Dự đoán gian lận | Dự đoán bình thường |
| --- | ---: | ---: |
| **Thật sự gian lận** | TP = 8 | FN = 4 |
| **Thật sự bình thường** | FP = 2 | TN = 86 |

Trong bảng có 100 dòng, mô hình đúng `8+86=94` dòng, nên accuracy là 94%.

## Bốn chỉ số

- **Precision** = `TP/(TP+FP)` = `8/10 = 80%`: trong những giao dịch bị gắn cờ, bao nhiêu là gian lận thật?
- **Recall** = `TP/(TP+FN)` = `8/12 ≈ 66.7%`: trong mọi giao dịch gian lận, mô hình bắt được bao nhiêu?
- **Specificity** = `TN/(TN+FP)` = `86/88 ≈ 97.7%`: trong giao dịch bình thường, mô hình nhận đúng bao nhiêu?
- **F1** = trung bình điều hòa của precision và recall, khoảng `72.7%` trong ví dụ: nó thấp khi một trong hai chỉ số thấp.

`TP` là dương thật; `FP` là báo nhầm; `FN` là bỏ sót; `TN` là âm thật. Luôn ghi rõ lớp dương và thứ tự hàng/cột của ma trận để người khác không đọc ngược.

## Chọn chỉ số theo việc cần làm

Nếu bỏ sót nguy hiểm, như không phát hiện sự cố, ưu tiên xem recall. Nếu mỗi cảnh báo đều tốn công điều tra, precision cũng quan trọng. Thay đổi ngưỡng thường tạo đánh đổi giữa hai chỉ số. ROC-AUC tóm tắt khả năng xếp hạng dương cao hơn âm qua nhiều ngưỡng, nhưng không cho biết ngưỡng nào nên dùng trong vận hành.

Hãy xem thêm kết quả theo từng nhóm, baseline đơn giản, cách chia dữ liệu và chi phí lỗi. Không có một chỉ số duy nhất phù hợp với mọi sản phẩm.

## Tính F1 và hiểu hậu quả của ngưỡng

Trong bảng phía trên, precision=8/(8+2)=0.8 và recall=8/(8+4)=2/3. F1=2×precision×recall/(precision+recall)≈0.727, tức khoảng 72.7%. Trung bình điều hòa thấp nếu một trong hai chỉ số thấp, nên F1 hữu ích khi muốn cân bằng precision và recall; nó không tính trực tiếp chi phí tiền bạc hay mức độ nghiêm trọng của từng lỗi.

Nếu hạ ngưỡng để gắn cờ nhiều giao dịch hơn, thường bắt thêm gian lận nên recall tăng, nhưng báo nhầm cũng có thể tăng làm precision giảm. Nếu nâng ngưỡng, cảnh báo ít hơn và thường chính xác hơn, nhưng có thể bỏ sót. Không có ngưỡng tốt nhất chung: nhóm vận hành cần quyết định họ chịu được bao nhiêu ca báo nhầm và bỏ sót.

## Báo cáo để người khác kiểm tra được

Ghi rõ lớp dương, ma trận nhầm lẫn, ngưỡng, cách chia tập và số mẫu. Nếu dữ liệu lệch lớp, so với baseline luôn đoán lớp phổ biến. Khi chọn ngưỡng, dùng validation; tập test chỉ dùng báo cáo cuối. Nếu lớp dương hiếm, precision-recall curve thường cho thấy đánh đổi thực tế rõ hơn accuracy đơn lẻ.

## Tự kiểm tra

Có 20 ca bệnh thật, mô hình tìm được 15. Recall là bao nhiêu? **15/20 = 75%.** Mô hình báo 18 ca dương nhưng chỉ 15 đúng; precision là bao nhiêu? **15/18 ≈ 83.3%.**

**Nguồn tham khảo:** [Bài 33 về đánh giá hệ thống phân lớp](https://machinelearningcoban.com/) và [tài liệu đánh giá mô hình của scikit-learn](https://scikit-learn.org/stable/modules/model_evaluation.html).
