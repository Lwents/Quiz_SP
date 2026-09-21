# 🎓 Quiz_SP - Hệ Thống Luyện Tập & Trắc Nghiệm Trực Tuyến

Hệ thống Website Full-stack hoàn chỉnh phục vụ thi và luyện tập trắc nghiệm trực tuyến theo đúng đặc tả kiến trúc hiện đại, type-safe và mở rộng linh hoạt:
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, Lucide React, Zustand, React Router v6.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, JWT Auth, Bcrypt.
- **Database**: PostgreSQL 16 Alpine (Asyncpg driver, UUID, JSONB).
- **DevOps**: Docker, Docker Compose đa container, Nginx alpine reverse proxy.

---

## 🚀 Khởi chạy hệ thống bằng Docker Compose

Chỉ cần một lệnh duy nhất:

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

## 👥 Tài khoản Demo có sẵn trong hệ thống

| Vai trò (Role) | Email đăng nhập | Mật khẩu | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **STUDENT** (Học sinh) | `student@example.com` | `REDACTED_SEED_PASSWORD` | Xem danh sách bài tập, lọc theo môn/chủ đề, làm bài với bộ đếm thời gian, lưu tiến độ realtime (autosave), nộp bài, xem giải thích chi tiết và dashboard thống kê. |
| **TEACHER** (Giáo viên) | `teacher@example.com` | `REDACTED_SEED_PASSWORD` | Quản trị ngân hàng đề thi, tạo bài thi mới, tạo và chỉnh sửa câu hỏi đa dạng (Single, Multiple, Matching, Fill Blank, Ordering...), sắp xếp câu hỏi, Publish đề thi. |
| **ADMIN** (Quản trị viên) | `admin@example.com` | `REDACTED_SEED_PASSWORD` | Toàn quyền kiểm soát hệ thống, người dùng, ngân hàng câu hỏi và điểm số. |

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
