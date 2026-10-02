# Bài 19: SVM chọn đường biên có lề rộng

**Mục tiêu:** Đọc được đường phân chia, lề và support vectors, đồng thời hiểu vì sao SVM quan tâm các điểm sát ranh giới.

## Có nhiều đường tách hai nhóm

Vẽ các điểm xanh và đỏ lên mặt phẳng. Có thể có nhiều đường thẳng tách hai màu mà không mắc lỗi trên dữ liệu train. Chọn một đường nằm sát các điểm nhất có thể làm mô hình nhạy với nhiễu. **Support Vector Machine (SVM)** tìm đường biên sao cho lề — khoảng cách từ đường tới các điểm gần nhất của mỗi phía — rộng nhất có thể.

Các điểm gần lề nhất gọi là **support vectors**. Chúng “đỡ” vị trí đường biên. Điểm ở rất xa đường thường không quyết định hướng đường khi nghiệm đã ổn định.

## Hình dung lề như con đường giữa hai hàng nhà

Nếu hai dãy nhà nằm hai bên đường, ta muốn đặt con đường ở khoảng trống rộng nhất để xe ít nguy cơ va vào nhà. Lề rộng thường giúp dự đoán bền hơn trước thay đổi nhỏ của vị trí dữ liệu. Nhưng nếu hai lớp chồng lấn, không thể tách sạch bằng đường thẳng; bài kế tiếp sẽ cho phép vi phạm lề có kiểm soát.

Với dữ liệu hai chiều, đường là một đường thẳng. Với nhiều đặc trưng, ranh giới trở thành **siêu phẳng**. “Siêu phẳng” chỉ là tên tổng quát cho đường chia trong số chiều cao hơn.

## Hai lưu ý thực hành

1. **Chuẩn hóa đặc trưng:** SVM nhạy với thang đo. Nếu một cột có giá trị hàng nghìn và cột kia từ 0 đến 1, cột lớn có thể chi phối khoảng cách/hình học.
2. **Dữ liệu mới:** Ranh giới được học từ train; đánh giá trên test độc lập để biết nó có khái quát hay chỉ tách đẹp các điểm đã thấy.

SVM tuyến tính thích hợp khi ranh giới gần tuyến tính và số chiều vừa phải. Nếu cần ranh giới cong, có kernel; nếu lớp chồng lấn, dùng soft margin. Hai bài tiếp theo lần lượt xử lý hai tình huống đó.

## Tự kiểm tra

Những điểm nào quyết định vị trí biên nhiều nhất? **Các điểm gần lề nhất, gọi là support vectors.** Nếu tăng lề nhưng đặt đường lệch hẳn về một lớp, đó có còn là mục tiêu SVM? **Không; lề được xét giữa các lớp theo tiêu chí tối ưu, cần biểu diễn cả hai phía.**

**Nguồn tham khảo:** [Bài 19 về Support Vector Machine](https://machinelearningcoban.com/) và [tài liệu SVM của scikit-learn](https://scikit-learn.org/stable/modules/svm.html).
