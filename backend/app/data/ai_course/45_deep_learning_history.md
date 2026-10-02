# Bài 35: Các cột mốc dẫn tới Deep Learning

**Mục tiêu:** Nhìn được mạch phát triển từ nơ-ron nhân tạo tới mạng nhiều lớp và hiểu vì sao dữ liệu, thuật toán lẫn năng lực tính toán đều quan trọng.

## Không có một bước thần kỳ duy nhất

Deep Learning không xuất hiện chỉ vì một nhà nghiên cứu tạo ra một thuật toán rồi mọi việc thay đổi ngay. Đây là kết quả của nhiều ý tưởng tích lũy: biểu diễn dữ liệu bằng các nơ-ron tính toán, nối chúng thành nhiều lớp, tìm cách cập nhật trọng số hiệu quả, rồi áp dụng chúng khi dữ liệu và máy tính đủ khả năng.

## Một mạch ý tưởng dễ nhớ

1. **Nơ-ron và perceptron:** mô hình đơn giản kết hợp đầu vào bằng trọng số để tạo quyết định. Perceptron giúp minh họa cách học ranh giới nhưng chỉ giải được một số kiểu tách tuyến tính.
2. **Mạng nhiều lớp:** thêm lớp ẩn và hàm phi tuyến để biểu diễn quan hệ phức tạp hơn. Cần cách tính tác động của lỗi từ đầu ra quay về các trọng số phía trước.
3. **Backpropagation:** truyền gradient ngược qua các lớp để có thể cập nhật nhiều tầng bằng các phương pháp tối ưu như Gradient Descent.
4. **Dữ liệu và phần cứng:** dữ liệu số hóa lớn, GPU và thư viện dễ dùng giúp huấn luyện mạng sâu thực tế hơn trong nhiều bài toán.
5. **Mạng chuyên cho cấu trúc dữ liệu:** CNN tận dụng cấu trúc lân cận của ảnh; các kiến trúc khác khai thác chuỗi, âm thanh hoặc quan hệ giữa phần tử.

Đây là bản đồ ý tưởng, không phải danh sách đầy đủ mọi phát minh hay mốc thời gian. Nhiều nhánh nghiên cứu phát triển song song, từng có giai đoạn ít được chú ý rồi quay lại khi điều kiện thay đổi.

## “Sâu” nghĩa là gì?

“Sâu” thường nói tới nhiều tầng biến đổi nối tiếp. Lớp đầu có thể học mẫu đơn giản; lớp sau kết hợp thành mẫu lớn hơn. Với ảnh, các lớp sớm có thể phản ứng với cạnh; lớp sau kết hợp cạnh thành hình dạng, rồi thành bộ phận. Đây là hình dung khái quát, không có nghĩa mọi nơ-ron có một nhãn người đọc được.

Deep Learning vẫn cần dữ liệu đại diện, cách đo lỗi hợp lý, kiểm tra trên dữ liệu mới và người chịu trách nhiệm về việc sử dụng. Nhiều tầng không tự đảm bảo hiểu, đúng hoặc công bằng.

## Nhìn lịch sử như chuỗi điều kiện cùng hội tụ

Có thể nhớ sự phát triển qua bốn câu hỏi. Đầu tiên, làm sao mô tả một quyết định bằng nơ-ron tính tổng đầu vào có trọng số? Tiếp theo, làm sao kết hợp nhiều tầng để biểu diễn quan hệ phi tuyến? Rồi làm sao tính gradient xuyên qua các tầng để cập nhật trọng số? Cuối cùng, có đủ dữ liệu, phần cứng và thư viện để thử nghiệm mạng lớn trên bài toán thật chưa?

Perceptron giúp minh họa ranh giới tuyến tính. Mạng nhiều lớp thêm tầng ẩn và hàm kích hoạt; backpropagation tính đạo hàm cho các tầng; GPU và dữ liệu số hóa làm nhiều thí nghiệm khả thi hơn. CNN khai thác lân cận ảnh; các kiểu kiến trúc khác tận dụng chuỗi hoặc cấu trúc khác. Đây là mạch khái niệm, không khẳng định lịch sử chỉ có những bước này hoặc do một người tạo ra.

## Đánh giá tiến bộ bằng khả năng giải quyết bài toán

Một mạng nhiều tầng có thể học đặc trưng hữu ích, nhưng cũng cần nhãn đáng tin, chi phí tính toán, dữ liệu đại diện và đánh giá độc lập. Trước khi chọn deep learning, hãy so với mô hình đơn giản: nếu mô hình nhỏ đã đủ chính xác, dễ giải thích và rẻ vận hành, mạng lớn chưa chắc là lựa chọn tốt hơn.

## Tự kiểm tra

Vì sao backpropagation quan trọng với mạng nhiều lớp? **Nó giúp tính gradient cho các trọng số ở nhiều tầng để cập nhật mạng.** Chỉ cần mạng sâu là chắc chắn mô hình tốt hơn không? **Không; cần dữ liệu, bài toán và đánh giá phù hợp.**

**Nguồn tham khảo:** [Bài 35 về lịch sử Deep Learning](https://machinelearningcoban.com/).
