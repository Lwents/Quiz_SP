# Bài 6: KNN đo khoảng cách rồi hỏi láng giềng

**Mục tiêu:** Dự đoán một mẫu bằng K láng giềng gần nhất, phân biệt KNN phân loại với hồi quy và nhận ra ảnh hưởng của thang đo.

## Hãy hỏi những ví dụ giống nhất

**K-nearest neighbors (KNN)** lưu các mẫu huấn luyện. Khi gặp khách mới, nó tìm `K` mẫu gần nhất rồi dùng chúng để dự đoán. Khác với một mạng nơ-ron, KNN thường chưa rút gọn dữ liệu thành một bộ trọng số nhỏ; phần nặng xảy ra lúc cần trả lời.

Giả sử muốn phân loại hoa theo chiều dài và chiều rộng cánh. Hoa mới có ba bông gần nhất mang nhãn `A, A, B`. Với `K=3`, bỏ phiếu đa số cho kết quả `A`. Nếu các điểm rất xa nhau về mức độ giống, có thể cho điểm gần hơn phiếu nặng hơn.

## Cùng cách tìm hàng xóm, hai loại đầu ra

- **Phân loại:** láng giềng bỏ phiếu nhãn. Kết quả có thể là loại hoa hoặc thư rác/không rác.
- **Hồi quy:** lấy trung bình giá trị số từ hàng xóm, có thể dùng trung bình có trọng số để điểm gần ảnh hưởng nhiều hơn.

Với `K=1`, dự đoán chỉ dựa vào đúng một điểm gần nhất nên rất nhạy với dữ liệu nhiễu. `K` lớn hơn làm quyết định mượt hơn nhưng có thể xóa mất một nhóm nhỏ có thật. Hãy chọn `K` bằng tập validation, không nhìn vào nhãn test để “tinh chỉnh cho đẹp”.

## Vì sao phải để ý đơn vị đo?

Giả sử một hồ sơ có `tuổi` từ 18 đến 80 và `thu nhập` từ 5.000 đến 200.000. Khoảng cách Euclid có thể bị cột thu nhập lấn át chỉ vì con số lớn hơn. Chuẩn hóa đặc trưng giúp mỗi cột có thang đo hợp lý hơn. Phải tính tham số chuẩn hóa trên tập train rồi dùng đúng phép đổi đó cho mẫu mới.

Khoảng cách Euclid phù hợp khi độ chênh bình phương giữa các chiều có ý nghĩa. Khoảng cách Manhattan cộng độ chênh tuyệt đối; các bài toán khác có thể cần metric khác. KNN không tự biết đơn vị nào quan trọng: ta quyết định qua cách thiết kế dữ liệu.

## Ưu và nhược điểm

KNN dễ giải thích: “dự đoán này giống với các mẫu nào?”. Nhưng với hàng triệu mẫu, phải lưu nhiều dữ liệu và tìm hàng xóm có thể chậm; nhiều chiều cũng khiến khoảng cách khó phân biệt giữa “gần” và “xa”. Chỉ dùng đặc trưng hợp lý, chuẩn hóa đúng và đo tốc độ lẫn độ chính xác trên dữ liệu đại diện.

## Làm thử từng bước: dự đoán có qua môn không

Ta biểu diễn mỗi sinh viên bằng `(số giờ ôn, số buổi đi học)`. Bốn mẫu đã biết là:

| Sinh viên | Giờ ôn | Buổi học | Nhãn |
| --- | ---: | ---: | --- |
| A | 1 | 2 | Trượt |
| B | 2 | 2 | Trượt |
| C | 4 | 4 | Đỗ |
| D | 5 | 4 | Đỗ |

Bạn mới X có `(3.5, 3.5)`. Dùng khoảng cách Euclid:

```text
d(X,A) = √((3.5−1)² + (3.5−2)²) ≈ 2.92
d(X,B) = √((3.5−2)² + (3.5−2)²) ≈ 2.12
d(X,C) = √((3.5−4)² + (3.5−4)²) ≈ 0.71
d(X,D) = √((3.5−5)² + (3.5−4)²) ≈ 1.58
```

Với `K=3`, ba láng giềng gần nhất là C (đỗ), D (đỗ), B (trượt). Hai trong ba phiếu là “đỗ”, nên KNN phân loại X là “đỗ”. Đây chỉ là dự đoán từ bốn mẫu minh họa, không phải kết luận thật về sinh viên.

### Nếu đầu ra là số thì sao?

Muốn dự đoán điểm thi, ta lấy trung bình điểm của ba người gần nhất. Nếu điểm C, D, B lần lượt là 8, 9, 5, dự đoán không trọng số là `(8+9+5)/3 ≈ 7.33`. Trung bình có trọng số sẽ cho C và D ảnh hưởng nhiều hơn vì gần X hơn.

## Checklist trước khi chạy KNN

1. Xem từng hàng có cùng thứ tự và đơn vị đặc trưng không.
2. Chia train/validation/test trước khi chuẩn hóa.
3. Thử vài `K` và cách tính khoảng cách trên validation.
4. So sánh với baseline đơn giản, rồi chỉ đánh giá cuối trên test một lần.

## Tự kiểm tra

Ba láng giềng có nhãn `mèo, mèo, chó`; KNN phân loại với `K=3` đoán nhãn nào? **Mèo.** Nếu chỉ có đúng một nhãn cần dự đoán là giá, đầu ra là loại nào? **Hồi quy KNN, thường lấy trung bình các giá trị của hàng xóm.**

**Nguồn tham khảo:** [Bài 6 về K-nearest neighbors](https://machinelearningcoban.com/) và [hướng dẫn nearest neighbors của scikit-learn](https://scikit-learn.org/stable/modules/neighbors.html).
