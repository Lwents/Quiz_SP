"""Single-use, hashed email confirmation tokens for newly created accounts."""
import asyncio
import hashlib
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit
from fastapi import HTTPException
from sqlalchemy import select
from app.core.config import settings
from app.core.integrations import mail_runtime
from app.models.admin import EmailVerification
from app.core.mailer import send_mail


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def confirmation_url(token: str) -> str:
    base = settings.PUBLIC_APP_URL.rstrip('/')
    parsed = urlsplit(base)
    if (not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment
            or (parsed.scheme != 'https' and not (parsed.scheme == 'http' and parsed.hostname in {'localhost', '127.0.0.1'}))):
        raise HTTPException(503, "Chưa cấu hình địa chỉ website xác minh email hợp lệ")
    return base + '/verify-email?token=' + token


async def send_verification(db, user):
    config, password = await mail_runtime(db)
    if not config.host or not config.from_email or (config.username and not password):
        raise HTTPException(503, "Chưa cấu hình gửi email. Vui lòng liên hệ quản trị viên.")
    token = secrets.token_urlsafe(32)
    link = confirmation_url(token)
    now = datetime.now(timezone.utc)
    row = (await db.execute(select(EmailVerification).where(EmailVerification.user_id == user.id).with_for_update())).scalar_one_or_none()
    if row is not None and row.verified_at is not None:
        return
    if row is not None and row.sent_at > now - timedelta(seconds=60):
        raise HTTPException(429, "Vui lòng chờ 60 giây trước khi gửi lại link")
    if row is None:
        row = EmailVerification(user_id=user.id)
        db.add(row)
    row.token_hash = token_digest(token)
    row.sent_at = now
    row.expires_at = now + timedelta(hours=24)
    await db.flush()
    try:
        await asyncio.to_thread(send_mail, config, password, user.email,
            subject="Xác minh tài khoản HNUE PRO",
            body="Vui lòng mở link dưới đây và bấm Xác minh email để kích hoạt tài khoản:\n\n" + link
                 + "\n\nLink có hiệu lực 24 giờ và chỉ dùng một lần. Nếu bạn không tạo tài khoản, hãy bỏ qua thư này.")
    except (smtplib.SMTPException, OSError, ValueError):
        raise HTTPException(502, "Không gửi được email xác minh. Vui lòng thử lại sau.") from None


async def require_verified(db, user):
    row = (await db.execute(select(EmailVerification).where(EmailVerification.user_id == user.id))).scalar_one_or_none()
    # Existing accounts predate the confirmation flow and remain usable.
    if row is not None and row.verified_at is None:
        raise HTTPException(403, {"error": {"code": "EMAIL_NOT_VERIFIED", "message": "Hãy xác minh email trước khi đăng nhập. Bạn có thể yêu cầu gửi lại link."}})
