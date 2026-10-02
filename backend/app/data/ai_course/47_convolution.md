# Bài 37: Tích chập hai chiều trong CNN

**Mục tiêu:** Diễn giải được kernel, phép trượt, feature map và lý do CNN thường phù hợp ảnh hơn mạng Dense thuần.

## Nhìn vùng nhỏ thay vì nối mọi pixel cùng lúc

Ảnh có các pixel gần nhau thường liên quan: cạnh, nét bút và góc được tạo bởi những vùng cục bộ. Lớp **Conv2D** đặt một bộ lọc nhỏ (kernel) lên một vùng ảnh, nhân từng pixel với trọng số tương ứng rồi cộng lại. Sau đó bộ lọc trượt sang vùng kế tiếp và lặp phép tính.

```text
Ảnh đầu vào → kernel trượt qua từng vùng → bản đồ đặc trưng (feature map)
```

Kernel ban đầu có trọng số cần học. Một kernel có thể học phản ứng với cạnh dọc, nét cong hoặc họa tiết; chương trình không cần ta đặt tên cho bộ lọc trước.

## Một ví dụ kích thước

Ảnh xám `28 × 28` đưa qua kernel `3 × 3` với bước trượt 1 và không thêm viền (`valid`) cho bản đồ `26 × 26` từ mỗi bộ lọc. Nếu có 32 bộ lọc thì đầu ra có 32 bản đồ, thường viết `26 × 26 × 32`. Với `padding="same"` và bước 1, chiều cao/rộng giữ nguyên; padding thêm giá trị viền để bộ lọc vẫn tính được ở sát mép.

- **Kernel size:** kích thước vùng nhìn một lần.
- **Stride:** số ô dịch chuyển mỗi lần; stride lớn làm đầu ra nhỏ hơn.
- **Padding:** có thêm viền hay không.
- **Số bộ lọc:** số loại mẫu mà lớp có thể phản ứng; đồng thời là số kênh đầu ra.

Điểm tiết kiệm quan trọng là cùng một bộ trọng số được dùng ở mọi vị trí. Mạng không cần học một bộ lọc riêng cho từng góc ảnh, nên số tham số ít hơn so với nối toàn bộ pixel với mọi nơ-ron Dense.

## CNN ghép nhiều lớp

Lớp đầu có thể phát hiện cạnh nhỏ; các lớp sau kết hợp chúng thành nét, góc hoặc bộ phận lớn hơn. **Pooling** đôi khi giảm kích thước bản đồ, nhưng đây là phép lấy mẫu gộp riêng, không phải bản thân phép tích chập. Cuối mạng, các đặc trưng được đưa vào lớp phân loại.

CNN không tự hiểu nội dung ảnh và cũng có thể nhầm khi ảnh khác ánh sáng, góc nhìn hoặc nhóm dữ liệu huấn luyện. Cần chuẩn hóa đầu vào, kiểm tra lỗi theo nhóm và dùng tập test độc lập.

## Tự kiểm tra

Kernel `3×3` quét trên ảnh để làm gì? **Tính phản hồi cục bộ tại từng vị trí và tạo feature map.** Vì sao CNN dùng lại một kernel ở nhiều nơi? **Để phát hiện cùng kiểu mẫu ở các vị trí khác nhau và giảm số trọng số cần học.**

**Nguồn:** [Bài 37 về tích chập hai chiều](https://machinelearningcoban.com/) và [tài liệu Conv2D chính thức của Keras](https://keras.io/api/layers/convolution_layers/convolution2d/).
