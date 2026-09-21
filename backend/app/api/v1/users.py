import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash
from app.models.user import User, UserRole
from app.models.attempt import Attempt, AttemptStatus
from app.models.lesson import UserLessonProgress
from app.schemas.user import UserResponse, UserUpdate, ChangePasswordRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/profile", response_model=UserResponse)
async def update_my_profile(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name.strip()

    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url.strip() if user_update.avatar_url else None

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/change-password")
async def change_password(
    pwd_data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(pwd_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_CURRENT_PASSWORD", "message": "Mật khẩu hiện tại không chính xác"}}
        )

    if len(pwd_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "PASSWORD_TOO_SHORT", "message": "Mật khẩu mới phải có ít nhất 6 ký tự"}}
        )

    current_user.hashed_password = get_password_hash(pwd_data.new_password)
    await db.commit()
    return {"message": "Đổi mật khẩu thành công"}


@router.get("/activity-heatmap")
async def get_activity_heatmap(
    days: int = 365,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trả về dữ liệu bản đồ nhiệt hoạt động học tập (Github contribution heatmap style)
    Bao gồm cả: Lượt nộp bài thi trắc nghiệm (attempts) và Lượt hoàn thành bài học lý thuyết (lessons)
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)

    # 1. Lấy tất cả attempts đã nộp trong khoảng thời gian
    att_res = await db.execute(
        select(Attempt.submitted_at)
        .where(
            and_(
                Attempt.user_id == current_user.id,
                Attempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.GRADED]),
                Attempt.submitted_at >= start_date
            )
        )
    )
    attempt_times = att_res.scalars().all()

    # 2. Lấy tất cả bài học đã hoàn thành
    lesson_res = await db.execute(
        select(UserLessonProgress.completed_at)
        .where(
            and_(
                UserLessonProgress.user_id == current_user.id,
                UserLessonProgress.completed == True,
                UserLessonProgress.completed_at >= start_date
            )
        )
    )
    lesson_times = lesson_res.scalars().all()

    # Tổng hợp theo từng ngày YYYY-MM-DD
    day_counts: Dict[str, Dict[str, int]] = {}

    for dt in attempt_times:
        if dt:
            d_str = dt.strftime("%Y-%m-%d")
            if d_str not in day_counts:
                day_counts[d_str] = {"total": 0, "quizzes": 0, "lessons": 0}
            day_counts[d_str]["total"] += 1
            day_counts[d_str]["quizzes"] += 1

    for dt in lesson_times:
        if dt:
            d_str = dt.strftime("%Y-%m-%d")
            if d_str not in day_counts:
                day_counts[d_str] = {"total": 0, "quizzes": 0, "lessons": 0}
            day_counts[d_str]["total"] += 1
            day_counts[d_str]["lessons"] += 1

    # Chuyển đổi thành danh sách kết quả
    activity_list = [
        {
            "date": d,
            "count": data["total"],
            "quizzes": data["quizzes"],
            "lessons": data["lessons"]
        }
        for d, data in sorted(day_counts.items())
    ]

    total_activities = sum(d["total"] for d in day_counts.values())

    return {
        "days": days,
        "total_activities": total_activities,
        "activities": activity_list
    }
