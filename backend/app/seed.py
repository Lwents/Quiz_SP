import asyncio
import json
import os
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
        # 1. Chuẩn hóa tài khoản người dùng thực tế: Xóa vĩnh viễn tất cả tài khoản demo cũ
        demo_users = (await session.execute(
            select(User).where(User.email.in_(["teacher@example.com", "admin@example.com", "student@example.com"]))
        )).scalars().all()
        for du in demo_users:
            await session.delete(du)
        await session.flush()

        # Tài khoản Quản trị viên chính thức: admin@gmail.com / 123456
        admin_res = await session.execute(select(User).where(User.email == "admin@gmail.com"))
        admin = admin_res.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@gmail.com",
                hashed_password=get_password_hash("123456"),
                full_name="Quản trị viên",
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(admin)
            await session.commit()
            await session.refresh(admin)
        else:
            admin.hashed_password = get_password_hash("123456")
            admin.role = UserRole.ADMIN
            await session.commit()

        # 2. Xóa các đề thi ảo và môn học ảo cũ nếu có
        dummy_quizzes = (await session.execute(
            select(Quiz).where(Quiz.slug.in_([
                "quiz-demo-toan-roi-rac",
                "kim-tra-gia-k-k-tha-a-hnh",
                "kim-tra-15p-kin-trc-m-hnh-osi-7-tng"
            ]))
        )).scalars().all()
        for dq in dummy_quizzes:
            await session.delete(dq)
        await session.flush()

        dummy_subs = (await session.execute(
            select(Subject).where(Subject.code.in_(["CS201", "NET101"]))
        )).scalars().all()
        for ds in dummy_subs:
            await session.delete(ds)
        await session.flush()

        # 3. Môn học chuẩn: Toán rời rạc (COMP122 - ĐHSP Hà Nội)
        sub_res = await session.execute(select(Subject).where(Subject.code == "COMP122"))
        subject = sub_res.scalar_one_or_none()
        if not subject:
            subject = Subject(
                name="Toán rời rạc",
                code="COMP122",
                description="Môn học nền tảng Khoa học Máy tính & Công nghệ Thông tin - Trường Đại học Sư phạm Hà Nội (HNUE). Bao gồm Logic mệnh đề, vị ngữ, lượng tử, suy luận toán học, tập hợp, quan hệ, đại số Boole và lý thuyết đồ thị."
            )
            session.add(subject)
            await session.commit()
            await session.refresh(subject)
        else:
            subject.name = "Toán rời rạc"
            subject.description = "Môn học nền tảng Khoa học Máy tính & Công nghệ Thông tin - Trường Đại học Sư phạm Hà Nội (HNUE). Bao gồm Logic mệnh đề, vị ngữ, lượng tử, suy luận toán học, tập hợp, quan hệ, đại số Boole và lý thuyết đồ thị."
            await session.commit()

        # 4. Các chủ đề chuẩn của môn Toán rời rạc
        topics_data = [
            ("Chương 1: Mệnh đề, vị ngữ và lượng tử", "Các phép toán logic, bảng chân trị, tương đương logic, lượng tử và vị từ."),
            ("Chương 2: Tập hợp, quan hệ và hàm số", "Tập hợp, các phép toán tập hợp, quan hệ tương đương, quan hệ thứ tự, ánh xạ."),
            ("Chương 3: Đại số Boole và mạch logic", "Đại số Boole, hàm Boole, biểu diễn hàm Boole, tối tiểu hóa hàm Boole."),
            ("Chương 4: Lý thuyết đồ thị và cây", "Định nghĩa đồ thị, đường đi, chu trình, đồ thị Euler, Hamilton, cây và ứng dụng.")
        ]
        topic_map = {}
        for top_name, top_desc in topics_data:
            t = (await session.execute(select(Topic).where(Topic.subject_id == subject.id, Topic.name == top_name))).scalar_one_or_none()
            if not t:
                t = Topic(subject_id=subject.id, name=top_name, description=top_desc)
                session.add(t)
                await session.flush()
            topic_map[top_name] = t
        await session.commit()

        topic_1 = topic_map["Chương 1: Mệnh đề, vị ngữ và lượng tử"]

        # 5. Nạp Đề thi thật: Quiz 1.2 (23 câu hỏi thật từ ngân hàng đề HNUE)
        quiz_12_res = await session.execute(select(Quiz).where(Quiz.slug == "quiz-1-2-tuong-duong-logic-vi-ngu-luong-tu"))
        quiz_12 = quiz_12_res.scalar_one_or_none()
        if not quiz_12:
            quiz_12 = Quiz(
                title="Quiz 1.2: Tương đương logic, vị ngữ, lượng tử - CNTT1 (HNUE)",
                slug="quiz-1-2-tuong-duong-logic-vi-ngu-luong-tu",
                description="Toàn bộ ngân hàng đề thi 23 câu hỏi chuẩn hóa môn Toán rời rạc (COMP122) - Khoa Công nghệ Thông tin, Trường Đại học Sư phạm Hà Nội.",
                subject_id=subject.id,
                topic_id=topic_1.id,
                difficulty=DifficultyLevel.MEDIUM,
                duration_minutes=25,
                pass_score=5.0,
                max_attempts=0,
                shuffle_questions=True,
                shuffle_answers=True,
                show_answer_after_submit=True,
                status=QuizStatus.PUBLISHED,
                created_by=admin.id
            )
            session.add(quiz_12)
            await session.commit()
            await session.refresh(quiz_12)

        # Kiểm tra và nạp 23 câu hỏi thật từ quiz_data.json
        cur_qqs = (await session.execute(select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_12.id))).scalars().all()
        if len(cur_qqs) != 23:
            for eq in cur_qqs:
                await session.delete(eq)
            await session.flush()

            # Tìm đường dẫn quiz_data.json
            possible_paths = [
                os.path.join(os.path.dirname(__file__), "data", "quiz_data.json"),
                "/app/app/data/quiz_data.json",
                "/home/lwent/projects/Quiz_SP/backend/app/data/quiz_data.json",
                "/home/lwent/.openclaw/workspace/quiz_data.json"
            ]
            quiz_json_path = next((p for p in possible_paths if os.path.exists(p)), None)

            if quiz_json_path:
                with open(quiz_json_path, "r", encoding="utf-8") as f:
                    q_data = json.load(f)
                    items = q_data.get("questions", [])

                    for order_idx, item in enumerate(items):
                        q_type_enum = QuestionType.SINGLE_CHOICE
                        if item.get("type") == "multiple_choice":
                            q_type_enum = QuestionType.MULTIPLE_CHOICE
                        elif item.get("type") == "matching_group":
                            q_type_enum = QuestionType.MATCHING

                        cfg = {}
                        if q_type_enum in (QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE):
                            opts = [{"id": chr(97 + i), "text": opt} for i, opt in enumerate(item.get("options", []))]
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
                            title=f"Câu {order_idx + 1} (QID: {item.get('qid', '')})",
                            content=item.get("question", ""),
                            points=1.0,
                            difficulty=DifficultyLevel.MEDIUM,
                            config=cfg,
                            explanation=item.get("explanation", ""),
                            created_by=admin.id
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
                    print(f"Đã nạp thành công {len(items)} câu hỏi thật vào Quiz 1.2!")

        print("Hoàn tất nạp dữ liệu thật thành công!")


if __name__ == "__main__":
    asyncio.run(seed_data())