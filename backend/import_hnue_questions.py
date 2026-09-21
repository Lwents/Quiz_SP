import asyncio
import json
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.quiz import Quiz, Subject, Topic, DifficultyLevel
from app.models.question import Question, QuestionType, QuizQuestion

async def import_all():
    quiz_data_path = "/home/lwent/.openclaw/workspace/quiz_data.json"
    if not os.path.exists(quiz_data_path):
        print("File quiz_data.json not found!")
        return

    with open(quiz_data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    questions_list = data.get("questions", [])
    print(f"Loaded {len(questions_list)} questions from quiz_data.json")

    async with AsyncSessionLocal() as session:
        # Get teacher
        teacher = (await session.execute(select(User).where(User.email == "teacher@example.com"))).scalar_one_or_none()
        if not teacher:
            print("Teacher not found")
            return

        quiz = (await session.execute(select(Quiz).where(Quiz.slug == "quiz-1-2-tuong-duong-logic-vi-ngu-luong-tu"))).scalar_one_or_none()
        if not quiz:
            print("Quiz 1.2 not found")
            return

        # Delete old quiz questions for this quiz if any
        old_qqs = (await session.execute(select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id))).scalars().all()
        for old in old_qqs:
            await session.delete(old)
        await session.flush()

        for idx, item in enumerate(questions_list):
            q_type = QuestionType.SINGLE_CHOICE
            if item.get("type") == "multiple_choice":
                q_type = QuestionType.MULTIPLE_CHOICE
            elif item.get("type") == "matching_group":
                q_type = QuestionType.MATCHING

            cfg = {}
            if q_type in (QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE):
                opts = [{"id": chr(97 + i), "text": opt} for i, opt in enumerate(item.get("options", []))]
                correct_texts = item.get("correct_answers", [])
                correct_ids = [o["id"] for o in opts if o["text"] in correct_texts]
                cfg = {
                    "options": opts,
                    "correct": correct_ids[0] if q_type == QuestionType.SINGLE_CHOICE and correct_ids else correct_ids,
                    "allow_partial": True
                }
            elif q_type == QuestionType.MATCHING:
                pairs = [{"left": sub.get("prompt"), "right": sub.get("answer")} for sub in item.get("items", [])]
                cfg = {"pairs": pairs}

            db_q = Question(
                type=q_type,
                title=f"Câu {idx + 1} (QID: {item.get('qid')})",
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
                quiz_id=quiz.id,
                question_id=db_q.id,
                order=idx,
                points_override=1.0
            )
            session.add(qq)

        await session.commit()
        print(f"Successfully imported {len(questions_list)} questions into Quiz 1.2!")

if __name__ == "__main__":
    asyncio.run(import_all())
