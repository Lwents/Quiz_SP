# Bài 24: Gợi ý từ người dùng và sản phẩm giống nhau

**Mục tiêu:** Hiểu ma trận tương tác thưa và phân biệt cộng tác lọc dựa trên người dùng với dựa trên sản phẩm.

## Cộng tác lọc dựa vào hành vi chung

Hai người thường cho điểm gần giống nhau hoặc cùng nghe nhiều bài có thể có sở thích gần nhau. **Collaborative filtering** (cộng tác lọc) khai thác mẫu hành vi của nhiều người thay vì chỉ đọc mô tả sản phẩm.

Ta thường biểu diễn dữ liệu thành bảng: hàng là người dùng, cột là phim/sản phẩm, ô là lượt xem, lượt mua hoặc điểm đánh giá. Bảng thường **thưa**: mỗi người chỉ tương tác với một phần nhỏ món có trong hệ thống.

```text
              Phim A   Phim B   Phim C
Người An         5        4       ?
Người Bình       5        ?        2
Người Chi        ?        4        1
```

Dấu `?` có nghĩa **chưa biết**. Không nên tự đổi nó thành 0 vì người chưa xem phim không đồng nghĩa với ghét phim.

## Hai kiểu tìm “hàng xóm”

- **User-user:** tìm những người có lịch sử giống An; xem họ thích gì mà An chưa xem.
- **Item-item:** tìm phim thường được người xem A cũng xem/đánh giá tương tự; nếu An thích A, gợi ý các phim gần A.

Độ giống có thể tính bằng cosine hoặc tương quan trên các ô cả hai cùng đánh giá. Điểm dự đoán có thể lấy trung bình có trọng số từ hàng xóm, ưu tiên những người/phim giống hơn.

## Rủi ro cần nhận biết

Người dùng mới chưa có lịch sử tạo ra **cold start**; sản phẩm mới chưa có ai tương tác cũng vậy. Tương tác ít làm độ giống thiếu tin cậy. Dữ liệu còn phản ánh sản phẩm được giới thiệu nhiều hơn, không hẳn sản phẩm được yêu thích hơn; thuật toán có thể củng cố sự phổ biến và làm nội dung ít phổ biến biến mất.

Gợi ý cần tôn trọng quyền riêng tư, giải thích cách dùng dữ liệu và cho phép người dùng điều chỉnh/xóa lịch sử theo chính sách sản phẩm.

## Ví dụ tìm người hàng xóm giống mình

Ba người chấm hai bộ phim đầu như sau: An chấm A=5, B=1; Bình chấm A=5, B=1; Chi chấm A=1, B=5. An chưa xem phim C, Bình chấm C=4, Chi chấm C=2. Trên hai phim cùng được xem, An và Bình có cùng kiểu thích; Chi có kiểu ngược lại.

Nếu dùng tương quan hoặc cosine trên vector đã trừ điểm trung bình, Bình sẽ gần An hơn Chi. Ta lấy điểm phim C của hàng xóm giống An để gợi ý C. Bản minh họa đơn giản dự đoán khoảng 4 vì Bình chấm 4; hệ thật thường hiệu chỉnh theo mức chấm trung bình của mỗi người và trọng số độ giống, thay vì sao chép nguyên một đánh giá.

## Cần cẩn thận khi dữ liệu thưa

Một người chỉ trùng một phim với An chưa đủ để kết luận họ giống nhau. Thực tế cần số tương tác tối thiểu hoặc co điểm tương đồng về gần 0 khi có quá ít dữ liệu. Người mới chưa có lịch sử và phim mới chưa ai chấm là vấn đề cold start; gợi ý theo nội dung có thể giúp giai đoạn đầu.

Không được lấy đánh giá tương lai để tính láng giềng khi đánh giá mô hình. Chia train/test theo thời gian nếu sản phẩm dự đoán điều người dùng sẽ thích tiếp theo; chia ngẫu nhiên có thể vô tình để thông tin tương lai rò vào train.

## Tự kiểm tra

Một ô trống trong ma trận tương tác cho biết gì? **Chưa biết người đó thích hay không.** User-user tìm ai giống ai? **Tìm người dùng có lịch sử gần nhau.**

**Nguồn tham khảo:** [Bài 24 về Neighborhood-Based Collaborative Filtering](https://machinelearningcoban.com/).
