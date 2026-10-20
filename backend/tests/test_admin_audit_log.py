"""Tests for administrator analytics and authentication audit boundaries."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.auth import login
from app.core.security import get_password_hash
from app.models.audit import AuditLog
from app.schemas.user import AdminUserUpdate, LoginRequest
from app.models.user import UserRole


def test_audit_log_schema_never_persists_credentials_or_network_identity():
    columns = set(AuditLog.__table__.columns.keys())
    assert {"user_id", "action", "email", "occurred_at"}.issubset(columns)
    assert not {"password", "hashed_password", "access_token", "refresh_token", "request_body", "ip_address"}.intersection(columns)


def test_admin_cannot_assign_the_retired_teacher_role():
    with pytest.raises(ValueError):
        AdminUserUpdate(role=UserRole.TEACHER)


@pytest.mark.anyio
async def test_failed_login_creates_minimal_audit_event():
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()

    with pytest.raises(HTTPException) as failure:
        await login(LoginRequest(email="audit@example.com", password="wrong123"), db)

    assert failure.value.status_code == 401
    event = db.add.call_args.args[0]
    assert isinstance(event, AuditLog)
    assert event.action == "login_failed"
    assert event.email == "audit@example.com"
    assert not hasattr(event, "password")
    db.commit.assert_awaited_once()


@pytest.mark.anyio
async def test_successful_login_creates_success_audit_event():
    user = SimpleNamespace(
        id=uuid.uuid4(),
        email="audit@example.com",
        is_active=True,
        hashed_password=get_password_hash("right123"),
    )
    result = MagicMock()
    result.scalar_one_or_none.return_value = user
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()

    response = await login(LoginRequest(email=user.email, password="right123"), db)

    event = db.add.call_args.args[0]
    assert isinstance(event, AuditLog)
    assert event.user_id == user.id
    assert event.action == "login_success"
    assert "access_token" in response
    db.commit.assert_awaited_once()
