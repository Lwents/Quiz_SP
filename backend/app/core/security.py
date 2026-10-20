import bcrypt
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
import jwt
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password exceeds bcrypt's 72-byte limit")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")


def password_fingerprint(password_hash: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), password_hash.encode(), hashlib.sha256).hexdigest()


def token_matches_user(payload: dict, user) -> bool:
    fingerprint = payload.get("pwd")
    return bool(user and user.is_active and isinstance(fingerprint, str)
                and hmac.compare_digest(fingerprint, password_fingerprint(user.hashed_password)))


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None, *, password_hash: Optional[str] = None, session_id=None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    if session_id is not None:
        to_encode["sid"] = str(session_id)
    if password_hash is not None:
        to_encode["pwd"] = password_fingerprint(password_hash)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None, *, password_hash: Optional[str] = None, session_id=None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    if session_id is not None:
        to_encode["sid"] = str(session_id)
    if password_hash is not None:
        to_encode["pwd"] = password_fingerprint(password_hash)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],
                             options={"require": ["exp", "sub", "type"]})
        return decoded
    except jwt.PyJWTError:
        return None
