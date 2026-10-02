# Bài 34: Cây quyết định ID3 hỏi câu nào trước?

**Mục tiêu:** Đọc được nút, nhánh và lá của cây quyết định, hiểu entropy và thông tin thu được khi chọn một câu hỏi.

## Cây hỏi lần lượt để đi tới dự đoán

Cây quyết định giống bảng câu hỏi. Nút trong hỏi một điều về dữ liệu; mỗi câu trả lời đi theo một nhánh; lá đưa ra dự đoán. Ví dụ duyệt hồ sơ:

```text
Có giấy tờ bắt buộc không?
├─ Không → yêu cầu bổ sung
└─ Có → kiểm tra tiêu chí tiếp theo
```

Cây dễ giải thích cho người mới vì có thể lần theo đúng đường từ dữ liệu tới dự đoán. Nhược điểm là cây sâu có thể ghi nhớ từng hồ sơ train.

## Entropy đo độ lẫn lộn

Nếu một nút toàn mẫu cùng nhãn, nó “thuần”; nếu nhãn chia đều, nó “lẫn” hơn. **Entropy** lượng hóa mức lẫn lộn: càng gần 0 càng thuần. ID3 thử câu hỏi và chọn câu làm giảm entropy nhiều nhất, gọi là **Information Gain**.

Ví dụ có 8 hồ sơ: 4 được duyệt và 4 từ chối, entropy ban đầu là 1 bit. Câu hỏi “đã nộp đủ giấy tờ chưa?” có thể chia thành hai nhóm đều thuần (4 duyệt / 4 từ chối), nên entropy sau chia bằng 0 và gain bằng 1. Nếu câu hỏi “đến buổi sáng không?” tạo hai nhóm vẫn pha trộn 3/1 và 1/3, lượng gain nhỏ hơn. Cây chọn giấy tờ trước.

## Lặp lại và dừng

Sau câu hỏi đầu, thuật toán tiếp tục tìm câu có gain tốt nhất trong từng nhánh. Dừng khi nút đủ thuần, hết câu hỏi, hoặc đạt giới hạn đã chọn. Cây thực tế có thể cần xử lý đặc trưng số bằng ngưỡng như `thu_nhập ≤ 20`, cũng như giá trị thiếu.

Giới hạn độ sâu, yêu cầu số mẫu tối thiểu trong lá hoặc cắt tỉa cây giúp giảm overfitting. Dùng validation để chọn; đừng để cây lớn vô hạn chỉ để tăng điểm train.

## Tính Information Gain bằng một bảng nhỏ

Giả sử có 12 hồ sơ: 7 được qua và 5 chưa qua. Entropy ban đầu xấp xỉ 0.980 bit. Xét câu hỏi A về chuyên cần: nhánh thứ nhất có 4 qua, 2 chưa qua; nhánh kia 3 qua, 3 chưa qua. Entropy có trọng số sau chia xấp xỉ (6/12×0.918)+(6/12×1)=0.959, nên gain khoảng 0.021.

Câu hỏi B về đã luyện bài: nhánh thứ nhất có 5 qua, 1 chưa qua; nhánh kia có 2 qua, 4 chưa qua. Entropy sau chia xấp xỉ (6/12×0.650)+(6/12×0.918)=0.784, nên gain khoảng 0.196. Vì B làm giảm độ lẫn nhiều hơn, ID3 sẽ thử B trước. Số liệu này chỉ là ví dụ luyện cách tính, không phải kết luận về sinh viên thật.

## Sau khi chọn câu đầu

Thuật toán lặp lại cách tính ở từng nhánh để chọn câu tiếp theo. Nếu nhánh đã thuần thì dừng và tạo lá. Nếu cứ chia tới khi mỗi hồ sơ riêng thành một lá, cây có thể ghi nhớ cả nhiễu. Giới hạn độ sâu, yêu cầu số mẫu tối thiểu và pruning giúp kiểm tra xem cây có khái quát tốt không.

## Tự kiểm tra

Nếu mọi hồ sơ trong một lá đều cùng nhãn, entropy của lá gần bao nhiêu? **0.** Câu hỏi nào được ID3 ưu tiên? **Câu làm giảm entropy nhiều nhất, tức có information gain lớn nhất.**

**Nguồn tham khảo:** [Bài 34 về Decision Trees (ID3)](https://machinelearningcoban.com/) và [tài liệu cây quyết định của scikit-learn](https://scikit-learn.org/stable/modules/tree.html).
