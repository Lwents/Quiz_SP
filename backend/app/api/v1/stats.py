import uuid
from collections import Counter
from datetime import datetime, timezone, timedelta
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
from app.models.audit import AuditLog
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/admin/overview")
async def get_admin_overview(
    days: int = 14,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Return aggregate administration and authentication statistics only."""
    del current_user
    days = max(7, min(days, 90))
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days - 1)
    start_day = start.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar() or 0
    students = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.STUDENT))).scalar() or 0
    admins = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.ADMIN))).scalar() or 0
    new_users = (await db.execute(select(func.count(User.id)).where(User.created_at >= start_day))).scalar() or 0

    # A real growth chart needs the existing population before the period as
    # its baseline, then adds accounts created on each day.
    created_dates = (await db.execute(select(User.created_at))).scalars().all()
    users_before_period = 0
    registrations_by_day: dict[str, int] = {}
    for created_at in created_dates:
        if created_at is None:
            continue
        created_utc = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
        if created_utc < start_day:
            users_before_period += 1
            continue
        date_key = created_utc.astimezone(timezone.utc).date().isoformat()
        registrations_by_day[date_key] = registrations_by_day.get(date_key, 0) + 1
    user_chart = []
    cumulative_users = users_before_period
    for index in range(days):
        date_key = (start_day + timedelta(days=index)).date().isoformat()
        new_on_day = registrations_by_day.get(date_key, 0)
        cumulative_users += new_on_day
        user_chart.append({"date": date_key, "new_users": new_on_day, "total_users": cumulative_users})

    events = (
        await db.execute(
            select(AuditLog)
            .where(and_(AuditLog.occurred_at >= start_day, AuditLog.action.in_(["login_success", "login_failed", "login_blocked"])))
            .order_by(AuditLog.occurred_at.desc())
        )
    ).scalars().all()
    chart_counts: dict[str, Counter[str]] = {}
    for index in range(days):
        day = (start_day + timedelta(days=index)).date().isoformat()
        chart_counts[day] = Counter()
    for event in events:
        event_time = event.occurred_at
        if event_time is None:
            continue
        if event_time.tzinfo is None:
            event_time = event_time.replace(tzinfo=timezone.utc)
        event_day = event_time.astimezone(timezone.utc).date().isoformat()
        # Keep the endpoint resilient if a legacy event falls just outside the
        # requested UTC date window because of a stored timezone offset.
        chart_counts.setdefault(event_day, Counter())[event.action] += 1

    recent_events = (
        await db.execute(
            select(AuditLog, User.full_name)
            .outerjoin(User, AuditLog.user_id == User.id)
            .where(AuditLog.action.in_(["login_success", "login_failed", "login_blocked"]))
            .order_by(AuditLog.occurred_at.desc())
            .limit(30)
        )
    ).all()

    return {
        "period_days": days,
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": total_users - active_users,
            "new_in_period": new_users,
            "by_role": {
                "students": students,
                "admins": admins,
                # Kept only to make existing historic rows visible while the
                # legacy role is no longer assignable in the admin UI.
                "legacy_roles": total_users - students - admins,
            },
        },
        "security": {
            "failed_logins_in_period": sum(1 for event in events if event.action == "login_failed"),
            "blocked_logins_in_period": sum(1 for event in events if event.action == "login_blocked"),
            "controls": [
                "Giới hạn yêu cầu đăng nhập đang bật",
                "Phiên đăng nhập bị thu hồi khi đổi mật khẩu hoặc khóa tài khoản",
                "Nhật ký chỉ lưu trạng thái đăng nhập, không lưu mật khẩu, token hay IP",
            ],
        },
        "login_chart": [
            {
                "date": date,
                "success": counts["login_success"],
                "failed": counts["login_failed"],
                "blocked": counts["login_blocked"],
            }
            for date, counts in chart_counts.items()
        ],
        "user_chart": user_chart,
        "recent_logins": [
            {
                "id": event.id,
                "user_id": event.user_id,
                "email": event.email,
                "full_name": full_name,
                "action": event.action,
                "occurred_at": event.occurred_at,
            }
            for event, full_name in recent_events
        ],
    }


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
