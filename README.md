# 🎓 Quiz_SP - Hệ Thống Luyện Tập & Trắc Nghiệm Trực Tuyến

Hệ thống Website Full-stack hoàn chỉnh phục vụ thi và luyện tập trắc nghiệm trực tuyến theo đúng đặc tả kiến trúc hiện đại, type-safe và mở rộng linh hoạt:
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, Lucide React, Zustand, React Router v6.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, JWT Auth, Bcrypt.
- **Database**: PostgreSQL 16 Alpine (Asyncpg driver, UUID, JSONB).
- **DevOps**: Docker, Docker Compose đa container, Nginx alpine reverse proxy.

---

## 🚀 Khởi chạy hệ thống bằng Docker Compose

Với cơ sở dữ liệu mới, đặt mật khẩu tạo quản trị viên trong file `.env` (file này được Git bỏ qua):

```dotenv
ADMIN_BOOTSTRAP_PASSWORD=<mật khẩu mạnh do bạn tự chọn>
```

Sau đó khởi chạy:

```bash
cd /home/lwent/projects/Quiz_SP
docker compose up -d --build
```

Sau khi khởi động thành công:
- 🌐 **Frontend (Giao diện người dùng & Giáo viên)**: [http://localhost:5173](http://localhost:5173)
- ⚙️ **Backend API**: [http://localhost:8000](http://localhost:8000)
- 📖 **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 🗄️ **PostgreSQL**: `localhost:5433` (database: `quiz_db`, user: `postgres`, pass: `postgres`)

---

## 👥 Tài khoản và vai trò

- **Học sinh:** Đăng ký tại `/register`; tài khoản mới luôn có vai trò `STUDENT`.
- **Giáo viên:** Không có tài khoản mẫu. Tài khoản đã đăng ký cần được cấp vai trò `TEACHER` trong cơ sở dữ liệu; hiện chưa có màn hình cấp vai trò.
- **Quản trị viên:** Dữ liệu khởi tạo tạo `admin@gmail.com` khi cơ sở dữ liệu mới, với mật khẩu từ `ADMIN_BOOTSTRAP_PASSWORD`. Có thể đổi email ban đầu qua `ADMIN_BOOTSTRAP_EMAIL`. Khởi động lại không đặt lại mật khẩu của tài khoản đã tồn tại.

Các tài khoản mẫu `student@example.com`, `teacher@example.com` và `admin@example.com` không được cấp sẵn. Dữ liệu tài khoản đã tồn tại được giữ nguyên khi khởi động lại.

---

## 💾 Sao lưu và chuyển dữ liệu sang máy khác

Đăng nhập bằng tài khoản `ADMIN`, bấm biểu tượng **Cài đặt sao lưu dữ liệu** trên thanh đầu trang hoặc mở `/settings/backup`.

1. Ở máy nguồn, chọn **Tải bản sao lưu** và giữ tệp JSON tải về ở nơi riêng tư.
2. Ở máy đích đã cài cùng phiên bản ứng dụng, mở trang này bằng tài khoản admin tạm thời, chọn tệp và bấm **Xem trước bản sao lưu**. Kiểm tra ngày tạo cùng số tài khoản, khóa học, câu hỏi và bài làm.
3. Sao lưu dữ liệu hiện có ở máy đích nếu cần giữ lại. Nhập `KHOI PHUC`, bấm **Khôi phục và thay thế dữ liệu**, rồi đăng nhập lại bằng tài khoản trong bản sao lưu.

Khôi phục thay thế toàn bộ 10 bảng dữ liệu của ứng dụng trong một giao dịch; tệp sai hoặc thao tác thất bại không làm thay đổi dữ liệu cũ. Tệp chứa cả thông tin cá nhân và mã băm mật khẩu, nên không đăng công khai. Giới hạn tệp là 50 MB. Khóa API, JWT secret, biến `.env` và tệp bên ngoài được nhúng bằng URL không được sao lưu; hãy cấu hình lại chúng trên máy đích. Máy chủ chỉ nạp dữ liệu mẫu khi cơ sở dữ liệu trống, nên khởi động lại sau khôi phục không tạo lại dữ liệu mẫu.

---

## 🧩 Các Đề Thi & Dữ Liệu Đã Được Nạp Sẵn

1. **Đề thi mẫu đa dạng dạng câu hỏi (`quiz-demo-toan-roi-rac`)**:
   - Gồm 10 câu hỏi bao quát các dạng: *Single Choice*, *Multiple Choice*, *True / False*, *Fill in the Blank*, *Matching*, *Ordering*, *Numeric*, *Short Answer*.
2. **Ngân hàng câu hỏi Toán rời rạc Quiz 1.2 (`quiz-1-2-tuong-duong-logic-vi-ngu-luong-tu`)**:
   - Trọn bộ **23 câu hỏi chuẩn hóa 100% không trùng lặp** từ ngân hàng đề thi HNUE LMS (Tương đương logic, vị ngữ và lượng tử).

---

## 🧪 Chạy Kiểm Thử (Unit Tests)

Hệ thống đi kèm bộ kiểm thử tự động cho Scoring Engine:

```bash
docker run --rm -e PYTHONPATH=/app quiz_sp-backend pytest -v
```
