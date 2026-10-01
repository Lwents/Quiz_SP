"""Install the reviewed Advanced Computer Networks quiz without duplicating rows.

Only Word answers marked in yellow are imported. Repeated source questions are
collapsed; conflicting markings are left in the review catalog, not published.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.question import Question, QuestionType, QuizQuestion
from app.models.quiz import DifficultyLevel, Quiz, QuizStatus, Subject, Topic


CATALOG = Path(__file__).resolve().parent / "data" / "network_advanced_questions.json"
ASSETS = Path(__file__).resolve().parents[1] / "assets" / "network_questions"
MEDIA = Path("/app/media/question-images")
IMAGE_BASE = "http://localhost:8000/media/question-images"
SUBJECT_CODE = "COMP356"
QUIZ_SLUG = "on-tap-mang-may-tinh-nang-cao-k74"


async def seed_network_quiz() -> dict:
    questions = json.loads(CATALOG.read_text(encoding="utf-8"))
    MEDIA.mkdir(parents=True, exist_ok=True)
    for item in questions:
        for name in item["images"]:
            source = ASSETS / name
            assert source.is_file(), source
            destination = MEDIA / name
            if not destination.is_file() or destination.read_bytes() != source.read_bytes():
                shutil.copyfile(source, destination)

    async with AsyncSessionLocal() as db:
        subject = (await db.execute(select(Subject).where(Subject.code == SUBJECT_CODE))).scalar_one_or_none()
        if subject is None:
            subject = (await db.execute(
                select(Subject).where(Subject.name == "Mạng máy tính nâng cao")
            )).scalar_one_or_none()
        if subject is None:
            subject = Subject(
                code=SUBJECT_CODE,
                name="Mạng máy tính nâng cao",
                description="Mạng không dây, Wi-Fi, môi trường truyền, mạng MANET, AODV và ứng dụng mạng.",
            )
            db.add(subject)
            await db.flush()
        topic = (await db.execute(
            select(Topic).where(Topic.subject_id == subject.id, Topic.name == "Ôn tập tổng hợp")
        )).scalar_one_or_none()
        if topic is None:
            topic = Topic(
                subject_id=subject.id,
                name="Ôn tập tổng hợp",
                description="Câu hỏi đã đối chiếu và lọc trùng từ ba tài liệu ôn tập.",
                order=999,
            )
            db.add(topic)
            await db.flush()
        quiz = (await db.execute(select(Quiz).where(Quiz.slug == QUIZ_SLUG))).scalar_one_or_none()
        if quiz is None:
            quiz = Quiz(
                title="Ôn tập Mạng máy tính nâng cao — K74",
                slug=QUIZ_SLUG,
                description=f"{len(questions)} câu có đáp án tô vàng được xác nhận từ hai file Word; PDF đã dùng để đối chiếu câu hỏi.",
                subject_id=subject.id,
                topic_id=topic.id,
                difficulty=DifficultyLevel.MEDIUM,
                duration_minutes=90,
                pass_score=5.0,
                max_attempts=0,
                shuffle_questions=True,
                shuffle_answers=True,
                show_answer_after_submit=True,
                status=QuizStatus.PUBLISHED,
            )
            db.add(quiz)
            await db.flush()
        linked = (await db.execute(
            select(Question, QuizQuestion.order)
            .join(QuizQuestion, QuizQuestion.question_id == Question.id)
            .where(QuizQuestion.quiz_id == quiz.id)
        )).all()
        existing = {q.config.get("source_network_key") for q, _ in linked}
        next_order = max((order for _, order in linked), default=0) + 1
        added = 0
        for item in questions:
            source_key = f"{item['source']}:{item['source_number']}"
            if source_key in existing:
                continue
            assert item["correct"] and len(item["options"]) >= 3
            ids = {choice["id"] for choice in item["options"]}
            assert set(item["correct"]) <= ids
            content = item["content"]
            for number, name in enumerate(item["images"], start=1):
                content += f"\n\n![Hình minh họa {number}]({IMAGE_BASE}/{name})"
            multiple = item["type"] == "multiple_choice"
            question = Question(
                type=QuestionType.MULTIPLE_CHOICE if multiple else QuestionType.SINGLE_CHOICE,
                content=content,
                config={
                    "options": item["options"],
                    "correct": item["correct"] if multiple else item["correct"][0],
                    "answer_source": item["answer_basis"],
                    "source_network_key": source_key,
                    "also_in": item["also_in"],
                },
                points=1.0,
                difficulty=DifficultyLevel.MEDIUM,
                created_by=quiz.created_by,
            )
            db.add(question)
            await db.flush()
            db.add(QuizQuestion(quiz_id=quiz.id, question_id=question.id, order=next_order))
            existing.add(source_key)
            next_order += 1
            added += 1
        await db.commit()
        return {"quiz_id": str(quiz.id), "questions_in_catalog": len(questions), "added": added}
