# Bài 22: Dùng SVM khi có nhiều lớp

**Mục tiêu:** Mô tả được cách ghép các bộ SVM nhị phân thành bộ phân loại nhiều lớp và hiểu giới hạn của điểm số SVM.

## SVM cơ bản phân biệt hai phía

Một SVM tuyến tính thường được dạy để phân biệt lớp dương với lớp âm. Nếu có ba loại hoa A, B và C, ta cần cách dùng nhiều bộ phân loại nhị phân hoặc một hàm mục tiêu nhiều lớp.

## Hai cách ghép phổ biến

### Một lớp so với phần còn lại (one-vs-rest)

Huấn luyện một SVM cho mỗi lớp. Bộ A học “A so với không-A”; bộ B học “B so với không-B”; tương tự với C. Khi dự đoán, chọn lớp có điểm số cao nhất. Phương pháp cần số bộ phân loại bằng số lớp.

### Một lớp so với một lớp (one-vs-one)

Huấn luyện một bộ cho mỗi cặp: A–B, A–C, B–C. Các bộ bỏ phiếu; lớp có nhiều phiếu nhất được chọn. Số bộ tăng nhanh theo số lớp, nhưng mỗi bài con chỉ nhìn hai lớp.

Thư viện có thể chọn cách ghép mặc định khác nhau; hãy kiểm tra tài liệu và đầu ra thay vì giả định mọi SVM nhiều lớp hoạt động giống nhau.

## Điểm quyết định không mặc nhiên là xác suất

SVM thường tạo **decision score** dựa trên khoảng cách tương đối tới biên. Điểm `2` không có nghĩa “xác suất 200%”; muốn xác suất cần thêm bước hiệu chỉnh phù hợp và đánh giá độ tin cậy. Nếu ứng dụng cần xác suất, phải xác nhận thuật toán và phương pháp hiệu chỉnh cụ thể.

## Hai cách ghép bộ phân loại nhị phân

Với ba lớp A, B, C, cách one-versus-rest huấn luyện ba mô hình: A so với phần còn lại, B so với phần còn lại, và C so với phần còn lại. Một mẫu mới cho ba điểm số giả sử là A=0.2, B=1.4, C=0.8. Ta chọn B vì điểm số lớn nhất. Điểm số ấy không tự động có nghĩa xác suất lớp B là 140% hay 80%.

Cách one-versus-one huấn luyện từng cặp: A/B, A/C, B/C. Mỗi mô hình bỏ phiếu cho một lớp. Với 5 lớp có 5×4/2=10 cặp, nên số mô hình tăng theo số cặp. Cách này chỉ học trên dữ liệu của hai lớp tương ứng, nhưng khi nhiều lớp có thể cần tổng hợp phiếu và xử lý hòa.

## Quy trình thực hành

Chia dữ liệu theo cách giữ đại diện của từng lớp nếu lớp mất cân bằng; chuẩn hóa trong từng fold để dữ liệu validation không lọt vào bước học; chọn kernel và C bằng cross-validation. Sau đó đánh giá một lần trên test và xem precision/recall từng lớp. Với nhiều lớp, accuracy tổng thể có thể che một lớp mà mô hình gần như không bao giờ nhận ra.

## Tự kiểm tra

Với bốn lớp, one-vs-rest cần bao nhiêu bộ? **Bốn.** One-vs-one cần bao nhiêu cặp? **Sáu**: AB, AC, AD, BC, BD, CD. Điểm SVM có phải phần trăm tin cậy không? **Không, thường là điểm quyết định.**

**Nguồn tham khảo:** [Bài 22 về SVM nhiều lớp](https://machinelearningcoban.com/) và [tài liệu SVM của scikit-learn](https://scikit-learn.org/stable/modules/svm.html).
