# Bài 25: Ma trận yếu tố ẩn trong hệ gợi ý

**Mục tiêu:** Mô tả được cách phân rã bảng người dùng–sản phẩm thành vector sở thích và vector đặc tính ẩn để dự đoán tương tác chưa thấy.

## Từ bảng khổng lồ tới vài sở thích tiềm ẩn

Ta có thể xem mỗi người là một vector sở thích ẩn, còn mỗi sản phẩm là vector đặc tính ẩn. Ví dụ, hệ thống có thể tự học vài chiều như “ưa phim hành động”, “thích nội dung nhẹ nhàng” hoặc “quan tâm khoa học”. Các chiều này không nhất thiết có tên rõ ràng; chúng là tọa độ được học để tái tạo tương tác đã quan sát.

Điểm dự đoán của người `u` với món `i` có thể lấy tích vô hướng hai vector:

```text
dự đoán(u, i) = sở_thích_ẩn_của_u · đặc_tính_ẩn_của_i
```

Nếu hai vector cùng hướng ở những chiều quan trọng, tích lớn hơn và hệ thống dự đoán tương tác cao hơn.

## Mô hình học các vector ra sao?

1. Bắt đầu bằng các vector nhỏ được khởi tạo.
2. Chỉ nhìn những đánh giá/lượt tương tác đã biết.
3. Tính sai khác giữa dự đoán với các giá trị đã quan sát.
4. Điều chỉnh vector người dùng và sản phẩm để giảm sai số.
5. Thêm regularization để vector không tăng vô hạn nhằm vừa khớp dữ liệu.

Lượt chưa xảy ra không phải nhãn “không thích”. Vì vậy, không nên coi mọi ô trống như đánh giá 0 khi tính sai số.

## Khác gì với tìm hàng xóm?

Phương pháp láng giềng so người/sản phẩm trực tiếp theo độ giống đã quan sát. Factorization tạo biểu diễn thấp chiều và có thể tìm mối liên hệ gián tiếp. Ví dụ người thích phim A và B có thể gần người thích C và D dù họ chưa cùng xem một phim cụ thể.

## Giới hạn

Người dùng hoặc sản phẩm mới chưa có tương tác để học vector; cần cách xử lý cold start, chẳng hạn dùng đặc trưng nội dung làm bổ sung. Vector ẩn có thể dự đoán tốt nhưng khó giải thích thành lý do cụ thể. Hãy kiểm tra theo người dùng, thời gian và nhóm nội dung để biết mô hình có bỏ quên nhóm ít dữ liệu hay không.

## Một dự đoán từ hai yếu tố ẩn

Giả sử mỗi người và mỗi món được mô tả bằng hai con số học được từ lịch sử. Vector người dùng là [0.9, 0.2], vector món hàng là [0.8, 0.1]. Tích vô hướng bằng 0.9×0.8+0.2×0.1=0.74. Đây là điểm tương hợp thô: hai vector cùng hướng và có thành phần lớn thì điểm cao.

Điểm 0.74 chưa phải xác suất 74% hoặc số sao 0.74. Với dữ liệu chấm sao, mô hình thường cộng thêm độ lệch nền của người và món; với nhấp chuột, có thể cần chuyển điểm qua một hàm phù hợp và hiệu chỉnh. Ý nghĩa đầu ra phụ thuộc cách mô hình được huấn luyện.

## Vì sao phải regularize?

Một số người chỉ có một lượt đánh giá. Nếu cho mô hình tự chọn vector bất kỳ để khớp đúng lượt đó, nó có thể ghi nhớ thay vì tìm sở thích lặp lại. Regularization phạt vector quá lớn để nghiệm bớt cực đoan. Chọn mức phạt trên validation, và giữ lượt tương tác cuối làm test nếu mục tiêu là dự đoán tương lai.

Yếu tố ẩn không nhất thiết tương ứng với một nhãn dễ gọi tên như “thích phim hành động”. Chúng là tọa độ tiện ích toán học. Ưu điểm là khái quát mẫu cộng tác; nhược điểm là khó giải thích và yếu với người/món hoàn toàn mới.

## Tự kiểm tra

Hệ thống factorization học cái gì từ ma trận tương tác? **Vector sở thích người dùng và vector đặc tính sản phẩm trong không gian ẩn.** Ô trống có nghĩa đánh giá 0 không? **Không; nó thường chỉ là tương tác chưa quan sát.**

**Nguồn tham khảo:** [Bài 25 về Matrix Factorization Collaborative Filtering](https://machinelearningcoban.com/).
