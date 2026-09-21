import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.quiz import Subject, Topic, Quiz, QuizStatus, DifficultyLevel
from app.models.question import Question, QuestionType, QuizQuestion


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_data():
    await init_db()

    async with AsyncSessionLocal() as session:
        # 1. Seed Users
        user_res = await session.execute(select(User).where(User.email == "student@example.com"))
        student = user_res.scalar_one_or_none()
        if not student:
            student = User(
                email="student@example.com",
                hashed_password=get_password_hash("REDACTED_SEED_PASSWORD"),
                full_name="Nguyễn Văn Học Sinh",
                role=UserRole.STUDENT,
                is_active=True
            )
            session.add(student)

        teacher_res = await session.execute(select(User).where(User.email == "teacher@example.com"))
        teacher = teacher_res.scalar_one_or_none()
        if not teacher:
            teacher = User(
                email="teacher@example.com",
                hashed_password=get_password_hash("REDACTED_SEED_PASSWORD"),
                full_name="ThS. Trần Giáo Viên",
                role=UserRole.TEACHER,
                is_active=True
            )
            session.add(teacher)

        admin_res = await session.execute(select(User).where(User.email == "admin@example.com"))
        admin = admin_res.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@example.com",
                hashed_password=get_password_hash("REDACTED_SEED_PASSWORD"),
                full_name="Quản Trị Hệ Thống",
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(admin)

        await session.commit()
        await session.refresh(teacher)

        # 2. Seed Subjects & Topics
        sub_res = await session.execute(select(Subject).where(Subject.code == "COMP122"))
        subject = sub_res.scalar_one_or_none()
        if not subject:
            subject = Subject(
                name="Toán rời rạc",
                code="COMP122",
                description="Môn học nền tảng khoa học máy tính: Logic mệnh đề, vị ngữ, tập hợp, quan hệ, đại số Boole, đồ thị."
            )
            session.add(subject)
            await session.commit()
            await session.refresh(subject)

        top_res = await session.execute(select(Topic).where(Topic.name == "Logic mệnh đề và suy luận"))
        topic = top_res.scalar_one_or_none()
        if not topic:
            topic = Topic(
                subject_id=subject.id,
                name="Logic mệnh đề và suy luận",
                description="Các phép toán logic, bảng chân trị, tương đương logic, lượng tử và vị từ."
            )
            session.add(topic)
            await session.commit()
            await session.refresh(topic)

        # 3. Seed Demo Quiz (meeting requirement 37: 2 Single Choice, 2 Multiple Choice, 1 True/False, 1 Fill Blank, 1 Matching, 1 Ordering, 1 Numeric, 1 Short Answer)
        quiz_res = await session.execute(select(Quiz).where(Quiz.slug == "quiz-demo-toan-roi-rac"))
        quiz = quiz_res.scalar_one_or_none()
        if not quiz:
            quiz = Quiz(
                title="Đề thi thử tổng hợp: Đa dạng câu hỏi",
                slug="quiz-demo-toan-roi-rac",
                description="Bài kiểm tra mẫu đầy đủ các dạng câu hỏi: Single Choice, Multiple Choice, True/False, Điền khuyết, Ghép nối, Sắp xếp thứ tự, Tính toán số, Câu hỏi ngắn.",
                subject_id=subject.id,
                topic_id=topic.id,
                difficulty=DifficultyLevel.MEDIUM,
                duration_minutes=20,
                pass_score=5.0,
                max_attempts=0,
                shuffle_questions=False,
                shuffle_answers=False,
                show_answer_after_submit=True,
                status=QuizStatus.PUBLISHED,
                created_by=teacher.id
            )
            session.add(quiz)
            await session.commit()
            await session.refresh(quiz)

            demo_questions = [
                # 1. Single Choice 1
                Question(
                    type=QuestionType.SINGLE_CHOICE,
                    title="Mệnh đề tương đương logic",
                    content="Cho p, q là các mệnh đề. Hãy chỉ ra mệnh đề tương đương logic với ¬(p ∨ q)?",
                    points=1.0,
                    difficulty=DifficultyLevel.EASY,
                    config={
                        "options": [
                            {"id": "a", "text": "¬p ∨ ¬q"},
                            {"id": "b", "text": "¬p ∧ ¬q"},
                            {"id": "c", "text": "p ∨ ¬q"},
                            {"id": "d", "text": "¬p ∨ q"}
                        ],
                        "correct": "b"
                    },
                    explanation="Theo luật De Morgan: ¬(p ∨ q) ≡ ¬p ∧ ¬q.",
                    created_by=teacher.id
                ),
                # 2. Single Choice 2
                Question(
                    type=QuestionType.SINGLE_CHOICE,
                    title="Hằng đúng kéo theo",
                    content="Cho mệnh đề p → (p ∨ q). Phát biểu nào đúng về giá trị chân lý của mệnh đề?",
                    points=1.0,
                    difficulty=DifficultyLevel.EASY,
                    config={
                        "options": [
                            {"id": "a", "text": "Luôn luôn đúng (Hằng đúng)"},
                            {"id": "b", "text": "Luôn luôn sai (Mâu thuẫn)"},
                            {"id": "c", "text": "Sai khi p sai và q đúng"},
                            {"id": "d", "text": "Sai khi p đúng và q sai"}
                        ],
                        "correct": "a"
                    },
                    explanation="Khi p = 1 thì p ∨ q = 1 nên 1 → 1 = 1. Khi p = 0 thì 0 → ... luôn bằng 1. Do đó mệnh đề luôn đúng.",
                    created_by=teacher.id
                ),
                # 3. Multiple Choice 1
                Question(
                    type=QuestionType.MULTIPLE_CHOICE,
                    title="Luật phân phối trong logic",
                    content="Biểu thức nào biểu diễn luật phân phối trong logic mệnh đề? (Chọn 2 đáp án)",
                    points=1.0,
                    difficulty=DifficultyLevel.MEDIUM,
                    config={
                        "options": [
                            {"id": "a", "text": "p ∧ (q ∨ r) ⇔ (p ∧ q) ∨ (p ∧ r)"},
                            {"id": "b", "text": "(p ∨ q) ∨ r ⇔ p ∨ (q ∨ r)"},
                            {"id": "c", "text": "p ∨ (q ∧ r) ⇔ (p ∨ q) ∧ (p ∨ r)"},
                            {"id": "d", "text": "¬(p ∨ q) ⇔ ¬p ∧ ¬q"}
                        ],
                        "correct": ["a", "c"],
                        "allow_partial": True
                    },
                    explanation="Phép hội phân phối đối với phép tuyển và ngược lại: a và c đều là luật phân phối.",
                    created_by=teacher.id
                ),
                # 4. Multiple Choice 2
                Question(
                    type=QuestionType.MULTIPLE_CHOICE,
                    title="Vị từ trên tập số nguyên ℤ",
                    content="Vị từ nào sau đây nhận giá trị đúng khi tập xác định là tập số nguyên ℤ? (Chọn 2 đáp án)",
                    points=1.0,
                    difficulty=DifficultyLevel.MEDIUM,
                    config={
                        "options": [
                            {"id": "a", "text": "∀x (x⁴ ≥ x²)"},
                            {"id": "b", "text": "∃x (x³ = -1)"},
                            {"id": "c", "text": "∃x (x³ = 6)"},
                            {"id": "d", "text": "∀x (2x > x)"}
                        ],
                        "correct": ["a", "b"],
                        "allow_partial": True
                    },
                    explanation="∀x(x⁴ ≥ x²) luôn đúng với x ∈ ℤ vì x²(x²-1) ≥ 0. ∃x(x³ = -1) đúng với x = -1 ∈ ℤ.",
                    created_by=teacher.id
                ),
                # 5. True / False
                Question(
                    type=QuestionType.TRUE_FALSE,
                    title="Tính tương đương của quan hệ phản đảo",
                    content="Mệnh đề kéo theo p → q luôn tương đương logic với mệnh đề phản đảo ¬q → ¬p.",
                    points=1.0,
                    difficulty=DifficultyLevel.EASY,
                    config={
                        "correct": True
                    },
                    explanation="Luật phản đảo khẳng định p → q ≡ ¬q → ¬p luôn đúng với mọi giá trị chân lý của p và q.",
                    created_by=teacher.id
                ),
                # 6. Fill In The Blank
                Question(
                    type=QuestionType.FILL_BLANK,
                    title="Khái niệm vị từ",
                    content="Một câu chứa biến có dạng P(x) trở thành một mệnh đề khi ta gán cho biến x một giá trị cụ thể được gọi là một ______.",
                    points=1.0,
                    difficulty=DifficultyLevel.EASY,
                    config={
                        "accepted_answers": ["vị từ", "hàm mệnh đề", "vi tu", "ham menh de"],
                        "case_sensitive": False
                    },
                    explanation="P(x) được gọi là vị từ (predicate) hoặc hàm mệnh đề (propositional function).",
                    created_by=teacher.id
                ),
                # 7. Matching
                Question(
                    type=QuestionType.MATCHING,
                    title="Ghép nối tương đương logic",
                    content="Hãy ghép nối mỗi mệnh đề ở cột bên trái với mệnh đề tương đương tương ứng ở cột bên phải:",
                    points=1.0,
                    difficulty=DifficultyLevel.HARD,
                    config={
                        "pairs": [
                            {"left": "p → q", "right": "¬p ∨ q"},
                            {"left": "p ↔ q", "right": "¬(p ⊕ q)"},
                            {"left": "¬(p ↔ q)", "right": "¬p ↔ q"},
                            {"left": "¬p ↔ q", "right": "p ↔ ¬q"}
                        ]
                    },
                    explanation="Các hằng đẳng thức tương đương quen thuộc của phép kéo theo và tương đương.",
                    created_by=teacher.id
                ),
                # 8. Ordering
                Question(
                    type=QuestionType.ORDERING,
                    title="Thứ tự ưu tiên các phép toán logic",
                    content="Sắp xếp các phép toán logic sau theo thứ tự ưu tiên thực hiện từ cao nhất (ưu tiên nhất) đến thấp nhất:",
                    points=1.0,
                    difficulty=DifficultyLevel.MEDIUM,
                    config={
                        "correct_order": [
                            "Phép phủ định (¬)",
                            "Phép hội (∧)",
                            "Phép tuyển (∨)",
                            "Phép kéo theo (→)",
                            "Phép tương đương (↔)"
                        ]
                    },
                    explanation="Thứ tự ưu tiên chuẩn trong toán rời rạc: Phủ định (¬) > Hội (∧) > Tuyển (∨) > Kéo theo (→) > Tương đương (↔).",
                    created_by=teacher.id
                ),
                # 9. Numeric
                Question(
                    type=QuestionType.NUMERIC,
                    title="Số lượng dòng trong bảng chân trị",
                    content="Cho một công thức logic có 5 biến mệnh đề phân biệt (p, q, r, s, t). Bảng chân trị của công thức này có bao nhiêu dòng giá trị?",
                    points=1.0,
                    difficulty=DifficultyLevel.EASY,
                    config={
                        "correct": 32,
                        "tolerance": 0.0
                    },
                    explanation="Bảng chân trị với n biến mệnh đề có 2^n dòng. Với n = 5 biến: 2^5 = 32 dòng.",
                    created_by=teacher.id
                ),
                # 10. Short Answer
                Question(
                    type=QuestionType.SHORT_ANSWER,
                    title="Tên luật bù",
                    content="Biểu thức p ∨ ¬p ≡ T biểu diễn quy luật nào trong logic mệnh đề? (Nhập tên quy luật)",
                    points=1.0,
                    difficulty=DifficultyLevel.MEDIUM,
                    config={
                        "accepted_answers": [
                            "luật bài trung",
                            "luật bù",
                            "luật đầy đủ",
                            "bài trung",
                            "luat bai trung",
                            "luat bu",
                            "luat day du"
                        ],
                        "case_sensitive": False
                    },
                    explanation="p ∨ ¬p ≡ T là luật bài trung (Law of Excluded Middle) hay còn gọi là luật bù/luật đầy đủ.",
                    created_by=teacher.id
                )
            ]

            for idx, q_item in enumerate(demo_questions):
                session.add(q_item)
                await session.flush()
                qq = QuizQuestion(
                    quiz_id=quiz.id,
                    question_id=q_item.id,
                    order=idx,
                    points_override=1.0
                )
                session.add(qq)

            await session.commit()
            print("Successfully seeded demo quiz and 10 multi-type questions!")

        # 4. Seed Quiz 1.2: Discrete Mathematics 23 Questions from HNUE LMS
        quiz_12_res = await session.execute(select(Quiz).where(Quiz.slug == "quiz-1-2-tuong-duong-logic-vi-ngu-luong-tu"))
        quiz_12 = quiz_12_res.scalar_one_or_none()
        if not quiz_12:
            quiz_12 = Quiz(
                title="Quiz 1.2: Tương đương logic, vị ngữ, lượng tử",
                slug="quiz-1-2-tuong-duong-logic-vi-ngu-luong-tu",
                description="Toàn bộ ngân hàng đề thi 23 câu hỏi chuẩn hóa môn Toán rời rạc (COMP122) - Khoa CNTT Trường ĐHSP Hà Nội.",
                subject_id=subject.id,
                topic_id=topic.id,
                difficulty=DifficultyLevel.MEDIUM,
                duration_minutes=25,
                pass_score=5.0,
                max_attempts=0,
                shuffle_questions=True,
                shuffle_answers=True,
                show_answer_after_submit=True,
                status=QuizStatus.PUBLISHED,
                created_by=teacher.id
            )
            session.add(quiz_12)
            await session.commit()
            await session.refresh(quiz_12)

            # Load 23 questions from verified_23.json / quiz_data.json
            import json
            import os
            quiz_json_path = "/home/lwent/.openclaw/workspace/quiz_data.json"
            if os.path.exists(quiz_json_path):
                with open(quiz_json_path, "r", encoding="utf-8") as f:
                    q_data = json.load(f)
                    items = q_data.get("questions", [])
                    for order_idx, item in enumerate(items):
                        q_type_enum = QuestionType.SINGLE_CHOICE
                        if item.get("type") == "multiple_choice":
                            q_type_enum = QuestionType.MULTIPLE_CHOICE
                        elif item.get("type") == "matching_group":
                            q_type_enum = QuestionType.MATCHING

                        # Build config
                        cfg = {}
                        if q_type_enum in (QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE):
                            opts = [{"id": chr(97 + i), "text": opt} for i, opt in enumerate(item.get("options", []))]
                            # find correct ids
                            correct_texts = item.get("correct_answers", [])
                            correct_ids = [o["id"] for o in opts if o["text"] in correct_texts]
                            cfg = {
                                "options": opts,
                                "correct": correct_ids[0] if q_type_enum == QuestionType.SINGLE_CHOICE and correct_ids else correct_ids,
                                "allow_partial": True
                            }
                        elif q_type_enum == QuestionType.MATCHING:
                            pairs = [{"left": sub.get("prompt"), "right": sub.get("answer")} for sub in item.get("items", [])]
                            cfg = {"pairs": pairs}

                        db_q = Question(
                            type=q_type_enum,
                            title=f"Câu {order_idx + 1} (QID {item.get('qid', '')})",
                            content=item.get("question", ""),
                            points=1.0,
                            difficulty=DifficultyLevel.MEDIUM,
                            config=cfg,
                            explanation=item.get("explanation", ""),
                            created_by=teacher.id
                        )
                        session.add(db_q)
                        await session.flush()

                        qq = QuizQuestion(
                            quiz_id=quiz_12.id,
                            question_id=db_q.id,
                            order=order_idx,
                            points_override=1.0
                        )
                        session.add(qq)

                    await session.commit()
                    print(f"Successfully imported and seeded {len(items)} real exam questions into Quiz 1.2!")


if __name__ == "__main__":
    asyncio.run(seed_data())
