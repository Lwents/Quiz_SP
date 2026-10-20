import uuid
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy import select
from app.models.admin import LoginSession
from app.core.admin_policy import load_policy


async def validate_session(db, payload, user_id, *, touch=True):
    # Tokens issued before session tracking are allowed until their existing
    # expiry. A password reset invalidates these via the password fingerprint.
    if not payload.get("sid"):
        return
    try:
        session_id = uuid.UUID(payload["sid"])
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(401, "Phiên đăng nhập không hợp lệ")
    session = (await db.execute(select(LoginSession).where(LoginSession.id == session_id, LoginSession.user_id == user_id))).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    policy = await load_policy(db)
    if session is None or session.revoked or session.expires_at <= now or session.last_seen_at < now - timedelta(minutes=policy.idle_minutes):
        raise HTTPException(401, "Phiên đã hết hạn hoặc bị thu hồi")
    if touch and session.last_seen_at < now - timedelta(seconds=60):
        session.last_seen_at = now
        await db.commit()
