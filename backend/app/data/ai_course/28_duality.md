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

## Ví dụ đối ngẫu bằng bài toán làm bánh

Một tiệm có 12 kg bột. Mỗi ổ bánh mì dùng 2 kg và lãi 4 nghìn đồng; mỗi bánh muffin dùng 3 kg và lãi 5 nghìn. Gọi x là số ổ bánh mì, y là số muffin. Bài toán nguyên thủy là tối đa hóa 4x+5y, với điều kiện 2x+3y≤12 và x,y≥0.

Hãy gán cho mỗi kg bột một giá trị λ nghìn đồng. Để giá trị bột đủ bao quát lợi nhuận của bánh mì, cần 2λ≥4; với muffin cần 3λ≥5. Ta muốn giá trị của toàn bộ lượng bột thấp nhất: tối thiểu hóa 12λ. Hai điều kiện yêu cầu λ≥2 và λ≥5/3, nên giá trị nhỏ nhất khả thi là λ=2; cận thu được là 12×2=24 nghìn đồng.

Ở bài gốc, làm 6 ổ bánh mì dùng hết 12 kg và lãi 24 nghìn. Ta có một phương án đạt đúng cận đối ngẫu, nên cả hai cách nhìn cho cùng giá trị tối ưu. Ví dụ giả sử số bánh được chia liên tục; tiệm thật thường phải dùng biến nguyên, nên không được bê kết quả này vào vận hành nếu chưa xét điều đó.

## Liên hệ lại với SVM

Bài toán đối ngẫu của SVM gán hệ số cho các điểm huấn luyện. Điểm có hệ số khác không thường là support vector và góp phần xác định ranh giới; các điểm xa lề thường không quyết định nó. Vì biểu thức đối ngẫu dùng tích vô hướng giữa điểm, ta có thể thay tích đó bằng một kernel để mô hình hóa ranh giới cong mà không cần tự tạo mọi tọa độ mới.

## Tự kiểm tra

Trong cách nhìn dual, biến mới thường gắn với điều gì? **Mức độ quan trọng/giá của ràng buộc.** Vì sao dual hữu ích cho SVM? **Nó viết nghiệm theo dữ liệu huấn luyện và tạo cơ sở cho support vectors cùng kernel.**

**Nguồn tham khảo:** [Bài 18 về duality](https://machinelearningcoban.com/).
