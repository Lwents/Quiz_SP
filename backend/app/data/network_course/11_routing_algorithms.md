# Tìm đường: Dijkstra, Bellman–Ford và BGP

**Mục tiêu:** Tự cập nhật được nhãn một bước của Dijkstra, hiểu khác biệt giữa thông tin toàn mạng và thông tin từ hàng xóm, biết BGP giải quyết lớp bài toán nào.

Định tuyến là chọn các chặng mà gói tin đi qua để tới đích. Mỗi liên kết có thể có **trọng số**: độ trễ, chi phí, số hop hoặc một đại lượng tổng hợp. “Đường tốt nhất” chỉ có nghĩa khi ta đã chọn rõ tiêu chí và biết trọng số.

## Dijkstra: nhìn bản đồ rồi cố định nhãn nhỏ nhất

Thuật toán Dijkstra dùng cho đồ thị có trọng số **không âm**. Bắt đầu ở S với khoảng cách 0; các đỉnh khác có nhãn tạm là vô cùng. Mỗi vòng, chọn đỉnh chưa cố định có nhãn nhỏ nhất, rồi thử cải thiện nhãn các hàng xóm của nó.

Ví dụ S–A = 2, S–B = 7, A–B = 3. Ban đầu A có nhãn 2, B có nhãn 7. Cố định A trước, rồi thử đi S → A → B: chi phí 2 + 3 = 5, nên đổi nhãn B thành **(5, A)**. Số 5 là chi phí tốt nhất hiện biết; A là đỉnh đi trước B. Để làm câu hỏi có dấu “?”, hãy viết lại bảng nhãn sau **từng vòng**, tránh đoán theo hình.

## Bellman–Ford / Distance Vector

Trong cách nhìn Distance Vector, mỗi nút học ước lượng đường tới đích từ hàng xóm. Nếu đi tới đích D qua nút N, chi phí mới bằng **chi phí tới N + chi phí N báo tới D**. Thông tin lan dần; nút không cần bản đồ đầy đủ tức thì. Bellman–Ford còn có thể xử lý cạnh âm trong bài toán đồ thị nếu không có chu trình âm liên quan.

| Cách tiếp cận | Nút cần biết gì? | Ví dụ trong slide |
| --- | --- | --- |
| Link State | Thông tin liên kết để dựng bản đồ mạng rồi tính đường | Dijkstra, OSPF |
| Distance Vector | Ước lượng từ các nút hàng xóm | Bellman–Ford, RIP |

Slide cũng nhắc **BGP** để định tuyến giữa các hệ tự trị (*Autonomous System, AS*). Đây là cấp khác với việc tìm đường trong một mạng nhỏ: BGP trao đổi thông tin tuyến giữa những miền quản trị lớn, còn trong một AS có thể dùng giao thức nội bộ như OSPF.

## Tự kiểm tra

Với S–A = 4, S–B = 10, A–B = 3, nhãn của B sau khi cố định A là bao nhiêu? Đáp án: **(7, A)** vì 4 + 3 < 10.

*Đọc slide K74 số 5, trang 25–48.*
