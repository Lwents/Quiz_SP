from datetime import datetime, timezone, timedelta
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    token_matches_user,
)
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.models.admin import LoginSession
from app.core.admin_policy import load_policy
from app.core.login_sessions import validate_session
from app.schemas.user import (
    UserCreate,
    UserResponse,
    Token,
    LoginRequest,
    RefreshRequest
)
from app.api.deps import get_current_user, oauth2_scheme
from app.core.rate_limit import limit_auth_requests
from pydantic import BaseModel, EmailStr, Field
from app.core.email_verification import send_verification, require_verified, token_digest
from app.models.admin import EmailVerification

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(limit_auth_requests)])
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    policy = await load_policy(db)
    if not policy.registration_enabled:
        raise HTTPException(403, "Hệ thống đang tạm đóng đăng ký")
    email = user_in.email.lower()
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "EMAIL_EXISTS", "message": "Email đã được đăng ký. Bạn có thể yêu cầu gửi lại link xác minh."}}
        )

    db_user = User(
        email=email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.STUDENT
    )
    db.add(db_user)
    try:
        await db.flush()
        await send_verification(db, db_user)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Email đã được đăng ký") from None
    await db.refresh(db_user)
    return db_user


@router.post("/login", response_model=Token, dependencies=[Depends(limit_auth_requests)])
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    identifier = login_data.email.strip()
    if settings.ADMIN_LOGIN_USERNAME and identifier.casefold() == settings.ADMIN_LOGIN_USERNAME.casefold():
        identifier = settings.ADMIN_BOOTSTRAP_EMAIL
    identifier = identifier.casefold()
    result = await db.execute(select(User).where(func.lower(User.email) == identifier))
    user = result.scalar_one_or_none()
    policy = await load_policy(db)
    now = datetime.now(timezone.utc)
    lock_count = (await db.execute(select(func.count(AuditLog.id)).where(
        AuditLog.email == identifier, AuditLog.action == "login_locked",
        AuditLog.occurred_at >= now - timedelta(minutes=policy.lockout_minutes)))).scalar()
    if lock_count > 0:
        raise HTTPException(429, "Tài khoản đang bị tạm khóa do đăng nhập sai nhiều lần", headers={"Retry-After": str(policy.lockout_minutes * 60)})
    if not user or not verify_password(login_data.password, user.hashed_password):
        # Retain only the supplied account identifier, never the password,
        # request payload, token, or raw client address.
        db.add(AuditLog(action="login_failed", email=identifier[:255]))
        failures = (await db.execute(select(func.count(AuditLog.id)).where(
            AuditLog.email == identifier, AuditLog.action == "login_failed",
            AuditLog.occurred_at >= now - timedelta(minutes=policy.failure_window_minutes)))).scalar()
        if failures + 1 >= policy.failed_attempts:
            db.add(AuditLog(action="login_locked", email=identifier[:255]))
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password"}}
        )

    await require_verified(db, user)
    if not user.is_active:
        db.add(AuditLog(user_id=user.id, action="login_blocked", email=user.email))
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INACTIVE_USER", "message": "Inactive user account"}}
        )

    session = LoginSession(id=uuid.uuid4(), user_id=user.id, created_at=now, last_seen_at=now,
                           expires_at=now + timedelta(hours=policy.session_hours))
    db.add(session)
    db.add(AuditLog(user_id=user.id, action="login_success", email=user.email))
    await db.commit()
    lifetime = timedelta(hours=policy.session_hours)
    access_token = create_access_token(user.id, expires_delta=lifetime, password_hash=user.hashed_password, session_id=session.id)
    refresh_token = create_refresh_token(user.id, expires_delta=lifetime, password_hash=user.hashed_password, session_id=session.id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/refresh", response_model=Token, dependencies=[Depends(limit_auth_requests)])
async def refresh_token_endpoint(refresh_in: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(refresh_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_REFRESH_TOKEN", "message": "Invalid refresh token"}}
        )

    try:
        user_id = uuid.UUID(payload.get("sub"))
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not token_matches_user(payload, user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found or inactive"}}
        )

    await validate_session(db, payload, user.id)
    policy = await load_policy(db)
    remaining = timedelta(seconds=max(1, min(payload["exp"] - datetime.now(timezone.utc).timestamp(), policy.session_hours * 3600)))
    session_id = payload.get("sid")
    if not session_id:
        # Transparently move a pre-tracking refresh token into a revocable
        # session instead of allowing untracked tokens to renew indefinitely.
        session_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        db.add(LoginSession(id=session_id, user_id=user.id, created_at=now, last_seen_at=now, expires_at=now + remaining))
        await db.commit()
    access_token = create_access_token(user.id, expires_delta=remaining, password_hash=user.hashed_password, session_id=session_id)
    refresh_token = create_refresh_token(user.id, expires_delta=remaining, password_hash=user.hashed_password, session_id=session_id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    payload = decode_token(token)
    if payload and payload.get("sid"):
        session = (await db.execute(select(LoginSession).where(LoginSession.id == uuid.UUID(payload["sid"]), LoginSession.user_id == user.id))).scalar_one_or_none()
        if session:
            session.revoked = True
    db.add(AuditLog(user_id=user.id, email=user.email, action="logout"))
    await db.commit()
    return {"message": "Đã đăng xuất"}


class VerificationToken(BaseModel):
    token: str = Field(min_length=32, max_length=128)


class VerificationEmail(BaseModel):
    email: EmailStr


@router.post("/verify-email", dependencies=[Depends(limit_auth_requests)])
async def verify_email(data: VerificationToken, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(EmailVerification).where(
        EmailVerification.token_hash == token_digest(data.token)).with_for_update())).scalar_one_or_none()
    if row is None or row.verified_at is not None or row.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(400, "Link không hợp lệ, đã dùng hoặc đã hết hạn. Hãy yêu cầu gửi lại link.")
    row.verified_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Đã xác minh email. Bạn có thể đăng nhập."}


@router.post("/resend-verification", dependencies=[Depends(limit_auth_requests)])
async def resend_verification(data: VerificationEmail, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(func.lower(User.email) == str(data.email).lower()).with_for_update())).scalar_one_or_none()
    if user is not None:
        pending = (await db.execute(select(EmailVerification).where(EmailVerification.user_id == user.id))).scalar_one_or_none()
        if pending is not None and pending.verified_at is None:
            # Generic response prevents the resend endpoint exposing account existence.
            if pending.sent_at <= datetime.now(timezone.utc) - timedelta(seconds=60):
                await send_verification(db, user)
                await db.commit()
    return {"message": "Nếu email có tài khoản chưa xác minh, hệ thống sẽ gửi link. Kiểm tra cả thư rác; chờ 60 giây trước khi gửi lại."}
