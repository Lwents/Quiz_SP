# Heuristic và A*: tìm hướng có triển vọng

**Mục tiêu:** Tính được `g(n)`, `h(n)` và `f(n)` trên một ví dụ, hiểu vì sao A* cân bằng quãng đường đã đi với ước lượng còn lại.

## Từ dò từng nhánh sang dùng gợi ý

BFS biết một nút cách điểm xuất phát bao nhiêu **bước**, nhưng không biết nút nào đang gần đích hơn. Trong bản đồ lớn, ta có thể dùng thông tin ước lượng như khoảng cách đường chim bay để ưu tiên hướng có vẻ tốt. Ước lượng đó gọi là **heuristic**, thường ký hiệu `h(n)`.

Heuristic là một mẹo dẫn hướng được thiết kế từ hiểu biết về bài toán. Nó không phải đáp án chắc chắn và cũng không phải mô hình AI tự học trong mọi trường hợp. Chẳng hạn, khoảng cách đường chim bay tới trường không thể dài hơn con đường thực tế trên mặt đất, nên có thể dùng làm một ước lượng lạc quan.

## A* cộng hai loại thông tin

A* đánh giá một vị trí `n` theo:

```text
g(n) = chi phí thật đã đi từ điểm bắt đầu tới n
h(n) = chi phí còn lại được ước lượng từ n tới mục tiêu
f(n) = g(n) + h(n)
```

Mỗi lần, thuật toán mở rộng nút có `f` nhỏ nhất. `g` tránh chọn đường đã đi quá đắt; `h` tránh khám phá mọi hướng như BFS. Ví dụ chọn đường từ `S` đến `G`:

```text
S → A: tốn 1; A → G: tốn 100
S → B: tốn 5; B → G: tốn 5
h(A) = 1, h(B) = 5, h(G) = 0
```

Sau bước đầu:

| Nút | `g`: đã tốn | `h`: còn ước lượng | `f = g + h` |
| --- | ---: | ---: | ---: |
| A | 1 | 1 | 2 |
| B | 5 | 5 | 10 |

A* xem `A` trước. Từ đó nó phát hiện đường tới `G` có tổng chi phí `101`. Đường đi qua B có thể chưa được mở rộng, vì vậy thuật toán tiếp tục so sánh các nút đang chờ. Khi mở rộng B, nó phát hiện đường tới G chỉ tốn `10` và cập nhật kết quả tốt hơn. Nếu dừng đúng theo quy tắc A* với chi phí cạnh không âm và heuristic phù hợp, nó chọn đường `S → B → G`.

## So sánh A* với tham lam

Chiến lược **tham lam** chỉ nhìn `h(n)`: “trông có vẻ gần đích thì đi”. A* nhìn cả `g(n) + h(n)`: “tổng chi phí đã trả cộng với dự tính còn lại là bao nhiêu?”. Trong ví dụ, đi tới A trông rất hứa hẹn vì `h(A)=1`, nhưng con đường thực từ A đến G lại rất đắt. `g` giúp A* tính đến khoản đã bỏ ra.

## Khi nào lời giải A* là đường rẻ nhất?

Để `h` giúp tìm đường rẻ nhất, một điều kiện dễ hiểu là **không đánh giá quá cao** chi phí còn lại thật. Giá trị như thế gọi là heuristic chấp nhận được (*admissible*). Ví dụ khoảng cách đường chim bay là 8 km trong khi đường bộ thật dài 10 km: ước lượng 8 km là lạc quan. Nếu nói 15 km thì có thể bỏ qua một con đường rẻ hơn vì tưởng nó không đáng xem.

`h(n)=0` luôn là ước lượng không vượt quá chi phí thật; A* khi đó hành xử giống tìm kiếm chi phí đồng nhất. Heuristic tốt hơn có thể giảm số nút phải xem, nhưng cần đảm bảo đúng điều kiện của bài toán nếu cần cam kết đường tối ưu. Một heuristic quá cao đôi khi vẫn tìm được đường nhanh trong ứng dụng, nhưng không còn bảo đảm tối ưu chung.

## Ví dụ chọn khoảng cách trên lưới

Trên lưới chỉ đi ngang/dọc và không có vật cản, từ ô `(2, 3)` tới `(7, 5)` cần ít nhất `|7−2| + |5−3| = 7` bước. Đây là khoảng cách Manhattan. Nếu có tường, đường thật có thể dài hơn 7, nên phép tính vẫn là ước lượng lạc quan. Nếu được đi chéo, phải chọn heuristic phù hợp với các bước chéo.

## Tự kiểm tra

Một nút đã đi hết 4 phút; phần còn lại được ước lượng 6 phút. `f` là bao nhiêu? **10 phút.** Nếu ước lượng 12 phút nhưng đường thật còn 8 phút, heuristic đang đánh giá quá cao và có thể làm mất bảo đảm tối ưu.

**Nguồn:** [Tìm kiếm có heuristic trong giáo trình CS188 của Berkeley](https://inst.eecs.berkeley.edu/~cs188/textbook/search/informed.html) và [lộ trình AI trên OLM](https://olm.vn/bg/tri-tue-nhan-tao).
