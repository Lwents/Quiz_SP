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

## Tự kiểm tra

Hệ thống factorization học cái gì từ ma trận tương tác? **Vector sở thích người dùng và vector đặc tính sản phẩm trong không gian ẩn.** Ô trống có nghĩa đánh giá 0 không? **Không; nó thường chỉ là tương tác chưa quan sát.**

**Nguồn tham khảo:** [Bài 25 về Matrix Factorization Collaborative Filtering](https://machinelearningcoban.com/).
