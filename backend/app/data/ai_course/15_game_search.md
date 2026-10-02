# Minimax: máy chọn nước đi trong trò chơi

**Mục tiêu:** Đọc được cây trò chơi, phân biệt lượt MAX với lượt MIN và tính được nước đi an toàn bằng minimax.

## Vì sao trò chơi cần cách tìm kiếm khác?

Trong tìm đường, ta thường giả sử lối đi vẫn ở đó khi đang chọn hướng. Trong cờ caro hay cờ vua, đối thủ sẽ chọn nước đi để làm hỏng kế hoạch của ta. Vì vậy, một nước đi tốt không chỉ đem lại lợi ích nếu đối thủ đứng yên; nó cần còn tốt sau phản ứng hợp lý của đối thủ.

Ta biểu diễn trò chơi thành **cây**:

- Nút gốc là bàn cờ hiện tại.
- Nhánh là một nước đi hợp lệ.
- Nút kế tiếp là trạng thái bàn cờ sau nước đi.
- Nút lá là trạng thái kết thúc hoặc trạng thái ta tạm đánh giá.

Hệ thống cần biết luật sinh nước đi, lúc nào trò chơi kết thúc và giá trị của kết quả. Ví dụ thắng `+1`, hòa `0`, thua `−1` từ góc nhìn người chơi đang được mô hình hóa.

## MAX chọn lợi ích, MIN chống lại

Giả sử đến lượt ta (MAX), sau đó đối thủ (MIN) được đi. Ta có hai lựa chọn A và B. Điểm ở dưới là kết quả cuối cùng đối với ta:

```text
                 MAX
                /   \
             A /     \ B
              MIN    MIN
             /  \    /  \
            3    5  2    9
```

Nếu ta chọn A, đối thủ chọn kết quả thấp hơn: `min(3, 5) = 3`. Nếu chọn B, đối thủ chọn `min(2, 9) = 2`. Ta giả sử đối thủ cũng chơi có lý trí, nên MAX chọn kết quả lớn hơn giữa hai lựa chọn: `max(3, 2) = 3`. Nước A là lựa chọn minimax.

Quy tắc tính lặp lại từ các lá lên trên:

```text
Nút MAX: lấy giá trị lớn nhất của các con.
Nút MIN: lấy giá trị nhỏ nhất của các con.
```

`MAX` và `MIN` là góc nhìn trong phép tính; không nhất thiết là tên thật của người chơi. Nếu cả hai người đều có lợi ích riêng hoặc luật tính điểm khác, cần định nghĩa giá trị cho đúng.

## Khi cây quá lớn

Số trạng thái tăng rất nhanh theo số nước đi. Nếu mỗi lượt có trung bình `b` lựa chọn và nhìn trước `d` lượt, lượng nút có thể tăng cỡ `b^d`. Trò chơi thật có thể không tính hết cây.

Một số cách giảm việc:

1. Chỉ tìm tới độ sâu giới hạn.
2. Dùng hàm đánh giá để chấm trạng thái chưa kết thúc, ví dụ lợi thế quân cờ hoặc số ô thắng tiềm năng.
3. Dùng **alpha-beta pruning** để bỏ nhánh chắc chắn không thể đổi quyết định.

Trong cây ví dụ, A đã đảm bảo cho MAX điểm 3. Khi xem nhánh B, MIN gặp điểm 2; nó sẽ chọn điểm không quá 2, nên MAX chắc chắn không chọn B thay A. Các lá còn lại bên dưới B không cần xét. Cắt nhánh này giữ nguyên quyết định minimax, miễn việc cắt dựa trên các giới hạn đã tính đúng.

## Ví dụ đời thường

Khi chọn một nước cờ, hãy nghĩ: “Nếu mình đi nước này, đối thủ có phản ứng nào tệ nhất cho mình? Trong các phản ứng đó, nước nào vẫn giúp mình có kết quả tốt nhất?”. Đó là tinh thần minimax. Nếu chỉ chọn nước có vẻ hay nhất ngay lúc này mà không xem phản ứng của đối thủ, hệ thống có thể bỏ sót một đòn bắt buộc.

## Giới hạn của mô hình

Minimax không tự làm cho chương trình hiểu luật hay hiểu con người. Chất lượng phụ thuộc vào luật được mã hóa, số lượt nhìn trước và hàm đánh giá. Nếu hàm đánh giá thiên lệch, chương trình có thể chọn quyết định tối ưu theo điểm số sai ấy. Với trò chơi có ngẫu nhiên như tung xúc xắc, cần thêm xác suất của các kết quả ngẫu nhiên, thường dùng biến thể expectiminimax.

## Tự kiểm tra

Ở nút MIN có hai lựa chọn điểm `−1` và `4`. Đối thủ sẽ chọn điểm nào cho MAX? **`−1`**, vì MIN chọn giá trị thấp hơn. Nếu MAX có các phương án bảo đảm lần lượt `−1` và `0`, MAX chọn phương án nào? **Phương án `0`**.

**Nguồn:** [Trò chơi đối kháng trong giáo trình CS188 của Berkeley](https://inst.eecs.berkeley.edu/~cs188/textbook/games/games.html) và [lộ trình AI trên OLM](https://olm.vn/bg/tri-tue-nhan-tao).
