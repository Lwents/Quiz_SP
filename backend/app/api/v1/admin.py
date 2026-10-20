"""Admin-only operational tools. Responses use explicit safe fields."""
import os
import shutil
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.admin_policy import AdminPolicy, load_policy
from app.models.admin import AdminSetting, LoginSession, Announcement, AnnouncementRead
from app.models.audit import AuditLog
from app.models.user import User, UserRole
from app.models.attempt import Attempt, AttemptStatus
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/admin", tags=["administration"])
admin_only = require_role(UserRole.ADMIN)
started = time.monotonic()


class NewAccount(UserCreate):
    password: str = Field(min_length=8, max_length=72)
    role: Literal["ADMIN", "STUDENT"] = "STUDENT"

    @field_validator("full_name")
    @classmethod
    def valid_name(cls, value):
        if not value.strip():
            raise ValueError("Họ tên không được để trống")
        return value.strip()


class ResetPassword(BaseModel):
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def check_bytes(cls, value):
        if len(value.encode()) > 72:
            raise ValueError("Mật khẩu vượt 72 byte")
        return value


class NoticeInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=4000)
    audience: Literal["ALL", "STUDENT", "ADMIN"] = "ALL"

    @field_validator("title", "message")
    @classmethod
    def nonempty(cls, value):
        if not value.strip():
            raise ValueError("Nội dung không được để trống")
        return value.strip()


@router.get("/policy", response_model=AdminPolicy)
async def policy(db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    return await load_policy(db)


@router.put("/policy", response_model=AdminPolicy)
async def save_policy(data: AdminPolicy, db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    row = (await db.execute(select(AdminSetting).where(AdminSetting.key == "auth_policy").with_for_update())).scalar_one_or_none()
    if row is None:
        db.add(AdminSetting(key="auth_policy", value=data.model_dump()))
    else:
        row.value = data.model_dump()
    db.add(AuditLog(user_id=actor.id, email=actor.email, action="policy_updated"))
    await db.commit()
    return data


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_account(data: NewAccount, db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    from app.core.email_verification import send_verification
    if (await db.execute(select(User.id).where(func.lower(User.email) == data.email.lower()))).scalar_one_or_none():
        raise HTTPException(409, "Email đã tồn tại")
    user = User(email=data.email.lower(), full_name=data.full_name.strip(), role=UserRole(data.role),
                hashed_password=get_password_hash(data.password), is_active=True)
    db.add(user)
    db.add(AuditLog(user_id=actor.id, email=actor.email, action="account_created"))
    try:
        await db.flush()
        await send_verification(db, user)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Email đã tồn tại")
    await db.refresh(user)
    return user


@router.post("/users/{user_id}/password")
async def reset_password(user_id: uuid.UUID, data: ResetPassword, db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(404, "Không tìm thấy tài khoản")
    user.hashed_password = get_password_hash(data.password)
    sessions = (await db.execute(select(LoginSession).where(LoginSession.user_id == user.id))).scalars().all()
    for session in sessions:
        session.revoked = True
    db.add(AuditLog(user_id=actor.id, email=actor.email, action="password_reset"))
    await db.commit()
    return {"message": "Đã đổi mật khẩu và thu hồi phiên cũ"}


@router.get("/sessions")
async def sessions(active_only: bool = False, db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    now = datetime.now(timezone.utc)
    policy = await load_policy(db)
    statement = select(LoginSession, User.email, User.full_name).join(User, User.id == LoginSession.user_id).where(
        LoginSession.revoked.is_(False), LoginSession.expires_at > now, User.is_active.is_(True),
        LoginSession.last_seen_at >= now - timedelta(minutes=policy.idle_minutes))
    if active_only:
        statement = statement.where(LoginSession.last_seen_at >= now - timedelta(minutes=10))
    rows = (await db.execute(statement.order_by(LoginSession.last_seen_at.desc()).limit(200))).all()
    return [{"id": s.id, "user_id": s.user_id, "email": email, "full_name": name,
             "created_at": s.created_at, "last_seen_at": s.last_seen_at, "expires_at": s.expires_at} for s, email, name in rows]


@router.delete("/sessions/{session_id}")
async def revoke_session(session_id: uuid.UUID, db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    session = (await db.execute(select(LoginSession).where(LoginSession.id == session_id))).scalar_one_or_none()
    if session is None:
        raise HTTPException(404, "Không tìm thấy phiên")
    session.revoked = True
    db.add(AuditLog(user_id=actor.id, email=actor.email, action="session_revoked"))
    await db.commit()
    return {"message": "Đã thu hồi phiên"}


@router.get("/activity")
async def activity(action: str = Query(default="", max_length=48), offset: int = Query(0, ge=0), db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    statement = select(AuditLog)
    if action:
        statement = statement.where(AuditLog.action == action)
    rows = (await db.execute(statement.order_by(AuditLog.occurred_at.desc()).offset(offset).limit(100))).scalars().all()
    return [{"id": r.id, "email": r.email, "action": r.action, "occurred_at": r.occurred_at} for r in rows]


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    tick = time.monotonic()
    await db.execute(select(1))
    database_ms = round((time.monotonic() - tick) * 1000, 2)
    disk = shutil.disk_usage(settings.MEDIA_DIR)
    memory = {}
    try:
        with open("/proc/meminfo") as stream:
            for line in stream:
                key, value = line.split(":", 1)
                if key in ("MemTotal", "MemAvailable"):
                    memory[key] = int(value.strip().split()[0]) * 1024
    except (OSError, ValueError):
        pass
    return {"status": "ok", "database_ms": database_ms, "uptime_seconds": int(time.monotonic() - started),
            "cpu_load_1m": os.getloadavg()[0], "cpu_count": os.cpu_count(),
            "memory_total": memory.get("MemTotal"), "memory_available": memory.get("MemAvailable"),
            "disk_total": disk.total, "disk_used": disk.used,
            "scope": "Tài nguyên mà tiến trình backend nhìn thấy; có thể khác giới hạn container/VPS."}


@router.get("/reports")
async def reports(days: int = Query(30, ge=7, le=90), db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
    rows = (await db.execute(select(Attempt).join(User, User.id == Attempt.user_id).where(
        User.role == UserRole.STUDENT, Attempt.submitted_at >= start,
        Attempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.GRADED])))).scalars().all()
    counts = {}
    buckets = [0] * 5
    scores = []
    for row in rows:
        key = row.submitted_at.date().isoformat()
        counts[key] = counts.get(key, 0) + 1
        if row.max_score > 0:
            percentage = max(0, min(100, row.score / row.max_score * 100))
            buckets[min(4, int(percentage // 20))] += 1
            scores.append(percentage)
    return {"submissions": len(rows), "learners": len({r.user_id for r in rows}),
            "average_percentage": round(sum(scores) / len(scores), 1) if scores else None,
            "study_seconds": sum(r.duration_seconds or 0 for r in rows),
            "daily": [{"date": (start + timedelta(days=i)).date().isoformat(), "count": counts.get((start + timedelta(days=i)).date().isoformat(), 0)} for i in range(days)],
            "scores": [{"label": label, "count": buckets[i]} for i, label in enumerate(["0–<20%", "20–<40%", "40–<60%", "60–<80%", "80–100%"])]}


@router.post("/announcements", status_code=201)
async def publish(data: NoticeInput, db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    notice = Announcement(**data.model_dump(), author_id=actor.id)
    db.add(notice)
    db.add(AuditLog(user_id=actor.id, email=actor.email, action="notification_published"))
    await db.commit()
    return {"message": "Đã đăng thông báo trong ứng dụng"}


@router.get("/announcements")
async def announcements(db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    rows = (await db.execute(select(Announcement).order_by(Announcement.created_at.desc()).limit(100))).scalars().all()
    return [{"id": n.id, "title": n.title, "message": n.message, "audience": n.audience, "created_at": n.created_at} for n in rows]


@router.delete("/announcements/{notice_id}")
async def remove_notice(notice_id: uuid.UUID, db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    await db.execute(delete(AnnouncementRead).where(AnnouncementRead.announcement_id == notice_id))
    await db.execute(delete(Announcement).where(Announcement.id == notice_id))
    db.add(AuditLog(user_id=actor.id, email=actor.email, action="notification_removed"))
    await db.commit()
    return {"message": "Đã gỡ thông báo"}


inbox_router = APIRouter(prefix="/notifications", tags=["notifications"])


@inbox_router.get("")
async def inbox(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Announcement, AnnouncementRead.id).outerjoin(AnnouncementRead, and_(
        AnnouncementRead.announcement_id == Announcement.id, AnnouncementRead.user_id == user.id)).where(
        Announcement.audience.in_(["ALL", user.role.value])).order_by(Announcement.created_at.desc()).limit(50))).all()
    return [{"id": n.id, "title": n.title, "message": n.message, "created_at": n.created_at, "read": read_id is not None} for n, read_id in rows]


@inbox_router.post("/{notice_id}/read")
async def read_notice(notice_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    notice = (await db.execute(select(Announcement).where(Announcement.id == notice_id, Announcement.audience.in_(["ALL", user.role.value])))).scalar_one_or_none()
    if notice is None:
        raise HTTPException(404, "Không tìm thấy thông báo")
    from sqlalchemy.dialects.postgresql import insert
    await db.execute(insert(AnnouncementRead).values(id=uuid.uuid4(), announcement_id=notice_id, user_id=user.id).on_conflict_do_nothing())
    await db.commit()
    return {"message": "Đã đọc"}
