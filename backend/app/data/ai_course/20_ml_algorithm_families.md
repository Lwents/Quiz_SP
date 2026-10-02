# Bài 2: Có những kiểu học máy nào?

**Mục tiêu:** Phân biệt học có giám sát, không giám sát, bán giám sát và tăng cường bằng cách nhìn xem dữ liệu có nhãn hay phần thưởng nào.

## Hỏi trước: máy được cho biết điều gì?

Hãy hình dung bạn đang dạy một người mới phân loại thư. Nếu bạn đưa thư và nói rõ thư nào là quảng cáo, đó là học có đáp án. Nếu bạn chỉ đưa một đống thư để người ấy tự nhóm các thư giống nhau, đáp án chưa có. Cách cung cấp phản hồi thường quan trọng hơn tên thuật toán.

| Kiểu học | Dữ liệu / phản hồi có sẵn | Ví dụ |
| --- | --- | --- |
| **Có giám sát** | Đầu vào đi kèm nhãn đúng | Dự đoán giá nhà; phân loại thư rác |
| **Không giám sát** | Có đầu vào nhưng chưa có nhãn | Tìm nhóm khách có hành vi mua gần nhau |
| **Bán giám sát** | Một ít mẫu có nhãn, nhiều mẫu chưa nhãn | Một số ảnh được chuyên gia phân loại, hàng nghìn ảnh còn lại chưa có nhãn |
| **Tăng cường** | Hệ thống thử hành động và nhận thưởng/phạt | Tác nhân học chơi trò chơi qua điểm thưởng |

## Học có giám sát gồm hai câu hỏi quen thuộc

Nếu muốn đoán một **con số liên tục** như lượng CO₂ hoặc giá nhà, thường gọi đó là hồi quy. Nếu muốn chọn **một nhãn hữu hạn** như “rác / không rác”, đó là phân loại. Cùng một dữ liệu tuổi người dùng có thể dùng cho hai mục tiêu: dự đoán tuổi chính xác là hồi quy; dự đoán nhóm tuổi là phân loại.

## Không giám sát không có nghĩa là “không có mục tiêu”

Ta vẫn phải yêu cầu thuật toán làm một việc, chẳng hạn gom nhóm hoặc nén số chiều. Điều khác là không có nhãn chuẩn để chấm từng mẫu một cách trực tiếp. Người làm cần kiểm tra xem nhóm thu được có hữu ích hay chỉ là kết quả của lựa chọn khoảng cách và tham số.

## Tăng cường khác với đưa đáp án cho từng bước

Trong trò chơi, máy có thể không được biết ngay nước đi hoàn hảo. Nó thử hành động, quan sát điểm thưởng và kết quả sau đó, rồi dần điều chỉnh cách chọn. Phần thưởng có thể đến muộn: một nước đi hiện tại chỉ có ích vì mở đường tới chiến thắng sau nhiều lượt.

## Các nhóm này có thể kết hợp

Một dự án có thể dùng học có giám sát để nhận dạng vật thể, rồi dùng tăng cường để quyết định robot nên di chuyển thế nào. Trong báo cáo, hãy mô tả mục tiêu và tín hiệu học thực tế thay vì chỉ gắn một nhãn thuật toán.

## Làm thử: thư viện muốn sắp xếp sách

Thư viện có 1.000 cuốn sách:

1. Nếu nhân viên đã gắn nhãn `lịch sử`, `khoa học`, `tiểu thuyết` cho từng cuốn và ta muốn phân loại cuốn mới, đây là **học có giám sát**.
2. Nếu chưa có nhãn nhưng muốn máy gom các cuốn có mô tả giống nhau, đây là **học không giám sát**. Người phụ trách phải xem nhóm có ý nghĩa không.
3. Nếu chỉ có 50 cuốn được gắn nhãn, còn 950 cuốn chưa nhãn, có thể nghiên cứu **bán giám sát** để tận dụng cả hai phần dữ liệu.
4. Nếu robot thư viện thử đặt sách vào kệ và nhận điểm khi sách ở đúng khu vực, đây là **học tăng cường**: phản hồi là điểm thưởng theo hành động.

Cùng một thư viện có thể dùng cả bốn cách cho những mục tiêu khác nhau. Hãy bắt đầu bằng việc ghi rõ: dữ liệu nào có nhãn, ai tạo nhãn, và hệ thống cần xuất ra điều gì.

## Bài luyện tập

Một ứng dụng nghe nhạc có danh sách bài hát nhưng không có thể loại, muốn tự nhóm các bài gần nhau. Chọn kiểu học nào? **Không giám sát.** Nếu ứng dụng được cho biết từng bài thuộc `rock`, `jazz` hay `pop` và học cách gán thể loại cho bài mới thì sao? **Có giám sát, bài toán phân loại.**

## Tự kiểm tra

Một bảng có thông tin khách hàng nhưng không có cột “nhóm khách”, bạn muốn tự tìm các nhóm tương tự. Đây là kiểu nào? **Không giám sát.** Nếu có nhãn khách đã rời đi / còn ở lại và muốn dự đoán khách mới, đây là kiểu nào? **Có giám sát, bài toán phân loại.**

**Nguồn tham khảo:** [Bài 2 trong Machine Learning cơ bản](https://machinelearningcoban.com/).
