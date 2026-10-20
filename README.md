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

### Dùng chung dữ liệu giữa local và website

Đặt `BACKEND_UPSTREAM` trong `.env` ở thư mục gốc thành URL backend HTTPS đã triển khai, gồm cả tiền tố đường dẫn nếu có, không thêm dấu `/` cuối. Ví dụ: `BACKEND_UPSTREAM=https://api.example.com/quiz`.

Frontend Docker và Vite sẽ chuyển cả `/api/` và `/media/` tới backend đó. Để `VITE_API_URL` trống khi chạy local để các yêu cầu đi qua proxy. Đây là dùng chung API/database, không phải đồng bộ hai database: mọi thay đổi dữ liệu qua frontend local sẽ ghi trực tiếp lên máy chủ. Bản database local vẫn được giữ riêng; API ở cổng 8000 vẫn là backend local.

Sau khi đổi cấu hình, chạy `docker compose up -d --build --no-deps frontend`, hoặc khởi động lại `npm run dev` trong thư mục `frontend`. Đăng nhập lại bằng tài khoản của website nếu phiên local cũ không còn hợp lệ. Nếu để `BACKEND_UPSTREAM` trống, Docker và Vite trở lại dùng backend local mặc định. Khi dùng chung dữ liệu, local cần kết nối Internet.

### Chuyển một bản sao dữ liệu

Đăng nhập bằng tài khoản `ADMIN`, bấm biểu tượng **Cài đặt sao lưu dữ liệu** trên thanh đầu trang hoặc mở `/settings/backup`.

1. Ở máy nguồn, chọn **Tải bản sao lưu** và giữ tệp JSON tải về ở nơi riêng tư.
2. Ở máy đích đã cài cùng phiên bản ứng dụng, mở trang này bằng tài khoản admin tạm thời, chọn tệp và bấm **Xem trước bản sao lưu**. Kiểm tra ngày tạo cùng số tài khoản, khóa học, câu hỏi và bài làm.
3. Sao lưu dữ liệu hiện có ở máy đích nếu cần giữ lại. Nhập `KHOI PHUC`, bấm **Khôi phục và thay thế dữ liệu**, rồi đăng nhập lại bằng tài khoản trong bản sao lưu.

Khôi phục thay thế toàn bộ 10 bảng dữ liệu của ứng dụng trong một giao dịch; tệp sai hoặc thao tác thất bại không làm thay đổi dữ liệu cũ. Tệp chứa cả thông tin cá nhân và mã băm mật khẩu, nên không đăng công khai. Giới hạn tệp là 50 MB. Khóa API, JWT secret, biến `.env` và tệp bên ngoài được nhúng bằng URL không được sao lưu; hãy cấu hình lại chúng trên máy đích. Máy chủ chỉ nạp dữ liệu mẫu khi cơ sở dữ liệu trống, nên khởi động lại sau khôi phục không tạo lại dữ liệu mẫu.

---

## Dữ liệu khi cài mới

Cơ sở dữ liệu mới chỉ có tài khoản quản trị từ biến môi trường. Backend không tự tạo môn học, chủ đề, bài học, câu hỏi hay đề thi. Nội dung chỉ có sau khi quản trị viên tạo hoặc nhập dữ liệu.

Khởi động lại và triển khai bản mới không nạp lại dữ liệu mẫu hoặc xóa dữ liệu đang có. Dữ liệu đã nạp ở bản cũ cần được xóa riêng nếu muốn bắt đầu trống.

## Triển khai tự động

Xem [DEPLOYMENT.md](DEPLOYMENT.md) để cấu hình GitHub Actions, Cloudflare Pages và Docker trên VPS.

---

## 🧪 Chạy Kiểm Thử (Unit Tests)

Hệ thống đi kèm bộ kiểm thử tự động cho Scoring Engine:

```bash
docker run --rm -e PYTHONPATH=/app quiz_sp-backend pytest -v
```
