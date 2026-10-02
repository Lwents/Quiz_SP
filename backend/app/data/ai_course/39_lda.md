# Bài 29: LDA tìm hướng tách các lớp

**Mục tiêu:** Phân biệt PCA với Linear Discriminant Analysis và hiểu LDA dùng nhãn để tìm hướng làm các lớp tách nhau.

## PCA nhìn độ trải rộng, LDA nhìn nhãn

Giả sử đo chiều dài và chiều rộng của hai loại hoa. PCA tìm hướng dữ liệu biến thiên nhiều nhất, bất kể mỗi điểm thuộc loại hoa nào. **Linear Discriminant Analysis (LDA)** dùng nhãn và tìm hướng mà tâm các lớp cách nhau tương đối xa trong khi điểm trong cùng lớp nằm gần nhau.

Hình dung một tờ giấy có hai cụm điểm kéo dài theo chiều ngang, nhưng tâm hai cụm lệch nhau theo chiều dọc. PCA có thể giữ chiều ngang vì tổng biến thiên lớn; LDA có thể ưu tiên chiều dọc vì chiều đó phân biệt hai lớp tốt hơn.

## Hai cách dùng cùng tên LDA

Trong tài liệu, Linear Discriminant Analysis có thể nói tới:

1. **Phép chiếu/giảm chiều có giám sát:** tìm các trục tách nhãn.
2. **Bộ phân loại LDA:** mô hình xác suất với giả định thường dùng rằng mỗi lớp có phân phối Gaussian và các lớp dùng chung ma trận hiệp phương sai.

Đây là hai cách nhìn liên quan của phương pháp, nhưng không nên nhầm với **Latent Dirichlet Allocation**, cũng thường viết LDA nhưng là mô hình chủ đề văn bản.

Với `C` lớp, phép chiếu LDA thường có tối đa `C−1` hướng phân biệt. Ví dụ hai loại hoa chỉ cho một hướng phân biệt hữu ích, dù dữ liệu ban đầu có nhiều cột.

## Khi nào thử LDA?

Thử khi có nhãn, cần phân loại tuyến tính hoặc muốn chiếu dữ liệu sao cho nhìn rõ khác biệt lớp. Kiểm tra giả định và validation; nếu các lớp có phân bố phức tạp hoặc ma trận hiệp phương sai khác nhau mạnh, hiệu quả có thể giảm.

## PCA hỏi về độ trải rộng; LDA hỏi về nhãn

Hãy hình dung hai nhóm học sinh trên mặt phẳng: nhóm A tụ quanh (1,1), nhóm B quanh (4,4). Nếu mỗi nhóm còn trải ngang khá nhiều, LDA tìm hướng mà trung bình hai nhóm cách xa nhau so với độ phân tán bên trong từng nhóm. Chiếu điểm lên hướng đó thường giúp phân loại dễ hơn.

PCA không dùng nhãn và chỉ tìm hướng tổng phương sai lớn. LDA dùng nhãn để so độ tách giữa các lớp với độ trải trong lớp. Với C lớp, LDA có nhiều nhất C−1 hướng phân biệt lớp. Nếu trong mỗi lớp dữ liệu trải rộng đúng theo hướng phân biệt, hoặc giả định của mô hình không phù hợp, LDA không thể tạo phép màu; cần kiểm tra validation.

## Quy trình áp dụng

Tách train/validation/test trước. Ước lượng các trung bình lớp và ma trận phân tán từ train; biến đổi tập còn lại bằng cùng phép chiếu. Sau đó đánh giá bộ phân loại phía sau. Không dùng nhãn của validation/test để tìm hướng LDA, vì như vậy mô hình đã nhìn thấy câu trả lời.

## Tự kiểm tra

PCA dùng hay không dùng nhãn? **Không dùng nhãn.** LDA hướng tới điều gì? **Tách các lớp đã biết nhau tốt hơn.** LDA trong bài này có phải Latent Dirichlet Allocation không? **Không.**

**Nguồn tham khảo:** [Bài 29 về Linear Discriminant Analysis](https://machinelearningcoban.com/) và [tài liệu Linear Discriminant Analysis của scikit-learn](https://scikit-learn.org/stable/modules/lda_qda.html).
