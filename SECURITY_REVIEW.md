# Kiểm tra bảo mật Quiz_SP local — 20/10/2026

Phạm vi: frontend tại `http://localhost:5173`, backend local, mã nguồn và các
thư viện đang cài. Không kiểm thử máy chủ Learning hay VPS. Các phép thử ghi dữ
liệu dùng tài khoản, đề và bài làm riêng rồi xóa; không sửa đáp án ngân hàng thật.

## Lỗi đã tái hiện và sửa

| Vấn đề | Trước khi sửa | Sau khi sửa |
|---|---|---|
| **Nghiêm trọng: khóa JWT mặc định** | Token tự ký bằng khóa công khai trong cấu hình được `/auth/me` chấp nhận, HTTP 200; có thể mạo danh tài khoản nếu biết ID | Sinh khóa riêng trong `.env` đã được Git bỏ qua, bắt buộc cấu hình khóa đủ dài, từ chối khóa mẫu; token cũ/tự ký bằng khóa mẫu trả 401 |
| **Cao: xem đáp án khi chưa nộp** | `GET /attempts/{id}/result` trả 200 và `questions_review` chứa khóa đáp án cho bài còn `IN_PROGRESS` | Trả 409 cho tới khi bài đã nộp |
| **Cao: lộ ghi chú đáp án trong đề đang làm** | Dữ liệu `answer_reference` được trả nguyên vẹn cùng cấu hình câu hỏi | Dùng danh sách trường hiển thị được phép, lọc cả thuộc tính phụ của lựa chọn; không gửi ghi chú nhập liệu/khóa đáp án |
| **Trung bình: lưu câu không thuộc đề** | Có thể ghi câu trả lời vào attempt của mình cho ID câu nằm ngoài đề, HTTP 200 | Kiểm tra quan hệ đề–câu hỏi trước khi ghi, trả 404 |

Đồng thời sửa việc trả hai danh sách ghép cặp theo cùng thứ tự và việc dùng
`correct_order` làm thứ tự hiển thị ban đầu. Các mục được trộn ổn định bằng seed
HMAC có khóa riêng, tránh suy ngược phép trộn chỉ từ ID công khai. Không thay đổi
khóa đáp án lưu trong cơ sở dữ liệu.

## Gia cố bổ sung

- Token access/refresh gắn với dấu vân tay HMAC của mật khẩu đã băm: đổi mật khẩu
  hoặc vô hiệu hóa tài khoản sẽ làm phiên cũ mất hiệu lực. Token bắt buộc có hạn
  dùng, đúng loại; kiểm tra UUID trước khi truy vấn.
- Giới hạn gọi auth ở Nginx và backend; giới hạn gọi AI theo tài khoản. Có phản
  hồi 429 và `Retry-After` ở backend.
- Giới hạn dung lượng request trước khi phân tích JSON/multipart, bao gồm request
  truyền theo từng đoạn. Giới hạn riêng cho auth, AI, ảnh và backup; câu trả lời
  tối đa 64 KiB. Chặn mật khẩu vượt giới hạn 72 byte UTF-8 của bcrypt.
- Khóa hàng khi mở lượt, lưu đáp án và chấm bài để tránh tạo lượt trùng hoặc sửa
  đáp án đồng thời với việc chấm.
- Không trả nội dung exception/chi tiết kết nối cơ sở dữ liệu cho trình duyệt.
- Bổ sung CSP, chống nhúng iframe, `nosniff`, chính sách referrer và `no-store`
  cho API. Giới hạn xử lý KaTeX; escape HTML trong nhánh xử lý lỗi.
- Cổng Postgres và backend local chỉ bind vào loopback; frontend vẫn phục vụ ở
  cổng 5173 cho luồng sử dụng hiện có.
- Cập nhật `source-map-js` từ 1.2.1 lên 1.2.2, nâng pip/setuptools trong image
  backend, dùng `npm ci` để dựng đúng dependency lockfile.

## Kết quả xác minh

- **64 kiểm thử backend đạt**, gồm các kiểm thử hồi quy bảo mật mới.
- **9 kiểm thử frontend đạt**, gồm marker HTML giả, HTML trong công thức, liên kết
  JavaScript và macro đệ quy.
- Các phép thử HTTP trực tiếp xác nhận: token giả bị chặn, SQL injection ở đăng
  nhập không vượt xác thực; học sinh không đọc được ngân hàng giáo viên, backup,
  bài làm của người khác hoặc quiz nháp.
- Gửi `role: ADMIN` khi đăng ký vẫn tạo STUDENT; sửa profile không nâng quyền
  hay đổi email qua trường không được hỗ trợ.
- Bốn yêu cầu bắt đầu đồng thời chỉ nhận **một** attempt; ba yêu cầu nộp đồng thời
  trả cùng kết quả 100%. Bài đã đóng không sửa được; giới hạn số lượt được giữ.
- Đổi mật khẩu tài khoản thử làm token access và refresh cũ bị từ chối; đăng nhập
  bằng mật khẩu mới vẫn thành công. Gọi đăng nhập dồn dập nhận 429.
- Thử lại toàn bộ ngân hàng thật bằng tài khoản tạm qua API: **239/239, 100%**.
  Bài làm và tài khoản thử đã xóa. Quiz 239 vẫn PUBLISHED, quiz 17 vẫn DRAFT.
- Chromium headless: admin đăng nhập, xem đủ 17 câu ở preview; student đăng nhập
  ở viewport điện thoại 390×844. Các mẫu XSS được đưa vào phản hồi giả trong
  trình duyệt cho câu hỏi, giải thích AI và bài học: không thực thi, không tạo
  thuộc tính `onerror`, công thức bình thường vẫn hiển thị, không có lỗi runtime.
  Không gọi mô hình AI thật cho các phép thử này.
- `npm audit`: **0 cảnh báo đã biết** sau cập nhật.
- `pip-audit` trên danh sách phiên bản thực tế trong image: **0 cảnh báo đã biết**
  sau cập nhật. Các cảnh báo trước đó nằm ở công cụ pip/setuptools, không phải
  bằng chứng rằng endpoint của ứng dụng đã bị khai thác qua chúng.
- Dữ liệu thử được dọn bằng `finally`; truy vấn sau kiểm thử xác nhận không còn
  tài khoản/quiz có tiền tố `audit-`.

## Phạm vi và giới hạn

Đây là kiểm tra có mục tiêu trên bản local, không phải chứng nhận rằng ứng dụng
không còn lỗ hổng. Chưa đánh giá TLS, proxy và cấu hình thật của VPS/Cloudflare,
không chạy kiểm thử gây tải lớn. Giới hạn backend hiện giữ trong bộ nhớ một tiến
trình; khi chạy nhiều worker/replica cần kho giới hạn dùng chung hoặc gateway.
HTTP trên mạng LAN vẫn cần HTTPS khi dùng ngoài máy cá nhân.

Khóa JWT mới làm các phiên cũ cần đăng nhập lại. Khóa được giữ trong `.env`,
không ghi vào tài liệu, mã nguồn hay báo cáo. Chưa commit hoặc push các thay đổi.

Tài liệu tham chiếu: [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html),
[OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).
