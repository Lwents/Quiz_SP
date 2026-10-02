# Bài 32: Naive Bayes phân loại bằng xác suất

**Mục tiêu:** Dùng định lý Bayes để so sánh xác suất một mẫu thuộc từng lớp và giải thích giả định “ngây thơ” của thuật toán.

## Từ từ ngữ trong email tới xác suất thư rác

Giả sử `S` là lớp thư rác, `H` là thư bình thường, `W` là thư có từ “trúng thưởng”. Ta muốn biết `P(S | W)`: xác suất thư rác khi đã thấy từ đó.

Giả sử trong hộp thư, 20% thư là rác; từ “trúng thưởng” xuất hiện ở 50% thư rác và 5% thư bình thường. Hai điểm để so sánh là:

```text
điểm rác       = P(S) × P(W | S)       = 0.20 × 0.50 = 0.10
điểm bình thường = P(H) × P(W | H)     = 0.80 × 0.05 = 0.04
```

Chuẩn hóa: xác suất thư rác xấp xỉ `0.10 / (0.10 + 0.04) = 0.714`, tức 71.4% theo đúng các giả định số liệu minh họa.

## Vì sao “naive” (ngây thơ)?

Khi có nhiều đặc trưng, Naive Bayes thường giả sử chúng độc lập **sau khi đã biết lớp**. Với các từ `trúng thưởng`, `bấm link`, mô hình nhân xác suất từng từ dưới mỗi lớp. Trong đời thật các từ có thể liên quan nhau, nên giả định này không chính xác hoàn toàn; dù vậy phép tính đơn giản có thể hữu ích.

## Dữ liệu chưa từng thấy và làm trơn

Nếu từ “phi thuyền” chưa xuất hiện trong bất kỳ thư rác nào, phép nhân xác suất bằng 0 có thể làm cả điểm lớp thành 0. **Laplace smoothing** cộng một lượng nhỏ vào các lần đếm để sự kiện chưa gặp không triệt tiêu hoàn toàn mọi khả năng.

Naive Bayes thường nhanh và phù hợp làm mốc cho văn bản. Nó có thể trả ra xác suất chưa hiệu chỉnh tốt, nhất là khi giả định độc lập sai. Đánh giá trên dữ liệu thật và không tin xác suất chỉ vì nó được in ra dưới dạng phần trăm.

## Tự kiểm tra

Nếu một từ xuất hiện nhiều hơn trong thư rác, `P(từ | rác)` thường lớn hay nhỏ hơn `P(từ | bình thường)`? **Lớn hơn.** “Naive” nói tới giả định nào? **Các đặc trưng độc lập có điều kiện khi đã biết lớp.**

**Nguồn tham khảo:** [Bài 32 về Naive Bayes Classifier](https://machinelearningcoban.com/) và [tài liệu Naive Bayes của scikit-learn](https://scikit-learn.org/stable/modules/naive_bayes.html).
