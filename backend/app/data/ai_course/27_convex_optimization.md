# Bài 17: Tối ưu lồi và vì sao nghiệm đáng tin

**Mục tiêu:** Giải thích được hàm mục tiêu, miền khả thi, nghiệm tối ưu và vai trò của Gradient Descent trong một bài toán lồi.

## Tối ưu là tìm cách tốt nhất theo một thước đo

Một mô hình có thể dự đoán nhiều kiểu bằng các trọng số khác nhau. Ta cần một con số để so sánh, chẳng hạn tổng bình phương sai số. Con số cần giảm gọi là **hàm mục tiêu** hoặc **hàm mất mát**. Tối ưu hóa nghĩa là tìm trọng số làm con số ấy nhỏ nhất, đồng thời vẫn tuân theo các điều kiện bắt buộc.

Ví dụ chọn kích thước hộp giao hàng: muốn giảm lượng vật liệu dùng nhưng vẫn phải chứa đồ và chịu được tải. “Ít vật liệu nhất” là mục tiêu; “đồ vừa trong hộp” là ràng buộc.

## Từ mất mát sang nghiệm

Trong hồi quy, biến quyết định là trọng số `w`. Hàm mất mát có thể là:

```text
J(w) = trung bình của (giá trị thật − giá trị dự đoán)²
```

Tập các trọng số được phép gọi là **miền khả thi**. Nếu không có ràng buộc riêng, miền có thể là toàn bộ các vector trọng số. Trọng số đạt giá trị `J` nhỏ nhất là nghiệm tối ưu của bài toán.

Gradient Descent bắt đầu ở một điểm rồi đi theo hướng làm `J` giảm. Trên hàm lồi trơn, với tốc độ học và điều kiện thích hợp, phương pháp có thể tiến tới nghiệm toàn cục. Nếu bước quá lớn, có thể nhảy qua đáy; quá nhỏ thì học lâu. Đây là lý do bài Gradient Descent phải kiểm tra đường mất mát chứ không chỉ chạy thật nhiều vòng.

## Không phải mọi bài tối ưu đều lồi

Mạng nơ-ron sâu có hàm mất mát phức tạp, thường không lồi. Gradient Descent vẫn hữu ích trong thực tế nhưng không có cùng bảo đảm tìm đúng đáy toàn cục như bài toán lồi. Ngoài ra, dữ liệu bẩn hoặc mục tiêu đặt sai vẫn tạo ra nghiệm tối ưu cho một bài toán vô ích.

Vì thế cần hỏi hai câu khác nhau: “Thuật toán đã tối ưu được hàm mục tiêu chưa?” và “Hàm mục tiêu có đại diện đúng điều ta muốn không?”. Điểm thứ nhất là tính toán; điểm thứ hai là thiết kế bài toán.

## Tự kiểm tra

Nếu mục tiêu là giảm sai số nhưng trọng số phải không âm, “trọng số không âm” là gì? **Ràng buộc.** Nếu hàm mục tiêu lồi, nó giúp ích ở đâu? **Một cực tiểu cục bộ cũng là cực tiểu toàn cục, nên việc tìm nghiệm có bảo đảm rõ hơn.**

**Nguồn tham khảo:** [Bài 17 về bài toán tối ưu lồi](https://machinelearningcoban.com/).
