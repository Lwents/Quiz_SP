"""Idempotently add beginner-friendly AI lessons from class assignments and sources.

Existing topic and lesson records remain untouched so teacher edits survive
backend restarts. All lesson text is original and stored in app/data/ai_course.
"""

from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.lesson import Lesson
from app.models.quiz import Subject, Topic


SUBJECT_CODE = "AI-K74"
CONTENT_DIR = Path(__file__).resolve().parent / "data" / "ai_course"

CURRICULUM = [
    ("Bắt đầu: hiểu dữ liệu trước khi chạy mô hình", "Đặc trưng, nhãn, tập huấn luyện và tập kiểm thử.", [
        ("01_start.md", "AI, học máy, đặc trưng và nhãn", 18),
        ("02_train_test.md", "Vì sao phải tách train và test?", 18),
    ]),
    ("Tuần 1: Hồi quy tuyến tính và bài CO₂", "Bài hồi quy nhiều biến thầy gửi ngày 11/09 và tài liệu W3Schools.", [
        ("03_linear.md", "Hồi quy tuyến tính: dự đoán một con số", 20),
        ("04_multiple_co2.md", "Bài CO₂ với Volume và Weight", 25),
    ]),
    ("Tuần 2: Gradient Descent", "Bài nộp trên CST và notebook thực hành so sánh ba cách giải.", [
        ("05_gradient.md", "Gradient Descent: sửa trọng số từng bước", 23),
        ("06_three_ways.md", "So sánh pinv, scikit-learn và Gradient Descent", 25),
    ]),
    ("Tuần 3: Phân loại bằng Perceptron", "Bài 20 khách train, 10 khách test, dự đoán khách mới và so sánh sklearn.", [
        ("07_pla.md", "PLA: học đường chia hai nhóm", 22),
        ("08_pla_practice.md", "Thực hành PLA theo bài thầy giao", 28),
    ]),
    ("Bài tiếp theo: Logistic Regression", "Notebook Colab Tùng chia sẻ và bài phân loại vỡ nợ 2/8 đặc trưng.", [
        ("09_logistic.md", "Logistic Regression và ý nghĩa xác suất", 22),
        ("10_logistic_practice.md", "Bài 2 đặc trưng: khách hàng (32, 400)", 25),
        ("11_logistic_evaluation.md", "Bài 8 đặc trưng: đánh giá mô hình trên test", 28),
    ]),
    ("Đọc thêm theo lộ trình OLM", "Tìm kiếm, K-means, Softmax và mạng nhiều lớp; tách khỏi bài thầy đã giao.", [
        ("12_roadmap.md", "Bản đồ các chủ đề AI tiếp theo", 20),
    ]),
    ("Chương 7: Tìm lời giải bằng tìm kiếm", "Tìm đường, chọn nước đi và giải bài toán có ràng buộc; đây là phần mở rộng theo lộ trình AI.", [
        ("13_bfs_dfs.md", "BFS và DFS: tìm đường từng bước", 25),
        ("14_heuristic_astar.md", "Heuristic và A*: tìm hướng có triển vọng", 25),
        ("15_game_search.md", "Minimax: máy chọn nước đi trong trò chơi", 25),
        ("16_csp.md", "Bài toán ràng buộc: xếp lịch không bị trùng", 25),
    ]),
    ("Chương 8: Học máy mở rộng", "Phân cụm không nhãn, phân loại nhiều lớp và mạng nơ-ron nhiều tầng; phần đọc thêm sau các bài cơ bản.", [
        ("17_kmeans.md", "K-means: tự gom nhóm dữ liệu chưa có nhãn", 25),
        ("18_softmax.md", "Softmax: phân loại từ ba nhóm trở lên", 25),
        ("19_mlp.md", "MLP: học ranh giới phi tuyến bằng nhiều lớp", 30),
    ]),
]


async def seed_ai_course() -> dict[str, int]:
    added_topics = 0
    added_lessons = 0
    async with AsyncSessionLocal() as db:
        subject = (await db.execute(select(Subject).where(Subject.code == SUBJECT_CODE))).scalar_one_or_none()
        if subject is None:
            subject = Subject(
                code=SUBJECT_CODE,
                name="Trí tuệ nhân tạo",
                description=(
                    "Khóa học dễ hiểu cho người mới: hồi quy, Gradient Descent, Perceptron "
                    "và Logistic Regression theo bài nhóm TTNT K74; phần mở rộng theo lộ trình OLM."
                ),
            )
            db.add(subject)
            await db.flush()

        for topic_order, (name, description, lessons) in enumerate(CURRICULUM, start=1):
            topic = (await db.execute(select(Topic).where(
                Topic.subject_id == subject.id, Topic.name == name
            ))).scalar_one_or_none()
            if topic is None:
                topic = Topic(subject_id=subject.id, name=name, description=description, order=topic_order)
                db.add(topic)
                await db.flush()
                added_topics += 1

            for lesson_order, (filename, title, duration) in enumerate(lessons, start=1):
                content = (CONTENT_DIR / filename).read_text(encoding="utf-8")
                if not content.startswith("# ") or "**Mục tiêu:**" not in content:
                    raise ValueError(f"Invalid AI lesson: {filename}")
                existing = (await db.execute(select(Lesson.id).where(
                    Lesson.topic_id == topic.id, Lesson.title == title
                ))).scalar_one_or_none()
                if existing:
                    continue
                objective = content.split("**Mục tiêu:**", 1)[1].splitlines()[0].strip()
                db.add(Lesson(
                    topic_id=topic.id, title=title, description=objective,
                    content=content, duration_minutes=duration, order=lesson_order,
                ))
                added_lessons += 1

        await db.commit()
    return {"topics": len(CURRICULUM), "lessons": sum(len(item[2]) for item in CURRICULUM),
            "added_topics": added_topics, "added_lessons": added_lessons}
