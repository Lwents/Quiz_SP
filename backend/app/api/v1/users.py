import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.models.admin import LoginSession
from app.models.attempt import Attempt, AttemptStatus
from app.models.lesson import UserLessonProgress
from app.schemas.user import AdminUserResponse, AdminUserUpdate, UserResponse, UserUpdate, ChangePasswordRequest
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/admin", response_model=list[AdminUserResponse])
async def list_users_for_admin(
    search: str = Query(default="", max_length=255),
    role: Optional[UserRole] = None,
    active: Optional[bool] = None,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    del current_user
    statement = select(User).order_by(User.created_at.desc(), User.id).limit(limit).offset(offset)
    filters = []
    term = search.strip()
    if term:
        pattern = f"%{term}%"
        filters.append(or_(User.email.ilike(pattern), User.full_name.ilike(pattern)))
    if role is not None:
        filters.append(User.role == role)
    if active is not None:
        filters.append(User.is_active == active)
    if filters:
        statement = statement.where(and_(*filters))
    users = (await db.execute(statement)).scalars().all()

    user_ids = [user.id for user in users]
    latest_logins: Dict[uuid.UUID, datetime] = {}
    if user_ids:
        logins = (
            await db.execute(
                select(AuditLog.user_id, AuditLog.occurred_at)
                .where(and_(AuditLog.user_id.in_(user_ids), AuditLog.action == "login_success"))
                .order_by(AuditLog.occurred_at.desc())
            )
        ).all()
        for user_id, occurred_at in logins:
            if user_id not in latest_logins:
                latest_logins[user_id] = occurred_at

    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "avatar_url": user.avatar_url,
            "created_at": user.created_at,
            "last_login_at": latest_logins.get(user.id),
        }
        for user in users
    ]


@router.patch("/admin/{user_id}", response_model=AdminUserResponse)
async def update_user_for_admin(
    user_id: uuid.UUID,
    changes: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    # Serialize role/status changes so two concurrent requests cannot both
    # remove what each believes is the other remaining administrator.
    await db.execute(select(func.pg_advisory_xact_lock(724021)))
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản")

    if changes.full_name is not None:
        target.full_name = changes.full_name.strip()
    if changes.is_active is False and target.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự khóa tài khoản quản trị đang đăng nhập")

    removes_admin = target.role == UserRole.ADMIN and (
        (changes.role is not None and changes.role != UserRole.ADMIN)
        or changes.is_active is False
    )
    if removes_admin:
        remaining_admins = (
            await db.execute(
                select(func.count(User.id)).where(
                    and_(User.role == UserRole.ADMIN, User.is_active == True, User.id != target.id)
                )
            )
        ).scalar() or 0
        if remaining_admins == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phải giữ lại ít nhất một quản trị viên đang hoạt động")

    if changes.role is not None:
        target.role = changes.role
    if changes.is_active is not None:
        target.is_active = changes.is_active
        if not changes.is_active:
            sessions = (await db.execute(select(LoginSession).where(LoginSession.user_id == target.id))).scalars().all()
            for session in sessions:
                session.revoked = True
    db.add(AuditLog(user_id=current_user.id, email=current_user.email, action="account_updated"))
    await db.commit()
    await db.refresh(target)
    latest_login = (
        await db.execute(
            select(AuditLog.occurred_at)
            .where(and_(AuditLog.user_id == target.id, AuditLog.action == "login_success"))
            .order_by(AuditLog.occurred_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return {**{column: getattr(target, column) for column in ("id", "email", "full_name", "role", "is_active", "avatar_url", "created_at")}, "last_login_at": latest_login}


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
    days: int = Query(default=365, ge=1, le=366),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trả về dữ liệu bản đồ nhiệt hoạt động học tập (Github contribution heatmap style)
    Bao gồm cả: Lượt nộp bài thi trắc nghiệm (attempts) và Lượt hoàn thành bài học lý thuyết (lessons)
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)

    # 1. Lấy tất cả attempts đã nộp trong khoảng thời gian (chỉ tính của STUDENT)
    if current_user.role != UserRole.STUDENT:
        attempt_times = []
    else:
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
