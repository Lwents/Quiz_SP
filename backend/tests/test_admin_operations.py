import uuid
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models.user import UserRole
from app.models.admin import LoginSession, AdminSetting
from app.core.admin_policy import AdminPolicy
from app.core.login_sessions import validate_session
from app.api.v1.admin import NoticeInput, NewAccount
from app.api.v1.auth import register, login
from app.schemas.user import UserCreate, LoginRequest


@pytest.fixture(autouse=True)
def clear_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


@pytest.mark.anyio
@pytest.mark.parametrize("path", ["/admin/policy", "/admin/health", "/admin/reports", "/admin/sessions", "/admin/activity", "/admin/announcements", "/admin/integrations/ai", "/admin/integrations/email", "/admin/presence/stream"])
async def test_student_cannot_access_operational_admin_data(path):
    db = MagicMock()
    async def override_db():
        yield db
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role=UserRole.STUDENT)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1" + path, headers={"Authorization": "Bearer test-placeholder"})
    assert response.status_code == 403
    db.execute.assert_not_called()


@pytest.mark.parametrize("data", [{"session_hours": 0}, {"idle_minutes": 1}, {"failed_attempts": 1}, {"lockout_minutes": 1000}])
def test_operational_policy_rejects_unsafe_bounds(data):
    with pytest.raises(ValueError):
        AdminPolicy(**data)


def test_notice_and_account_inputs_reject_invalid_data():
    with pytest.raises(ValueError):
        NoticeInput(title="   ", message="message")
    with pytest.raises(ValueError):
        NewAccount(full_name="Test", email="audit@example.com", password="test1234", role="TEACHER")


def result(value):
    row = MagicMock()
    row.scalar_one_or_none.return_value = value
    return row


@pytest.mark.anyio
@pytest.mark.parametrize("kind", ["revoked", "expired", "idle", "missing"])
async def test_session_cannot_be_used_after_revocation_expiry_or_idle(kind):
    now = datetime.now(timezone.utc)
    session = SimpleNamespace(id=uuid.uuid4(), revoked=kind == "revoked", expires_at=now + timedelta(hours=1), last_seen_at=now)
    if kind == "expired":
        session.expires_at = now - timedelta(seconds=1)
    if kind == "idle":
        session.last_seen_at = now - timedelta(days=1)
    db = MagicMock()
    db.execute = AsyncMock(side_effect=[result(None if kind == "missing" else session), result(None)])
    with pytest.raises(HTTPException) as error:
        await validate_session(db, {"sid": str(session.id)}, uuid.uuid4())
    assert error.value.status_code == 401


@pytest.mark.anyio
async def test_closed_registration_is_enforced_by_api():
    row = AdminSetting(key="auth_policy", value=AdminPolicy(registration_enabled=False).model_dump())
    db = MagicMock()
    db.execute = AsyncMock(return_value=result(row))
    with pytest.raises(HTTPException) as error:
        await register(UserCreate(email="audit@example.com", full_name="Audit", password="test1234"), db)
    assert error.value.status_code == 403
    db.add.assert_not_called()


@pytest.mark.anyio
async def test_temporarily_locked_account_is_rejected_before_password_check():
    locked = MagicMock()
    locked.scalar.return_value = 1
    db = MagicMock()
    db.execute = AsyncMock(side_effect=[result(None), result(None), locked])
    with pytest.raises(HTTPException) as error:
        await login(LoginRequest(email="audit@example.com", password="test1234"), db)
    assert error.value.status_code == 429
    assert int(error.value.headers["Retry-After"]) > 0


@pytest.mark.anyio
async def test_threshold_failure_records_temporary_lock():
    policy = AdminSetting(key="auth_policy", value=AdminPolicy(failed_attempts=3).model_dump())
    unlocked, failures = MagicMock(), MagicMock()
    unlocked.scalar.return_value = 0
    failures.scalar.return_value = 2
    db = MagicMock()
    db.execute = AsyncMock(side_effect=[result(None), result(policy), unlocked, failures])
    db.commit = AsyncMock()
    with pytest.raises(HTTPException) as error:
        await login(LoginRequest(email="audit@example.com", password="test1234"), db)
    assert error.value.status_code == 401
    assert [call.args[0].action for call in db.add.call_args_list] == ["login_failed", "login_locked"]


@pytest.mark.anyio
async def test_background_poll_does_not_extend_activity():
    now = datetime.now(timezone.utc)
    session = SimpleNamespace(id=uuid.uuid4(), revoked=False, expires_at=now + timedelta(hours=1), last_seen_at=now - timedelta(minutes=2))
    db = MagicMock()
    db.execute = AsyncMock(side_effect=[result(session), result(None)])
    db.commit = AsyncMock()
    before = session.last_seen_at
    await validate_session(db, {"sid": str(session.id)}, uuid.uuid4(), touch=False)
    assert session.last_seen_at == before
    db.commit.assert_not_awaited()
