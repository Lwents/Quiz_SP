import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.quiz import Quiz, Subject, Topic, QuizStatus
from app.models.question import Question
from app.models.attempt import Attempt, AttemptAnswer, AttemptStatus
from app.models.user import User, UserRole
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/student/dashboard")
async def get_student_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.STUDENT:
        return {
            "total_attempts": 0,
            "unique_quizzes_completed": 0,
            "average_percentage": 0.0,
            "total_study_time_seconds": 0,
            "recent_history": []
        }

    # Total attempts completed
    att_res = await db.execute(
        select(Attempt)
        .where(
            and_(
                Attempt.user_id == current_user.id,
                Attempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.GRADED])
            )
        )
        .options(selectinload(Attempt.quiz))
        .order_by(Attempt.submitted_at.desc())
    )
    attempts = att_res.scalars().all()

    total_attempts = len(attempts)
    unique_quizzes = len(set(a.quiz_id for a in attempts))
    total_score = sum(a.score for a in attempts)
    total_max = sum(a.max_score for a in attempts)
    avg_percentage = round((total_score / total_max * 100), 1) if total_max > 0 else 0.0
    total_duration = sum(a.duration_seconds for a in attempts)

    recent_history = []
    for a in attempts[:10]:
        pct = round((a.score / a.max_score * 100), 1) if a.max_score > 0 else 0.0
        recent_history.append({
            "attempt_id": a.id,
            "quiz_id": a.quiz_id,
            "quiz_title": a.quiz.title if a.quiz else "Quiz",
            "score": a.score,
            "max_score": a.max_score,
            "percentage": pct,
            "submitted_at": a.submitted_at,
            "duration_seconds": a.duration_seconds
        })

    return {
        "total_attempts": total_attempts,
        "unique_quizzes_completed": unique_quizzes,
        "average_percentage": avg_percentage,
        "total_study_time_seconds": total_duration,
        "recent_history": recent_history
    }


@router.get("/teacher/overview")
async def get_teacher_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    total_quizzes = (await db.execute(select(func.count(Quiz.id)))).scalar() or 0
    published_quizzes = (await db.execute(select(func.count(Quiz.id)).where(Quiz.status == QuizStatus.PUBLISHED))).scalar() or 0
    total_questions = (await db.execute(select(func.count(Question.id)))).scalar() or 0
    total_students = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.STUDENT))).scalar() or 0

    # Lượt nộp bài và lịch sử gần đây chỉ tính Attempt của STUDENT
    total_attempts = (
        await db.execute(
            select(func.count(Attempt.id))
            .join(User, Attempt.user_id == User.id)
            .where(
                and_(
                    Attempt.status == AttemptStatus.GRADED,
                    User.role == UserRole.STUDENT
                )
            )
        )
    ).scalar() or 0

    recent_attempts_res = await db.execute(
        select(Attempt)
        .join(User, Attempt.user_id == User.id)
        .where(
            and_(
                Attempt.status == AttemptStatus.GRADED,
                User.role == UserRole.STUDENT
            )
        )
        .options(selectinload(Attempt.quiz))
        .order_by(Attempt.submitted_at.desc())
        .limit(10)
    )
    recent_attempts = recent_attempts_res.scalars().all()

    history = []
    for a in recent_attempts:
        history.append({
            "attempt_id": a.id,
            "user_id": a.user_id,
            "quiz_id": a.quiz_id,
            "quiz_title": a.quiz.title if a.quiz else "Quiz",
            "score": a.score,
            "max_score": a.max_score,
            "percentage": round(a.score / a.max_score * 100, 1) if a.max_score > 0 else 0.0,
            "submitted_at": a.submitted_at
        })

    return {
        "total_quizzes": total_quizzes,
        "published_quizzes": published_quizzes,
        "total_questions": total_questions,
        "total_students": total_students,
        "total_attempts": total_attempts,
        "recent_attempts": history
    }
