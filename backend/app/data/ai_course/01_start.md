# Bắt đầu học Trí tuệ nhân tạo từ một ví dụ gần gũi

**Mục tiêu:** Biết AI, học máy, dữ liệu, đặc trưng và nhãn là gì trước khi chạy bất kỳ đoạn mã nào.

## Một ví dụ xuyên suốt khóa học

Giả sử ta có bảng thông tin khách hàng: thu nhập, điểm tín dụng và quyết định có duyệt khoản vay hay không. Con người có thể đọc từng dòng và rút kinh nghiệm. **Học máy** làm việc tương tự: chương trình nhìn nhiều ví dụ đã có đáp án, tìm một quy luật, rồi áp dụng quy luật đó cho khách hàng mới. Nó không tự biết đúng sai nếu dữ liệu và mục tiêu bị đặt sai.

**Trí tuệ nhân tạo (AI)** là lĩnh vực rộng hơn: tạo hệ thống có thể giải quyết công việc thường cần suy luận hoặc nhận biết. **Học máy (ML)** là một cách làm AI bằng cách học quy luật từ dữ liệu. Trong khóa tham khảo trên OLM còn có cách làm AI bằng tìm kiếm trên đồ thị và ràng buộc; ta sẽ gặp chúng ở phần mở rộng.

## Đọc một bảng dữ liệu

| Cột | Vai trò | Ví dụ |
| --- | --- | --- |
| `income` | Đặc trưng đầu vào | 25 triệu đồng/tháng |
| `credit_score` | Đặc trưng đầu vào | 720 điểm |
| `approved` | Nhãn cần học | 1 = duyệt, 0 = từ chối |

Một hàng là **một mẫu**. Nếu có 20 khách hàng và 2 đặc trưng, ma trận đầu vào `X` có kích thước `20 × 2`: 20 hàng, 2 cột. Mảng nhãn `y` có 20 giá trị. Ký hiệu `X` thường viết hoa vì là bảng; `y` thường viết thường vì là một cột kết quả.

> Một mô hình nhìn thu nhập và điểm tín dụng để dự đoán quyết định cho vay **không phải** lời khuyên cho vay thật. Đây là ví dụ học tập; trong thực tế cần dữ liệu đáng tin và kiểm tra công bằng.

## Bốn câu hỏi phải trả lời trước khi huấn luyện

1. **Đầu vào là gì?** Ví dụ thu nhập và điểm tín dụng.
2. **Đầu ra là gì?** Một số liên tục như lượng CO₂, hay một nhãn như duyệt/từ chối?
3. **Có bao nhiêu dữ liệu?** Vài chục mẫu chỉ đủ minh họa, chưa đủ để khẳng định mô hình đáng tin ngoài đời.
4. **Đánh giá trên dữ liệu nào?** Phải giữ lại dữ liệu chưa dùng để huấn luyện.

Nếu đầu ra là một con số liên tục, ta bắt đầu với **hồi quy tuyến tính**. Nếu đầu ra là một nhóm, ta học **Perceptron** và **Logistic Regression**. Đây cũng là thứ tự các bài thực hành được giao trong nhóm lớp.

## Tự kiểm tra

Một bảng có 30 xe, mỗi xe có trọng lượng và dung tích động cơ để dự đoán CO₂. `X` có mấy hàng, mấy cột? `y` có bao nhiêu giá trị? **Đáp án:** `X` là `30 × 2`; `y` có 30 giá trị. Số cột bằng số đặc trưng, không tính nhãn.

**Nguồn và lộ trình:** [Khóa Trí tuệ nhân tạo trên OLM](https://olm.vn/bg/tri-tue-nhan-tao). Nội dung trên trang nguồn có thể yêu cầu đăng nhập để đọc từng bài.
