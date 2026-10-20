"""Persisted controls that are enforced by authentication endpoints."""
from pydantic import BaseModel, Field
from sqlalchemy import select
from app.models.admin import AdminSetting


class AdminPolicy(BaseModel):
    registration_enabled: bool = True
    session_hours: int = Field(default=24, ge=1, le=168)
    idle_minutes: int = Field(default=120, ge=5, le=1440)
    failed_attempts: int = Field(default=10, ge=3, le=30)
    failure_window_minutes: int = Field(default=15, ge=1, le=60)
    lockout_minutes: int = Field(default=15, ge=1, le=120)


async def load_policy(db):
    row = (await db.execute(select(AdminSetting).where(AdminSetting.key == "auth_policy"))).scalar_one_or_none()
    return AdminPolicy() if row is None else AdminPolicy.model_validate(row.value)
