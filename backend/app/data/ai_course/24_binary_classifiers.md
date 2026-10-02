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

## Làm thử: đổi ngưỡng thì ai bị cảnh báo?

Có bốn hồ sơ; nhãn thật là `[dương, dương, âm, âm]`, mô hình trả xác suất dương `[0.70, 0.40, 0.30, 0.20]`.

| Ngưỡng | Dự đoán | TP | FP | FN | TN |
| ---: | --- | ---: | ---: | ---: | ---: |
| 0.50 | dương, âm, âm, âm | 1 | 0 | 1 | 2 |
| 0.30 | dương, dương, dương, âm | 2 | 1 | 0 | 1 |

Ở ngưỡng 0.50, mô hình bỏ sót hồ sơ thứ hai. Hạ ngưỡng xuống 0.30 thì bắt được cả hai mẫu dương, nhưng đồng thời gắn nhầm mẫu âm có xác suất 0.30. Recall tăng; precision có thể giảm. Nếu đây là kiểm tra ban đầu rẻ và bỏ sót nguy hiểm, ngưỡng thấp có thể hợp lý. Nếu cảnh báo rất tốn kém, cần cân nhắc báo nhầm.

## Từ score sang đường biên

Một bộ phân loại tuyến tính dùng `s(x)=w₀+w₁x₁+w₂x₂`. Với ngưỡng 0, đường `s(x)=0` là ranh giới; hai phía mang hai nhãn khác nhau. Logistic Regression có thể biến `s` thành xác suất qua sigmoid rồi dùng ngưỡng 0.5 hoặc một ngưỡng khác. Đổi ngưỡng làm đổi quyết định, không làm các trọng số đã học tự biến thành mô hình mới.

## Bài luyện tập

Trong bảng, nếu ngưỡng là 0.40 và quy tắc dùng `>=`, mẫu thứ hai được xếp lớp nào? **Dương.** Cần ghi gì khi công bố kết quả? **Lớp dương, ngưỡng, cách chia dữ liệu và các lỗi TP/FP/FN/TN.**

## Tự kiểm tra

Ngưỡng giảm từ 0.5 xuống 0.3. Hệ thống thường gọi nhiều hay ít trường hợp là dương hơn? **Nhiều hơn.** Điều đó tự đảm bảo mô hình tốt hơn không? **Không; nó đổi số lần bỏ sót và báo nhầm, nên cần đo theo mục tiêu.**

**Nguồn tham khảo:** [Bài 12 về bộ phân loại nhị phân](https://machinelearningcoban.com/).
