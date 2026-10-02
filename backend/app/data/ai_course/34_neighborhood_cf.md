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

## Tự kiểm tra

Một ô trống trong ma trận tương tác cho biết gì? **Chưa biết người đó thích hay không.** User-user tìm ai giống ai? **Tìm người dùng có lịch sử gần nhau.**

**Nguồn tham khảo:** [Bài 24 về Neighborhood-Based Collaborative Filtering](https://machinelearningcoban.com/).
