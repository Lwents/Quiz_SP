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

## Tự kiểm tra

Ba láng giềng có nhãn `mèo, mèo, chó`; KNN phân loại với `K=3` đoán nhãn nào? **Mèo.** Nếu chỉ có đúng một nhãn cần dự đoán là giá, đầu ra là loại nào? **Hồi quy KNN, thường lấy trung bình các giá trị của hàng xóm.**

**Nguồn tham khảo:** [Bài 6 về K-nearest neighbors](https://machinelearningcoban.com/) và [hướng dẫn nearest neighbors của scikit-learn](https://scikit-learn.org/stable/modules/neighbors.html).
