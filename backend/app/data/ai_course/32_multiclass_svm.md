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

## Tự kiểm tra

Với bốn lớp, one-vs-rest cần bao nhiêu bộ? **Bốn.** One-vs-one cần bao nhiêu cặp? **Sáu**: AB, AC, AD, BC, BD, CD. Điểm SVM có phải phần trăm tin cậy không? **Không, thường là điểm quyết định.**

**Nguồn tham khảo:** [Bài 22 về SVM nhiều lớp](https://machinelearningcoban.com/) và [tài liệu SVM của scikit-learn](https://scikit-learn.org/stable/modules/svm.html).
