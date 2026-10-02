# BFS và DFS: tìm đường từng bước

**Mục tiêu:** Mô phỏng được hàng đợi của BFS và ngăn xếp của DFS, rồi chọn thuật toán phù hợp với loại đường đi cần tìm.

## AI có thể giải bài toán mà chưa cần học từ dữ liệu

Trong các bài hồi quy và phân loại, ta đưa ví dụ có đáp án để mô hình học quy luật. Tìm kiếm giải một kiểu bài khác: ta mô tả các trạng thái có thể có và những bước được phép đi, sau đó thuật toán tự khám phá đường tới mục tiêu.

Hãy tưởng tượng đang tìm đường trong một tòa nhà:

- **Trạng thái** là vị trí hiện tại, chẳng hạn phòng A.
- **Hành động** là đi qua một cửa sang phòng kế bên.
- **Trạng thái kế tiếp** là căn phòng sau khi đi.
- **Mục tiêu** là căn phòng cần tới.
- **Chi phí đường đi** có thể là số bước, thời gian hoặc quãng đường.

Nếu vẽ mỗi phòng thành một chấm và mỗi lối đi thành một đoạn nối, ta có **đồ thị**. Tìm kiếm là cách lần lượt xem các chấm nào cần khảo sát.

## Ví dụ chung để so sánh

Giả sử các lối đi một chiều được xếp theo thứ tự chữ cái như sau:

```text
S → A, B
A → C, D
B → E
C → G
D → —
E → G
G → —
```

Ta bắt đầu ở `S` và muốn tới `G`. Mỗi lối đi tính một bước. Thứ tự hàng xóm cố định giúp hai người làm bài có thể đối chiếu cùng kết quả.

## BFS: kiểm tra các vị trí gần trước

**Breadth-First Search (BFS)** giống như hỏi tất cả các phòng cách điểm xuất phát một cửa trước, rồi mới hỏi các phòng cách hai cửa. Nó dùng **hàng đợi FIFO**: phòng được đưa vào trước sẽ được lấy ra trước, như người xếp hàng.

Diễn tiến ví dụ:

| Lấy khỏi hàng đợi | Đưa thêm vào cuối hàng | Hàng đợi sau bước đó |
| --- | --- | --- |
| `S` | `A, B` | `A, B` |
| `A` | `C, D` | `B, C, D` |
| `B` | `E` | `C, D, E` |
| `C` | `G` | `D, E, G` |
| `D` | Không có | `E, G` |
| `E` | `G` đã được ghi nhận | `G` |

Khi lấy `G` ra, đường tìm được là `S → A → C → G`, dài 3 bước. Đường `S → B → E → G` cũng dài 3 bước. BFS gặp một trong các đường ngắn nhất theo số cạnh; nếu có nhiều đường cùng độ dài thì thứ tự hàng xóm quyết định nó trả về đường nào.

**Vì sao phải đánh dấu đã thăm?** Đồ thị có thể có vòng, chẳng hạn A đi tới B và B quay lại A. Nếu không ghi nhận trạng thái đã đưa vào hàng đợi, thuật toán có thể thêm cùng một phòng vô hạn lần. Ta thường lưu `visited` hoặc lưu nút cha để dựng lại đường đi.

## DFS: đi sâu một nhánh rồi quay lại

**Depth-First Search (DFS)** chọn một hàng xóm rồi tiếp tục đi sâu hết mức có thể trước khi quay lui. Nó dùng **ngăn xếp LIFO**: phần tử thêm sau được lấy ra trước. Với thứ tự như trên, nếu luôn chọn hàng xóm chữ cái nhỏ trước, DFS có thể đi `S → A → C → G` và dừng khi gặp mục tiêu. Nếu nhánh đầu dẫn vào ngõ cụt, nó quay lại điểm rẽ để thử nhánh khác.

DFS hữu ích khi muốn tìm *một* lời giải và đồ thị rộng khiến lưu cả một tầng BFS tốn nhiều bộ nhớ. Nhưng đường đầu tiên DFS tìm được có thể vòng vèo. Trong đồ thị vô hạn hoặc có vòng mà không kiểm soát trạng thái, DFS còn có thể mải đi một nhánh và không bao giờ quay lại nhánh có lời giải.

## Chọn thuật toán theo câu hỏi

| Cần tìm | Cách thường bắt đầu | Điều cần nhớ |
| --- | --- | --- |
| Đường có ít cạnh nhất, mỗi cạnh cùng giá | BFS | Tốn bộ nhớ nếu mỗi tầng có rất nhiều nút |
| Một lời giải bất kỳ, muốn đi sâu trước | DFS | Không đảm bảo đường ngắn nhất; cần tránh mắc ở vòng lặp |
| Đường rẻ nhất khi mỗi cạnh có chi phí khác nhau | Dijkstra hoặc A* | BFS không tối ưu theo tổng chi phí khác nhau |

BFS chỉ đảm bảo ít bước nhất khi mục tiêu bài toán là số cạnh và mỗi bước có cùng chi phí. Nếu một con đường đi bộ mất 2 phút còn đường khác mất 40 phút, đếm số đoạn đường không đồng nghĩa với chọn đường nhanh nhất.

## Ví dụ đời thường

Khi tìm một người trong danh bạ lớp theo từng nhóm bạn của bạn bè, BFS có thể tìm người ở “vòng quen biết gần nhất”. Khi dò mê cung và chỉ cần biết có lối ra hay không, DFS có thể đi một nhánh đến cuối rồi quay lại. Nếu cần tuyến xe buýt ít phút nhất, cần đưa thời gian di chuyển vào chi phí và dùng thuật toán xét chi phí, thay vì chỉ đếm số lần đổi tuyến.

## Tự kiểm tra

Trong ví dụ trên, đường `S → B → E → G` có bao nhiêu bước? **Ba bước.** Vì mọi cạnh có cùng giá và BFS xét tầng gần trước, kết quả trả về sẽ không dài hơn đường nào khác theo số cạnh. Nếu cạnh `B → E` mất 30 phút còn `S → A` chỉ mất 1 phút, bảo đảm đó không còn nói về tổng thời gian.

**Đọc thêm:** [BFS và DFS trong giáo trình CS188 của Berkeley](https://inst.eecs.berkeley.edu/~cs188/textbook/search/uninformed.html) và [lộ trình AI trên OLM](https://olm.vn/bg/tri-tue-nhan-tao).
