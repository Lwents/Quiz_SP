"""Import the distinct questions from the user's eight Quiz 2.2 reviews.

Screenshots without selections or grading stay in Downloads. This bank contains
native, gradable questions; repeated imports do not duplicate database rows.
"""

import hashlib
import json
import re
import unicodedata
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.question import Question, QuestionType, QuizQuestion
from app.models.quiz import DifficultyLevel, Quiz, QuizStatus, Subject, Topic

QUIZ_SLUG = "quiz-2-2-anh-xa-luc-luong-tap-hop"
BANK_PATH = Path(__file__).parent / "data" / "discrete_mapping_quiz.json"


def _identity(content, config):
    def normalize(text):
        return re.sub(r"\s+", "", unicodedata.normalize("NFC", text)).casefold()

    options = sorted(normalize(o["text"]) for o in config.get("options", []))
    pairs = sorted(normalize(p["left"]) for p in config.get("pairs", []))
    payload = [normalize(content), options, pairs]
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False).encode()).hexdigest()


async def seed_discrete_mapping_quiz():
    bank = json.loads(BANK_PATH.read_text(encoding="utf-8"))
    async with AsyncSessionLocal() as db:
        subject = (await db.execute(select(Subject).where(Subject.code == "COMP122"))).scalar_one()
        topic = (await db.execute(select(Topic).where(
            Topic.subject_id == subject.id,
            Topic.name == "Chương 2: Lý thuyết tập hợp",
        ))).scalar_one()
        quiz = (await db.execute(select(Quiz).where(Quiz.slug == QUIZ_SLUG))).scalar_one_or_none()
        if quiz is None:
            quiz = Quiz(
                title="Quiz 2.2: Ánh xạ và lực lượng tập hợp",
                slug=QUIZ_SLUG,
                description="16 câu khác nhau từ 8 lượt xem lại Quiz 2.2 COMP122. "
                            "Có câu chọn nhiều đáp án, chọn một đáp án và ghép nối; "
                            "giải thích được hiển thị sau khi nộp bài.",
                subject_id=subject.id, topic_id=topic.id,
                difficulty=DifficultyLevel.MEDIUM,
                duration_minutes=20, pass_score=7.0, max_attempts=0,
                shuffle_questions=True, shuffle_answers=True,
                show_answer_after_submit=True, status=QuizStatus.PUBLISHED,
            )
            db.add(quiz)
            await db.flush()

        rows = (await db.execute(select(Question, QuizQuestion.order)
                .join(QuizQuestion, QuizQuestion.question_id == Question.id)
                .where(QuizQuestion.quiz_id == quiz.id))).all()
        linked = {_identity(q.content, q.config) for q, _ in rows}
        # Reuse an identical question already in the bank rather than cloning it.
        existing = (await db.execute(select(Question).join(QuizQuestion)
                    .join(Quiz).where(Quiz.subject_id == subject.id))).scalars().unique().all()
        by_identity = {_identity(q.content, q.config): q for q in existing}
        order = max((position for _, position in rows), default=0) + 1
        added = reused = 0
        for item in bank["questions"]:
            if item["type"] == "matching":
                config = {"pairs": item["pairs"]}
            else:
                options = [{"id": chr(97 + i), "text": text}
                           for i, text in enumerate(item["options"])]
                correct = [options[i]["id"] for i in item["correct"]]
                config = {"options": options,
                          "correct": correct if item["type"] == "multiple_choice" else correct[0]}
            identity = _identity(item["content"], config)
            if identity in linked:
                continue
            question = by_identity.get(identity)
            if question is None:
                config["source_discrete_mapping_key"] = item["key"]
                config["source_url"] = bank["source_url"]
                question = Question(
                    type=QuestionType(item["type"]), content=item["content"],
                    config=config, explanation=item["explanation"], points=1.0,
                    difficulty=DifficultyLevel.MEDIUM,
                )
                db.add(question)
                await db.flush()
                by_identity[identity] = question
            else:
                reused += 1
            db.add(QuizQuestion(quiz_id=quiz.id, question_id=question.id, order=order))
            linked.add(identity)
            order += 1
            added += 1
        await db.commit()
        return {"quiz_id": str(quiz.id), "added": added,
                "reused": reused, "total": len(linked)}
