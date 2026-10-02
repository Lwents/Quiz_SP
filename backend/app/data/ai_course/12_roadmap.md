# Sau các bài thực hành: bản đồ phần còn lại của môn AI

**Mục tiêu:** Nhìn thấy các chủ đề tiếp theo trong khóa tham khảo OLM và biết chúng liên hệ với những bài đã học như thế nào.

Đến đây bạn đã biết một nhánh của AI là **học máy có giám sát**: có ví dụ và nhãn thật, mô hình học từ đó. Khóa Trí tuệ nhân tạo trên OLM còn giới thiệu các nhánh dưới đây. Đây là **lộ trình đọc thêm**, chưa phải yêu cầu nộp bài mà thầy thông báo trong nhóm đến thời điểm biên soạn.

## 1. Tìm kiếm lời giải

Giả sử đi từ phòng A đến phòng B trong một tòa nhà. Mỗi phòng là một **trạng thái**, lối đi là một **cạnh**. **BFS** khám phá các phòng gần trước, phù hợp khi cần đường ít bước nhất và mỗi bước có cùng chi phí. **DFS** đi sâu theo một nhánh trước rồi quay lại, thường tốn ít bộ nhớ hơn nhưng không đảm bảo đường ít bước nhất. **A\*** dùng thêm một ước lượng khoảng cách còn lại (heuristic) để ưu tiên hướng hứa hẹn. Bài toán và điều kiện của nó quyết định thuật toán nào phù hợp.

## 2. Phân cụm khi không có nhãn

Nếu có bảng khách hàng nhưng **không có cột “nhóm”**, không thể dùng trực tiếp PLA để học nhãn. **K-means** thử chia các điểm thành `k` nhóm dựa trên độ gần. Chọn `k`, đổi thang đo các cột và xem nhóm có ý nghĩa hay không là việc của người phân tích; số nhóm không tự là “đáp án đúng”.

## 3. Nhiều hơn hai nhãn

Logistic Regression nhị phân xử lý hai nhãn. Khi cần nhận dạng ba hoặc nhiều loại, **Softmax** chuyển một vector điểm thành các xác suất cộng lại bằng 1. Điểm số, nhãn và hàm mất mát đều mở rộng theo số lớp.

## 4. Mạng nhiều lớp

Một đường thẳng không tách được mọi bộ dữ liệu. **Multi-layer Perceptron (MLP)** nối nhiều lớp tính toán và hàm phi tuyến để học ranh giới phức tạp hơn. Đổi lại cần chú ý thang đo, số tham số và việc mô hình học thuộc dữ liệu train.

## Cách chọn bài tiếp theo

| Nếu bạn muốn... | Bắt đầu từ... |
| --- | --- |
| Tìm đường hoặc giải câu đố trạng thái | BFS, DFS, A* |
| Gom mẫu khi không có nhãn | K-means |
| Phân loại nhiều nhãn | Softmax |
| Học ranh giới phi tuyến | MLP |

**Lộ trình nguồn:** [Khóa Trí tuệ nhân tạo trên OLM](https://olm.vn/bg/tri-tue-nhan-tao). Hãy đọc phần học máy theo thứ tự hồi quy → Gradient Descent → Perceptron → Logistic, rồi mới sang Softmax và MLP.
