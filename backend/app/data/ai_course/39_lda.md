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

## Tự kiểm tra

PCA dùng hay không dùng nhãn? **Không dùng nhãn.** LDA hướng tới điều gì? **Tách các lớp đã biết nhau tốt hơn.** LDA trong bài này có phải Latent Dirichlet Allocation không? **Không.**

**Nguồn tham khảo:** [Bài 29 về Linear Discriminant Analysis](https://machinelearningcoban.com/) và [tài liệu Linear Discriminant Analysis của scikit-learn](https://scikit-learn.org/stable/modules/lda_qda.html).
