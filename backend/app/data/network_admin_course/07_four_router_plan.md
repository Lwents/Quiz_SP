# Tự thiết kế bài ba và bốn router

**Mục tiêu:** Lập bảng địa chỉ, cấu hình và tự kiểm tra bài tập Tuần 3–4 mà không dùng trùng mạng con.

## Hai đề bài được giao

1. Thiết lập mạng có **ba router và các PC**, chỉ lấy địa chỉ từ khối `195.10.10.0/24`.
2. Thiết lập mạng có **bốn router và các PC**, chỉ lấy địa chỉ từ khối `200.10.STT.0/24`; thay `STT` bằng số thứ tự được giảng viên quy định.

Các địa chỉ trên là yêu cầu của bài mô phỏng. Khi dựng hệ thống thật, phải dùng khối địa chỉ đã được cấp hợp lệ; tránh đưa các IP ví dụ này vào mạng đang vận hành.

## Cách thiết kế

Trước tiên vẽ các liên kết: mỗi LAN cần một mạng con, mỗi đường nối router cũng cần một mạng con riêng. Đếm tổng số mạng con, chọn subnet mask đủ tạo ra số mạng cần dùng, rồi phân địa chỉ mạng theo bước nhảy của mask. Lập bảng gồm thiết bị, cổng, IP, mask, gateway/tuyến và trạng thái `up/down`.

Với ba router kiểu tam giác và ba LAN, cần sáu mạng con. Chia `/24` thành tám mạng `/27` là cách trực quan trong hướng dẫn. Với bốn router, số liên kết phụ thuộc sơ đồ bạn chọn; không có một đáp án địa chỉ duy nhất. Hãy giữ lại sơ đồ, bảng địa chỉ, bảng định tuyến và kết quả ping làm minh chứng.

## Kiểm tra theo từng chặng

Ping PC đến gateway trước. Sau đó kiểm tra hai đầu của từng liên kết router. Cuối cùng kiểm tra ping giữa các PC ở các LAN khác nhau. Nếu một chiều đi được còn chiều về lỗi, kiểm tra tuyến chiều về và các khai báo RIP.
