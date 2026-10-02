# Bài 23: Gợi ý dựa trên nội dung món đồ

**Mục tiêu:** Giải thích cách hồ sơ sở thích của người dùng so sánh với đặc trưng sản phẩm để gợi ý món mới.

## Gợi ý thứ giống với món bạn đã thích

Một hệ thống gợi ý phim có thể mô tả mỗi phim bằng các đặc trưng: thể loại, diễn viên, ngôn ngữ, thời lượng hoặc chủ đề. Nếu người dùng thường xem phim khoa học viễn tưởng, hồ sơ của họ sẽ có trọng số cao hơn cho đặc trưng đó.

Hệ thống so sánh hồ sơ người dùng với phim chưa xem. Có thể dùng cosine similarity: hai vector cùng hướng thì giống nhau hơn, dù độ dài vector khác nhau. Sau đó xếp các phim theo độ tương đồng và đề xuất vài phim đầu.

## Ví dụ tính ý tưởng

Giả sử hồ sơ sở thích là `[khoa_học_viễn_tưởng=3, hài=1, tài_liệu=0]`. Phim X có `[1,0,0]`; phim Y có `[0,1,1]`. X chia sẻ hướng khoa học viễn tưởng với sở thích người dùng hơn, nên được ưu tiên. Con số này chỉ là minh họa cho cách so vector, chưa phải hệ thống thương mại hoàn chỉnh.

## Cách tạo hồ sơ người dùng

Một cách đơn giản là cộng đặc trưng của những món đã thích, trừ bớt đặc trưng của món đã chấm thấp, rồi chuẩn hóa. Có thể đặt trọng số cao hơn cho hành động rõ ràng như lưu vào danh sách yêu thích so với việc chỉ mở trang vài giây.

## Điểm mạnh và giới hạn

- **Gợi ý được món mới:** chỉ cần có mô tả món, ngay cả khi chưa ai đánh giá món đó.
- **Dễ giải thích:** “vì bạn thích phim tài liệu về thiên nhiên”.
- **Dễ bị hẹp sở thích:** nếu cứ lặp lại đặc trưng quen thuộc, người dùng ít gặp nội dung mới.
- **Phụ thuộc metadata:** mô tả nghèo hoặc sai làm kết quả nghèo hoặc sai theo.
- **Khó tìm gu tiềm ẩn:** người dùng có thể thích một món vì lý do mà metadata không ghi.

Nên đánh giá chất lượng đề xuất theo hành vi mục tiêu, độ đa dạng và phản hồi người dùng, chứ không chỉ theo độ tương đồng tính toán.

## Ví dụ tính độ giống theo nội dung

Giả sử hồ sơ sở thích của một người là vector [1,1,0], nghĩa là họ quan tâm hai chủ đề thứ nhất và thứ hai. Ba bài viết có vector chủ đề X=[1,0,0], Y=[0,1,1], Z=[1,1,0]. Hệ thống dùng cosine similarity: tích vô hướng chia cho tích độ dài hai vector.

Với X, điểm giống là 1/√2≈0.707. Với Y, tích vô hướng cũng bằng 1 nhưng cả hai vector dài √2, nên điểm là 1/2=0.5. Z trùng hồ sơ nên điểm bằng 1. Hệ thống xếp Z trước, rồi X, rồi Y. Nếu Z là bài người dùng đã đọc, bộ lọc lịch sử có thể bỏ nó và hiển thị X tiếp theo.

## Vì sao đôi khi gợi ý bị lặp?

Mô hình chỉ biết các đặc trưng đã đưa vào. Nếu mọi bài cùng tác giả được mã hóa gần giống nhau, danh sách có thể lặp tác giả; nếu đặc trưng thiếu, bài mới không có mô tả có thể không được gợi ý. Có thể thêm ràng buộc đa dạng, giới hạn số bài mỗi chủ đề và hỏi phản hồi người dùng.

Hệ nội dung xử lý được người dùng mới nếu họ chọn vài sở thích, nhưng khó phát hiện các sở thích tiềm ẩn mà họ chưa nói. Vì vậy hệ thống thực tế thường kết hợp nội dung với tương tác của cộng đồng và luôn cho người dùng quyền điều chỉnh gợi ý.

## Tự kiểm tra

Người dùng mới chưa có lượt xem nhưng phim đã có thể loại/diễn viên. Hệ thống nội dung có gợi ý được không? **Có thể, vì nó so metadata phim với hồ sơ người dùng (nếu có), không cần lượt đánh giá của nhiều người cho phim ấy.**

**Nguồn tham khảo:** [Bài 23 về Content-based Recommendation Systems](https://machinelearningcoban.com/).
