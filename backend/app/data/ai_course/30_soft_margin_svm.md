# Bài 20: Soft margin khi dữ liệu không hoàn hảo

**Mục tiêu:** Hiểu vì sao SVM cho phép một số mẫu lọt vào lề, vai trò của `C` và cách đánh đổi giữa biên rộng với lỗi train.

## Trong dữ liệu thật, hai lớp hay chồng lên nhau

Điểm đo có nhiễu, ảnh có thể mờ, khách thuộc kiểu lai giữa hai nhóm. Nếu bắt SVM phân loại đúng mọi điểm train bằng một đường thẳng, thuật toán có thể xoay đường rất mạnh theo một mẫu lạ. **Soft margin** cho phép một số điểm nằm trong lề hoặc thậm chí ở phía sai, đồng thời phạt mức vi phạm.

Hãy hình dung dải an toàn giữa hai làn đường. Một số xe đi sát hoặc lấn nhẹ qua vạch có thể chấp nhận, miễn là toàn bộ luồng giao thông ổn định hơn. Hard margin không cho phép vi phạm; soft margin cân bằng giữa độ rộng dải và số lần lấn.

## `C` đặt mức phạt

`C` điều khiển mức độ SVM coi trọng lỗi/vi phạm trên dữ liệu train:

- **C lớn:** phạt vi phạm nặng. Mô hình cố phân loại mẫu train đúng hơn, có thể thu hẹp lề và dễ nhạy với nhiễu.
- **C nhỏ:** chấp nhận vi phạm nhiều hơn để ưu tiên lề rộng; có thể bỏ qua cấu trúc thật nếu phạt quá nhẹ.

Không có giá trị `C` đúng cho mọi bộ dữ liệu. Chọn nó trên tập validation hoặc bằng cross-validation. Tập test chỉ dùng sau cùng để ước lượng kết quả.

## Thử một tình huống

Một điểm màu đỏ nằm lẫn vào đám xanh do người nhập sai nhãn. Với C quá lớn, SVM có thể uốn hoặc xoay ranh giới để chiều theo điểm sai, làm nhiều điểm bình thường bị xếp xấu hơn. C nhỏ hơn có thể giữ ranh giới gọn, chấp nhận sai mẫu bất thường ấy. Nhưng nếu cả cụm đỏ thật sự chồng lấn xanh, C quá nhỏ có thể làm mô hình bỏ qua tín hiệu cần thiết.

## Tính slack để hiểu soft margin

Với một mẫu, đặt y là nhãn −1 hoặc +1 và f(x) là điểm có dấu của mô hình. Số vi phạm lề là ξ=max(0,1−y f(x)). Nếu một mẫu dương có y f(x)=0.6, mô hình đoán đúng phía nhưng chưa đủ xa lề; ξ=0.4. Nếu y f(x)=−0.3, mẫu nằm sai phía đường biên; ξ=1.3.

Soft-margin SVM cân bằng hai việc: giữ lề rộng qua thành phần ½||w||² và phạt vi phạm qua C×tổng ξ. C lớn làm lỗi trên train đắt hơn nên mô hình cố chiều theo các điểm khó; điều này có thể nhạy với nhãn sai. C nhỏ chấp nhận nhiều vi phạm hơn để giữ ranh giới đơn giản, nhưng quá nhỏ có thể bỏ qua cấu trúc thật.

## Chọn C có căn cứ

Chuẩn hóa đặc trưng trước, rồi thử vài giá trị C trên cùng các folds của cross-validation. Chọn theo chỉ số phù hợp mục tiêu, chẳng hạn recall nếu bỏ sót lớp bệnh nguy hiểm là chi phí lớn. Chỉ mở tập test một lần để báo kết quả cuối; nếu dùng test để chọn C, điểm test sẽ lạc quan vì ta đã điều chỉnh theo nó.

Slack không phải nhãn “dữ liệu sai”. Một điểm có slack có thể là ngoại lệ thật, nhiễu đo, hoặc dấu hiệu mô hình chưa đủ phù hợp. Cần xem lại nguồn dữ liệu và đánh giá sai lầm theo nhóm.

## Tự kiểm tra

Tăng C sẽ làm mô hình nhạy hơn hay dung thứ hơn với lỗi train? **Nhạy hơn, vì mức phạt vi phạm tăng.** Điều đó có đảm bảo test tốt hơn không? **Không; cần chọn bằng validation và đánh giá cuối trên test.**

**Nguồn tham khảo:** [Bài 20 về SVM soft margin](https://machinelearningcoban.com/).
