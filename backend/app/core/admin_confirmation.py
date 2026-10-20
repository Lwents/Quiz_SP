"""Recheck the signed-in administrator before sensitive account changes."""
from fastapi import HTTPException
from pydantic import SecretStr
from app.core.rate_limit import limiter
from app.core.security import verify_password


def confirm_admin_password(actor, password: SecretStr | None):
    limiter.check(("admin-confirmation", str(actor.id)), 10, 60)
    value = password.get_secret_value() if password else ""
    if not value or len(value.encode()) > 72 or not verify_password(value, actor.hashed_password):
        raise HTTPException(403, "Mật khẩu quản trị viên chưa chính xác. Thao tác chưa được thực hiện.")
