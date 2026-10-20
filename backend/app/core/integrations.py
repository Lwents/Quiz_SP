"""Runtime integration settings; secrets are write-only and encrypted at rest."""
import base64
import hashlib
import hmac
import os
import ipaddress
from pathlib import Path
from threading import Lock
from dotenv import dotenv_values, set_key
from urllib.parse import urlsplit
from typing import Literal
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from pydantic import BaseModel, Field, SecretStr, field_validator
from sqlalchemy import select
from app.core.config import settings
from app.models.admin import AdminSetting

_secret_write_lock = Lock()


def stored_secret(context: str) -> str:
    name = "INTEGRATION_" + context.upper() + "_SECRET"
    values = dotenv_values(settings.INTEGRATIONS_ENV_FILE)
    return values.get(name) or os.environ.get(name, "")


def write_secret(secret: str, context: str):
    # Private environment file lives in its own persistent volume, outside
    # static media and database snapshots. Only encrypted values are stored.
    path = Path(settings.INTEGRATIONS_ENV_FILE)
    with _secret_write_lock:
        path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        if not path.exists():
            path.touch(mode=0o600)
        set_key(str(path), "INTEGRATION_" + context.upper() + "_SECRET", encrypt_secret(secret, context), quote_mode="always")
        path.chmod(0o600)


class AIConfig(BaseModel):
    base_url: str = Field(min_length=1, max_length=1000)
    model: str = Field(min_length=1, max_length=200)

    @field_validator("base_url")
    @classmethod
    def valid_url(cls, value):
        value = value.strip().rstrip('/')
        url = urlsplit(value)
        if url.scheme not in ("http", "https") or not url.hostname or url.username or url.password or url.query or url.fragment:
            raise ValueError("URL API không hợp lệ; không nhúng khóa vào URL")
        if any(c.isspace() for c in url.hostname):
            raise ValueError("Tên máy chủ API không hợp lệ")
        _ = url.port  # urlsplit validates the port only when this property is read.
        # Preserve an upstream explicitly configured by the server operator
        # (including Docker service names), while requiring TLS for new public URLs.
        local = url.hostname in ("localhost", "127.0.0.1", "::1") or value == settings.AI_BASE_URL.rstrip('/')
        try:
            address = ipaddress.ip_address(url.hostname)
            local = local or (address.is_private and not address.is_link_local and not address.is_unspecified and not address.is_reserved)
        except ValueError:
            pass
        if url.scheme == "http" and not local:
            raise ValueError("API ngoài máy chủ phải dùng HTTPS")
        return value

    @field_validator("model")
    @classmethod
    def valid_model(cls, value):
        if not value.strip() or any(c in value for c in '\r\n'):
            raise ValueError("Model không hợp lệ")
        return value.strip()


class AIConfigInput(AIConfig):
    api_key: SecretStr | None = None


class MailConfig(BaseModel):
    host: str = Field(default="", max_length=255)
    port: int = Field(default=465, ge=1, le=65535)
    tls_mode: Literal["ssl", "starttls"] = "ssl"
    username: str = Field(default="", max_length=255)
    from_email: str = Field(default="", max_length=255)
    from_name: str = Field(default="Lwent Pro", min_length=1, max_length=120)

    @field_validator("host", "username", "from_email", "from_name")
    @classmethod
    def no_newlines(cls, value):
        if any(c in value for c in '\r\n'):
            raise ValueError("Không cho phép ký tự xuống dòng")
        return value.strip()

    @field_validator("host")
    @classmethod
    def hostname_only(cls, value):
        if any(c in value for c in '/:@?# '):
            raise ValueError("Chỉ nhập tên máy chủ SMTP")
        return value

    @field_validator("from_email")
    @classmethod
    def valid_sender(cls, value):
        if value:
            from email_validator import validate_email
            validate_email(value, check_deliverability=False)
        return value


class MailConfigInput(MailConfig):
    password: SecretStr | None = None


def cipher(context: str):
    # Domain-separate a Fernet key from the high-entropy server signing secret.
    # The master secret is environment-only and is never part of DB backups.
    derived = hmac.new(settings.SECRET_KEY.encode(), ("quiz-sp-integrations:" + context).encode(), hashlib.sha256).digest()
    return Fernet(base64.urlsafe_b64encode(derived))


def encrypt_secret(value: str, context: str) -> str:
    return cipher(context).encrypt(value.encode()).decode()


def decrypt_secret(value: str, context: str) -> str:
    try:
        return cipher(context).decrypt(value.encode()).decode()
    except (InvalidToken, ValueError, UnicodeError):
        raise HTTPException(503, "Không giải mã được thông tin tích hợp. Hãy nhập lại khóa/mật khẩu trong quản trị.") from None


async def read_config(db, key):
    row = (await db.execute(select(AdminSetting).where(AdminSetting.key == key))).scalar_one_or_none()
    return row.value if row else {}


async def ai_runtime(db, *, decrypt=True):
    saved = await read_config(db, "ai_integration")
    config = AIConfig(base_url=saved.get("base_url", settings.AI_BASE_URL), model=saved.get("model", settings.AI_MODEL))
    encrypted = stored_secret("ai")
    key = (decrypt_secret(encrypted, "ai") if decrypt else "configured") if encrypted else settings.AI_API_KEY
    return config, key


async def mail_runtime(db, *, decrypt=True):
    saved = await read_config(db, "mail_integration")
    defaults = MailConfig(host=settings.SMTP_HOST, port=settings.SMTP_PORT, tls_mode=settings.SMTP_TLS_MODE,
        username=settings.SMTP_USERNAME, from_email=settings.SMTP_FROM_EMAIL, from_name=settings.SMTP_FROM_NAME).model_dump()
    values = {**defaults, **{k: v for k, v in saved.items() if k != "secret"}}
    # Existing installations may have saved the former product name as the
    # default sender. Keep custom sender names while updating that old default.
    if values.get("from_name", "").strip().casefold() in {"hnue", "hnue pro"}:
        values["from_name"] = "Lwent Pro"
    config = MailConfig(**values)
    encrypted = stored_secret("smtp")
    password = (decrypt_secret(encrypted, "smtp") if decrypt else "configured") if encrypted else settings.SMTP_PASSWORD
    return config, password
