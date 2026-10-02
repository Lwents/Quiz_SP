# Bài 26: SVD — tách ma trận thành các mẫu chính

**Mục tiêu:** Hiểu trực quan phân rã SVD, vai trò của giá trị suy biến và cách giữ thành phần lớn để tạo xấp xỉ gọn hơn.

## Tách một bảng số thành các hướng quan trọng

**Singular Value Decomposition (SVD)** viết một ma trận `A` thành tích ba ma trận:

```text
A = U Σ Vᵀ
```

Không cần thuộc mọi phép nhân ngay. Hãy hiểu vai trò: `V` mô tả những mẫu/hướng trong các cột, `Σ` xếp độ mạnh của từng mẫu từ lớn tới nhỏ, `U` cho biết mỗi hàng kết hợp các mẫu ấy ra sao.

Giá trị suy biến lớn tương ứng với cấu trúc chiếm nhiều tín hiệu trong ma trận; giá trị nhỏ thường đóng góp ít hơn, đôi khi chủ yếu phản ánh nhiễu. Nếu giữ vài thành phần lớn nhất, ta được một xấp xỉ hạng thấp của ma trận.

## Nén ảnh bằng xấp xỉ hạng thấp

Ảnh xám là một ma trận pixel. Giữ các thành phần lớn của SVD có thể tái tạo gần đúng cấu trúc chính với ít con số hơn. Giữ càng nhiều thành phần thì ảnh thường càng gần bản gốc nhưng càng tốn dữ liệu; giữ quá ít thì chi tiết bị nhòe hoặc mất.

Không có quy tắc “thành phần nhỏ là vô dụng” cho mọi bài. Chi tiết yếu vẫn có thể quan trọng, chẳng hạn một tín hiệu y tế nhỏ. Hãy xem mục tiêu, sai số tái tạo và tác động của phần bị bỏ.

## Liên hệ với hệ gợi ý

Ma trận người dùng–sản phẩm có thể có cấu trúc thấp chiều vì sở thích thường phụ thuộc vào ít yếu tố tiềm ẩn hơn số sản phẩm. SVD là một phép phân rã đại số chuẩn. Matrix factorization cho hệ gợi ý có thể học các vector gần tinh thần đó nhưng thường tối ưu trực tiếp trên các tương tác đã quan sát và thêm regularization; hai cách không luôn cho cùng nghiệm.

## Tự kiểm tra

Trong `A = UΣVᵀ`, phần nào xếp độ mạnh các thành phần? **Ma trận đường chéo `Σ`.** Nếu giữ ít thành phần hơn, dung lượng có thể giảm nhưng đổi lại điều gì? **Mất một phần chi tiết/thông tin trong xấp xỉ.**

**Nguồn tham khảo:** [Bài 26 về Singular Value Decomposition](https://machinelearningcoban.com/).
