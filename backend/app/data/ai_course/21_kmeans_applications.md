# Bài 5: K-means dùng để làm gì với ảnh?

**Mục tiêu:** Nêu được cách biến ảnh thành điểm dữ liệu và hiểu ba ứng dụng minh họa của K-means: gom ảnh, chia vùng và nén màu.

## Một bức ảnh cũng có thể biến thành hàng số

Ảnh xám 28 × 28 pixel có 784 giá trị. Ta có thể xếp các hàng pixel nối tiếp nhau để biến ảnh thành một vector 784 chiều. Khi làm vậy, K-means không “nhìn” chữ số như con người; nó chỉ so sánh các vector số theo khoảng cách.

Với ảnh màu, mỗi pixel có thể có ba giá trị đỏ, lục, lam. Ảnh 100 × 100 khi đó được biểu diễn bằng 30.000 số nếu trải phẳng toàn bộ pixel. Cách đơn giản này làm mất thông tin pixel nào đứng cạnh pixel nào; nó chỉ hữu ích như một ví dụ nhập môn.

## Ba ứng dụng để hình dung

### 1. Gom các ảnh chữ số gần nhau

Nếu bỏ nhãn 0–9, K-means vẫn có thể chia các vector ảnh thành `k` nhóm. Ta có thể xem vài ảnh trong từng nhóm để hiểu chúng giống nhau ở nét nào. Một cụm không nhất thiết tương ứng đúng một chữ số: hai kiểu viết số 7 có thể khác nhau, còn một số 1 viết nghiêng có thể gần cụm khác.

### 2. Tách vùng trong ảnh

Mỗi pixel có thể được mô tả bằng màu của nó, đôi khi thêm vị trí `(x, y)`. K-means gom các pixel gần nhau rồi tô cùng màu, tạo vùng thô trong ảnh. Nếu chỉ dùng màu, hai vùng xa nhau nhưng cùng màu có thể bị gộp; thêm vị trí giúp giữ cấu trúc không gian tốt hơn.

### 3. Nén số màu

Muốn giảm số màu của ảnh, chọn `k` màu đại diện. Mỗi pixel được thay bằng màu tâm cụm gần nhất. Nếu `k=16`, ảnh chỉ còn dùng tối đa 16 màu đại diện. Đổi lại, màu gốc bị xấp xỉ; viền có thể thô hơn và sắc chuyển mượt có thể xuất hiện vệt.

## Không nhầm cụm với nhãn đúng

K-means không biết “đây là số 4” hoặc “đây là cái cây”. Nếu sau này có nhãn thật, ta có thể dùng nhãn đó để **đánh giá** cụm, nhưng không được đưa đáp án test vào lúc tạo cụm rồi tuyên bố thuật toán tự tìm được chúng.

Một quy trình thử nghiệm gọn là: xác định mục tiêu, chọn biểu diễn ảnh, cân nhắc chuẩn hóa pixel, thử vài `k`, xem hình ảnh sau gom nhóm và so độ méo sau nén. Luôn lưu ảnh gốc để đối chiếu chất lượng.

## Tự kiểm tra

Trong nén ảnh với `k=4`, thuật toán được phép giữ tối đa bao nhiêu màu đại diện? **Bốn.** K-means có tự biết cụm thứ hai là “chữ số 2” không? **Không; nhãn đó chỉ là cách con người diễn giải sau khi xem các mẫu.**

**Nguồn tham khảo:** [Bài 5 về ứng dụng K-means](https://machinelearningcoban.com/).
