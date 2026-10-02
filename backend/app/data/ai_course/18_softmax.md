# Softmax: phân loại từ ba nhóm trở lên

**Mục tiêu:** Chuyển một bộ điểm của nhiều lớp thành xác suất Softmax và giải thích vì sao các xác suất cộng lại bằng 1.

## Khi kết quả có nhiều hơn hai khả năng

Logistic Regression nhị phân thường trả lời câu hỏi thuộc lớp 0 hay lớp 1, như “có vỡ nợ không?”. Nhưng nhận diện ảnh có thể cần chọn mèo, chó hoặc chim. Mô hình cần so sánh một điểm số cho **mỗi lớp** rồi chọn lớp có khả năng cao nhất.

Giả sử mô hình trả về các điểm số (logits):

```text
mèo: 2, chó: 1, chim: 0
```

Điểm cao hơn thường ủng hộ lớp đó, nhưng các số này chưa phải xác suất: `2` không có nghĩa xác suất 200%, và tổng chúng không nhất thiết bằng 1.

## Softmax đổi điểm thành phân phối xác suất

Với điểm `zᵢ` của lớp thứ `i`, Softmax tính:

```text
P(i) = exp(zᵢ) / Σ exp(zⱼ)
```

Ta lấy hàm mũ để các trọng số đều dương, sau đó chia cho tổng để chuẩn hóa. Với ba lớp ở trên, gần đúng:

| Lớp | Điểm `z` | `exp(z)` gần đúng | Xác suất Softmax |
| --- | ---: | ---: | ---: |
| Mèo | 2 | 7.39 | 0.665 = 66.5% |
| Chó | 1 | 2.72 | 0.245 = 24.5% |
| Chim | 0 | 1.00 | 0.090 = 9.0% |
| **Tổng** |  | **11.11** | **1.000 = 100%** |

Vì cùng chia cho tổng, các xác suất cộng thành 1. Dự đoán chọn mèo vì xác suất 0.665 lớn nhất. Điều đó chỉ nói mô hình ưu tiên mèo trong ba lựa chọn đã đưa vào.

## Học từ dữ liệu như thế nào?

Trong huấn luyện, mỗi ảnh có nhãn thật, chẳng hạn “chó”. Mô hình tạo ba điểm, Softmax đổi chúng thành xác suất, rồi hàm mất mát đo mức độ mô hình đã đặt xác suất vào đúng lớp. **Cross-entropy** phạt nặng khi mô hình tự tin vào lớp sai. Gradient Descent dùng độ lớn và chiều của lỗi để điều chỉnh trọng số, giống nguyên tắc đã học ở bài hồi quy.

Khi một lớp đúng có xác suất thấp, mô hình cần cập nhật để tăng điểm tương đối của lớp đó và giảm điểm của các lớp không đúng. Quá trình lặp nhiều mẫu giúp mô hình học được ranh giới giữa các loại.

## Softmax khác sigmoid nhiều nhãn

- **Một trong nhiều lớp loại trừ nhau:** ảnh chỉ có một nhãn chính trong `{mèo, chó, chim}`. Softmax phù hợp vì xác suất các lớp cạnh tranh và cộng thành 1.
- **Nhiều nhãn có thể cùng đúng:** ảnh có thể vừa có chó vừa có người. Thường dùng một sigmoid riêng cho mỗi nhãn; xác suất không cần cộng thành 1.

Chọn sai cách diễn đạt bài toán sẽ làm mô hình buộc các kết quả vào nhau một cách không hợp lý. Ví dụ ảnh có thể chứa cả người và chó, nên không nên ép tổng hai xác suất thành đúng 100% nếu mục tiêu là nhận ra tất cả vật thể.

## Xác suất không tự động là độ tin cậy hoàn hảo

Con số `66.5%` là đầu ra của mô hình. Chỉ khi mô hình được hiệu chỉnh và kiểm tra phù hợp mới nên hiểu rằng trong nhiều dự đoán tương tự, khoảng hai phần ba là đúng. Điểm Softmax cao không chứng minh ảnh rõ, dữ liệu đại diện hay hệ thống an toàn. Hãy xem tập kiểm thử và các lỗi theo từng lớp.

## Tự kiểm tra

Nếu Softmax cho `{0.1, 0.7, 0.2}`, lớp nào được dự đoán? **Lớp thứ hai**, vì `0.7` lớn nhất. Tổng ba giá trị là bao nhiêu? **1.0.** Nếu một ảnh được phép có hai nhãn đúng cùng lúc, Softmax có phải lựa chọn mặc định không? **Không; cần cách phân loại nhiều nhãn, thường dùng sigmoid độc lập cho từng nhãn.**

**Nguồn:** [MLP phân loại nhiều lớp và xác suất Softmax trong tài liệu scikit-learn](https://scikit-learn.org/stable/modules/neural_networks_supervised.html) và [lộ trình AI trên OLM](https://olm.vn/bg/tri-tue-nhan-tao).
