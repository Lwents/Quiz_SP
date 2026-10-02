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

## Ví dụ một chiều: tìm con đường ở giữa

Giả sử các điểm lớp −1 nằm tại x=1 và x=2, còn lớp +1 tại x=4 và x=5. Ranh giới ở x=3 tách hai nhóm. Có thể viết điểm có dấu là f(x)=x−3: nếu f(x)<0 dự đoán lớp −1, nếu f(x)>0 dự đoán lớp +1.

Điểm x=2 nằm cách ranh giới 1 đơn vị về bên trái; x=4 cách 1 đơn vị về bên phải. Đây là hai điểm sát nhất nên là support vectors. Điểm x=1 hay x=5 ở xa hơn và không ép ranh giới dịch chuyển trong ví dụ này. Chiều rộng lề giữa hai đường biên song song là 1+1=2 đơn vị.

SVM chuẩn hóa đường biên để các support vector thỏa yᵢf(xᵢ)=1. Nếu đặt w=1 và b=−3, x=2 có nhãn −1 nên (−1)×(−1)=1; x=4 có nhãn +1 nên (+1)×(+1)=1. Cách chuẩn hóa giúp so sánh bài toán, còn khoảng cách hình học phụ thuộc cả độ dài vector trọng số.

## Khi đọc kết quả SVM

Hãy kiểm tra nhãn được mã hóa đúng, đặc trưng có cùng thang đo hợp lý và điểm lề nằm đúng phía. SVM không tự tạo xác suất đáng tin: điểm số quyết định thường là khoảng cách có dấu đã được co giãn, không phải phần trăm chắc chắn. Muốn dùng xác suất, cần bước hiệu chỉnh riêng và kiểm tra nó trên dữ liệu chưa dùng để huấn luyện.

## Tự kiểm tra

Những điểm nào quyết định vị trí biên nhiều nhất? **Các điểm gần lề nhất, gọi là support vectors.** Nếu tăng lề nhưng đặt đường lệch hẳn về một lớp, đó có còn là mục tiêu SVM? **Không; lề được xét giữa các lớp theo tiêu chí tối ưu, cần biểu diễn cả hai phía.**

**Nguồn tham khảo:** [Bài 19 về Support Vector Machine](https://machinelearningcoban.com/) và [tài liệu SVM của scikit-learn](https://scikit-learn.org/stable/modules/svm.html).
