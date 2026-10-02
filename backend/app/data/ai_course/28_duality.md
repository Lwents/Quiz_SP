# Bài 18: Đối ngẫu — đổi góc nhìn để giải bài toán

**Mục tiêu:** Nắm trực giác của bài toán nguyên thủy, bài toán đối ngẫu và vì sao SVM có thể tìm lề bằng cách nhìn các mẫu dữ liệu.

## Một bài toán, hai cách đặt câu hỏi

Một bài toán tối ưu thường được viết ở dạng **primal** (nguyên thủy): chọn các biến để tối thiểu hóa chi phí và thỏa ràng buộc. Đôi khi ta có thể xây dựng một bài toán liên quan gọi là **dual** (đối ngẫu), trong đó các biến mới biểu diễn mức độ quan trọng của từng ràng buộc.

Ví dụ đời thường: một trường muốn xếp lịch sao cho giảm số ca học nhưng vẫn không xếp hai lớp cùng phòng. Ở góc primal ta quyết định lịch. Ở góc dual ta có thể gán “giá” cho từng xung đột/ràng buộc để thấy điều gì đang siết bài toán mạnh nhất. Đây là phép so sánh để hình dung, không phải công thức giải lịch cụ thể.

## Cận dưới và khoảng cách giữa hai cách nhìn

Trong nhiều bài toán tối thiểu hóa, nghiệm đối ngẫu tạo ra một **cận dưới** cho chi phí tốt nhất có thể của bài primal. Khoảng cách giữa hai giá trị giúp ta biết còn cách nghiệm tối ưu bao xa. Với điều kiện thích hợp của bài toán lồi, hai giá trị có thể trùng nhau; đó gọi là đối ngẫu mạnh.

Không phải cứ viết ra một dual là tự động có hai bài bằng nhau. Cần thỏa các giả thiết toán học. Khi mới học, hãy giữ ý chính: biến đối ngẫu mã hóa ràng buộc và có thể biến một bài toán khó thành dạng tiện tính hơn.

## Liên hệ với SVM

Trong SVM tuyến tính, primal tìm siêu phẳng có lề rộng. Dạng dual diễn tả nghiệm thông qua các mẫu huấn luyện và hệ số của chúng. Chỉ một số điểm nằm sát đường biên có hệ số quan trọng; đó là **support vectors**. Việc dùng tích vô hướng giữa các điểm trong dual cũng mở đường cho kernel: ta có thể tính sự giống nhau trong không gian đặc trưng lớn mà không cần tạo toàn bộ tọa độ mới.

Đây là lý do duality không chỉ là phép biến đổi ký hiệu trong giáo trình. Nó giải thích vì sao một số thuật toán có thể mở rộng hoặc dùng kernel hiệu quả.

## Tự kiểm tra

Trong cách nhìn dual, biến mới thường gắn với điều gì? **Mức độ quan trọng/giá của ràng buộc.** Vì sao dual hữu ích cho SVM? **Nó viết nghiệm theo dữ liệu huấn luyện và tạo cơ sở cho support vectors cùng kernel.**

**Nguồn tham khảo:** [Bài 18 về duality](https://machinelearningcoban.com/).
