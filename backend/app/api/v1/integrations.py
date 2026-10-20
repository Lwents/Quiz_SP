"""Admin configuration for AI and SMTP; provider errors are always redacted."""
import asyncio
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import require_role
from app.core.database import get_db
from app.core.integrations import (AIConfigInput, MailConfigInput, ai_runtime, mail_runtime, write_secret)
from app.core.rate_limit import limiter
from app.models import User, UserRole, AdminSetting, AuditLog

router = APIRouter(prefix="/admin/integrations", tags=["integrations"])
admin_only = require_role(UserRole.ADMIN)


async def save_config(db, key, public, secret, context, actor):
    row = (await db.execute(select(AdminSetting).where(AdminSetting.key == key).with_for_update())).scalar_one_or_none()
    value = dict(row.value) if row else {}
    value.update(public)
    if secret is not None and secret.get_secret_value():
        plain = secret.get_secret_value()
        if len(plain) > 4096 or any(c in plain for c in '\r\n'):
            raise HTTPException(422, "Khóa/mật khẩu không hợp lệ")
        try:
            write_secret(plain, context)
        except OSError:
            raise HTTPException(503, "Không lưu được tệp cấu hình bí mật. Kiểm tra vùng lưu riêng của backend.") from None
    if row:
        row.value = value
    else:
        db.add(AdminSetting(key=key, value=value))
    db.add(AuditLog(user_id=actor.id, email=actor.email, action=context + "_config_updated"))
    await db.commit()


@router.get("/ai")
async def get_ai(db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    config, key = await ai_runtime(db, decrypt=False)
    return {**config.model_dump(), "key_configured": bool(key)}


@router.put("/ai")
async def set_ai(data: AIConfigInput, db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    await save_config(db, "ai_integration", data.model_dump(exclude={"api_key"}), data.api_key, "ai", actor)
    return {"message": "Đã lưu cấu hình AI"}


@router.post("/ai/test")
async def test_ai(db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    limiter.check(("admin-ai-test", str(actor.id)), 5, 60)
    config, key = await ai_runtime(db)
    if not key:
        raise HTTPException(400, "Chưa cấu hình API key")
    try:
        async with httpx.AsyncClient(timeout=45, follow_redirects=False) as client:
            response = await client.post(config.base_url + "/chat/completions", headers={"Authorization": "Bearer " + key},
                json={"model": config.model, "messages": [{"role": "user", "content": "Reply with OK."}], "stream": False, "max_tokens": 900})
        response.raise_for_status()
        if "text/event-stream" in response.headers.get("content-type", ""):
            import json
            pieces = []
            for line in response.text.splitlines():
                if line.startswith("data: ") and line[6:].strip() != "[DONE]":
                    pieces.append(json.loads(line[6:])["choices"][0].get("delta", {}).get("content", ""))
            content = "".join(pieces)
        else:
            content = response.json()["choices"][0]["message"]["content"]
        if not isinstance(content, str) or not content.strip():
            raise ValueError("Empty result")
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        raise HTTPException(502, "Kiểm tra AI thất bại. Kiểm tra URL, API key, model và chứng chỉ HTTPS.") from None
    return {"message": "Kết nối và gọi model AI thành công"}


@router.get("/email")
async def get_mail(db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    config, password = await mail_runtime(db, decrypt=False)
    return {**config.model_dump(), "password_configured": bool(password)}


@router.put("/email")
async def set_mail(data: MailConfigInput, db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    await save_config(db, "mail_integration", data.model_dump(exclude={"password"}), data.password, "smtp", actor)
    return {"message": "Đã lưu cấu hình email"}


class MailTest(BaseModel):
    recipient: EmailStr


def send_mail(config, password, recipient):
    message = EmailMessage()
    message["Subject"] = "Kiểm tra cấu hình email HNUE PRO"
    message["From"] = formataddr((config.from_name, config.from_email))
    message["To"] = recipient
    message.set_content("Email kiểm tra từ trang quản trị HNUE PRO. Cấu hình SMTP đang hoạt động.")
    context = ssl.create_default_context()
    if config.tls_mode == "ssl":
        client = smtplib.SMTP_SSL(config.host, config.port, timeout=15, context=context)
    else:
        client = smtplib.SMTP(config.host, config.port, timeout=15)
    with client:
        if config.tls_mode == "starttls":
            client.starttls(context=context)
        if config.username:
            client.login(config.username, password)
        client.send_message(message)


@router.post("/email/test")
async def test_mail(data: MailTest, db: AsyncSession = Depends(get_db), actor: User = Depends(admin_only)):
    limiter.check(("admin-smtp-test", str(actor.id)), 3, 60)
    config, password = await mail_runtime(db)
    if not config.host or not config.from_email or (config.username and not password):
        raise HTTPException(400, "Điền máy chủ SMTP, email gửi và thông tin đăng nhập trước khi gửi thử")
    try:
        await asyncio.to_thread(send_mail, config, password, str(data.recipient))
    except (smtplib.SMTPException, OSError, ValueError):
        raise HTTPException(502, "Không gửi được email. Kiểm tra máy chủ, cổng, chế độ TLS và tài khoản SMTP.") from None
    db.add(AuditLog(user_id=actor.id, email=actor.email, action="smtp_test_sent"))
    await db.commit()
    return {"message": "Máy chủ SMTP đã nhận email kiểm tra. Hãy kiểm tra hộp thư và thư rác."}
