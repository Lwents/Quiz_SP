# Bài 12: Bộ phân loại hai lớp và ngưỡng quyết định

**Mục tiêu:** Hiểu rằng bộ phân loại tạo điểm hoặc xác suất rồi dùng ngưỡng để chọn nhãn, và giải thích được đánh đổi khi đổi ngưỡng.

## Từ điểm số tới quyết định

Một bộ phân loại nhị phân chọn giữa hai nhãn, ví dụ `+1` = cần kiểm tra thêm và `−1` = chưa cần. Mô hình có thể tạo **điểm** `s(x)`: điểm cao nghiêng về lớp dương, điểm thấp nghiêng về lớp âm. Cách phổ biến là so với ngưỡng:

```text
nếu s(x) ≥ ngưỡng: dự đoán lớp dương
nếu s(x) < ngưỡng: dự đoán lớp âm
```

PLA dùng dấu của một hàm tuyến tính để quyết định phía nào của đường biên. Logistic Regression chuyển điểm tuyến tính thành xác suất trong khoảng 0–1 rồi thường dùng ngưỡng 0.5. Hai cách có thể vẽ ranh giới tuyến tính, nhưng cách diễn giải đầu ra khác nhau.

## Ngưỡng là quyết định theo mục đích

Giả sử hệ thống sàng lọc cảnh báo người có nguy cơ. Hạ ngưỡng sẽ bắt được nhiều trường hợp nguy cơ hơn, nhưng cũng có thể báo nhầm nhiều người. Tăng ngưỡng thường giảm cảnh báo nhầm nhưng dễ bỏ sót trường hợp thật.

Không có ngưỡng “đúng cho mọi nơi”. Chọn nó theo chi phí của hai kiểu sai, khả năng xử lý cảnh báo và mức độ rủi ro. Trong y tế hoặc tài chính, một xác suất mô hình đưa ra không tự thay thế quy trình chuyên môn.

## Vì sao xem cả score lẫn nhãn?

Nếu chỉ lưu nhãn dự đoán, ta mất thông tin về mức độ gần ngưỡng. Mẫu có xác suất 0.51 và 0.99 đều bị gán lớp dương ở ngưỡng 0.5 nhưng mức chắc chắn biểu kiến khác nhau. Tuy nhiên, xác suất 0.99 cũng không đảm bảo đúng; cần kiểm tra cách mô hình được hiệu chỉnh.

Khi chấm mô hình, cần nêu rõ lớp dương là lớp nào, ngưỡng nào đã dùng và ma trận nhầm lẫn theo nhãn. Accuracy đơn độc có thể đánh lừa nếu một lớp chiếm đa số; chương sau sẽ tính precision, recall và F1.

## Tự kiểm tra

Ngưỡng giảm từ 0.5 xuống 0.3. Hệ thống thường gọi nhiều hay ít trường hợp là dương hơn? **Nhiều hơn.** Điều đó tự đảm bảo mô hình tốt hơn không? **Không; nó đổi số lần bỏ sót và báo nhầm, nên cần đo theo mục tiêu.**

**Nguồn tham khảo:** [Bài 12 về bộ phân loại nhị phân](https://machinelearningcoban.com/).
