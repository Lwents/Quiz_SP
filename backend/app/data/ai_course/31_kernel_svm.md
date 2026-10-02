# Bài 21: Kernel giúp SVM xử lý đường biên cong

**Mục tiêu:** Hiểu ý tưởng ánh xạ dữ liệu sang không gian mới, kernel trick và hai tham số cần để ý khi dùng kernel RBF.

## Khi đường thẳng không đủ

Nếu điểm đỏ bao thành vòng quanh điểm xanh, không có một đường thẳng nào chia hai lớp hoàn hảo. Ta có thể tạo đặc trưng mới giúp hình dạng đó trở nên dễ tách hơn. Ví dụ khoảng cách tới tâm biến các điểm thành số: điểm trong vòng có khoảng cách nhỏ, điểm ngoài vòng có khoảng cách lớn.

Vấn đề là số chiều mới có thể rất lớn. **Kernel trick** cho phép thuật toán dùng phép đo độ giống nhau giữa hai điểm như thể đã ánh xạ chúng sang không gian mới, mà không nhất thiết tính và lưu từng tọa độ mới.

## Kernel là một thước đo độ giống có cấu trúc

Với SVM, hàm kernel thay tích vô hướng giữa hai điểm bằng một phép tính khác. Kernel tuyến tính phù hợp với biên thẳng. Kernel đa thức tạo ảnh hưởng của các tổ hợp bậc cao. Kernel RBF cho phép biên cong linh hoạt theo khoảng cách.

RBF gần 1 khi hai điểm sát nhau và nhỏ dần khi chúng xa. Ta có thể nghĩ nó hỏi: “Hai mẫu này giống nhau tới mức nào?”. SVM kết hợp các độ giống đó với support vectors để tạo quyết định.

## RBF có thể quá đơn giản hoặc quá uốn lượn

- Tham số `gamma` nhỏ khiến ảnh hưởng của một mẫu lan xa, ranh giới thường mượt hơn.
- `gamma` lớn làm mỗi điểm chỉ ảnh hưởng vùng rất gần, ranh giới có thể uốn quanh từng điểm và overfit.
- `C` vẫn điều chỉnh mức phạt lỗi train như bài soft margin.

Hai tham số tương tác, nên thử chúng bằng validation/cross-validation thay vì chỉnh theo test. Chuẩn hóa đặc trưng trước khi dùng RBF vì khoảng cách phụ thuộc thang đo.

## Tự kiểm tra

Kernel trick hữu ích ở đâu? **Khi muốn mô hình hóa ranh giới phi tuyến mà không cần tính tường minh mọi tọa độ của không gian biến đổi.** Nếu gamma rất lớn và ranh giới ôm sát từng điểm train, nên nghi ngờ điều gì? **Overfitting.**

**Nguồn tham khảo:** [Bài 21 về Kernel SVM](https://machinelearningcoban.com/) và [tài liệu SVM của scikit-learn](https://scikit-learn.org/stable/modules/svm.html).
