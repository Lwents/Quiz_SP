# K-means: tự gom nhóm dữ liệu chưa có nhãn

**Mục tiêu:** Tự thực hiện một vòng gán điểm và cập nhật tâm cụm, đồng thời biết các giới hạn quan trọng của K-means.

## Khác với các bài có đáp án sẵn

Trong hồi quy và PLA, dữ liệu có nhãn để mô hình so sánh dự đoán với đáp án. Nhưng một cửa hàng có thể chỉ lưu tuổi và số tiền mua hàng, chưa biết khách thuộc nhóm nào. **Phân cụm** tìm những nhóm điểm gần nhau mà không cần cột đáp án. Đây là học không giám sát.

K-means yêu cầu ta chọn trước `k`, tức số cụm. Nó tìm `k` tâm đại diện sao cho mỗi điểm gần tâm cụm được gán hơn. Chữ “means” nói đến **trung bình**: sau khi gán điểm, mỗi tâm được chuyển tới trung bình của các điểm trong nhóm.

## Làm bằng tay một chiều

Giả sử số tiền chi tiêu hằng tháng của sáu khách (triệu đồng) là:

```text
2, 3, 4, 10, 11, 12
```

Muốn minh họa hai nhóm, đặt `k = 2` và chọn hai tâm ban đầu là `2` và `10`. Dùng khoảng cách tuyệt đối trong ví dụ một chiều:

| Khách | Khoảng cách tới tâm 2 | Khoảng cách tới tâm 10 | Được gán vào |
| ---: | ---: | ---: | --- |
| 2 | 0 | 8 | Cụm 1 |
| 3 | 1 | 7 | Cụm 1 |
| 4 | 2 | 6 | Cụm 1 |
| 10 | 8 | 0 | Cụm 2 |
| 11 | 9 | 1 | Cụm 2 |
| 12 | 10 | 2 | Cụm 2 |

Cập nhật tâm bằng trung bình:

```text
Tâm cụm 1 = (2 + 3 + 4) / 3 = 3
Tâm cụm 2 = (10 + 11 + 12) / 3 = 11
```

Gán lại từng khách theo tâm 3 và 11 vẫn cho hai nhóm như cũ, nên thuật toán đã ổn định trong ví dụ này. Với dữ liệu thật, quá trình thường lặp nhiều vòng:

1. Gán mỗi điểm cho tâm gần nhất.
2. Tính lại mỗi tâm bằng trung bình của các điểm trong cụm.
3. Dừng khi cách gán gần như không đổi hoặc đã tới số vòng tối đa.

## Vì sao gọi là K-means?

`K` là số nhóm mong muốn. `Means` là các giá trị trung bình tạo nên tâm của mỗi nhóm. Trong nhiều chiều, một khách có thể có tọa độ `(tuổi, chi_tiêu)`, và khoảng cách thường được tính từ tất cả các chiều.

## Chọn k không phải là đoán đáp án

Thuật toán sẽ cố tạo đúng `k` nhóm dù dữ liệu tự nhiên có thể không có ranh giới rõ. Nếu đặt `k=2`, đó là yêu cầu phân chia thành hai nhóm, không chứng minh rằng khách hàng ngoài đời vốn có hai kiểu. Có thể thử vài giá trị `k`, xem biểu đồ, độ ổn định và mục đích sử dụng. Elbow method so sánh mức sai khác trong cụm khi tăng `k`; điểm “khuỷu tay” là gợi ý, không luôn tạo ra lựa chọn duy nhất.

## Ba điều dễ làm kết quả sai lệch

1. **Thang đo không giống nhau:** chi tiêu tính bằng triệu (0–20), tuổi 18–80. Khoảng cách có thể bị cột tuổi lấn át. Chuẩn hóa đặc trưng trước khi tính khoảng cách nếu phù hợp.
2. **Tâm khởi tạo:** khởi tạo khác nhau có thể dẫn tới kết quả khác nhau hoặc nghiệm địa phương. Chạy nhiều lần với cách khởi tạo tốt như `k-means++` giúp giảm rủi ro này.
3. **Ngoại lệ và hình dạng cụm:** một khách có mức chi tiêu cực lớn kéo trung bình đi xa. K-means cũng hợp với cụm tương đối tròn theo khoảng cách; cụm dài, lồng nhau hoặc nhiều ngoại lệ có thể cần cách khác.

Nhóm `0` và `1` chỉ là mã kỹ thuật. Nhóm 0 không có nghĩa là “tốt hơn” nhóm 1. Người phân tích cần nhìn đặc điểm mỗi cụm và kiểm tra việc dùng nhóm có công bằng, hữu ích hay không.

## Tự kiểm tra

Với hai điểm `4` và `8` cùng cụm, tâm mới là bao nhiêu? **`(4+8)/2 = 6`.** Nếu không biết số cụm, K-means có tự tìm câu trả lời đúng duy nhất không? **Không; phải chọn `k` hoặc so sánh các phương án, và dữ liệu có thể không có đáp án phân nhóm duy nhất.**

**Nguồn:** [Tổng quan phân cụm và K-means trong tài liệu scikit-learn](https://scikit-learn.org/stable/modules/clustering.html) và [lộ trình AI trên OLM](https://olm.vn/bg/tri-tue-nhan-tao).
