import secrets
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi import HTTPException
from pydantic import SecretStr
from app.core.admin_confirmation import confirm_admin_password
from app.core.security import get_password_hash
from app.api.v1.users import update_user_for_admin
from app.api.v1.admin import reset_password, ResetPassword, create_account, NewAccount, unlock_login, AdminConfirmation
from app.schemas.user import AdminUserUpdate
from app.models import UserRole


def administrator():
    password = secrets.token_urlsafe(16)
    actor = SimpleNamespace(id=uuid.uuid4(), email='admin@example.com', role=UserRole.ADMIN,
                            hashed_password=get_password_hash(password))
    return actor, password


def db_result(row):
    result = MagicMock()
    result.scalar_one_or_none.return_value = row
    return result


@pytest.mark.anyio
@pytest.mark.parametrize('changes', [{'role': UserRole.ADMIN}, {'role': UserRole.STUDENT}, {'is_active': False}, {'is_active': True}])
@pytest.mark.parametrize('supplied', [None, 'incorrect-example'])
async def test_account_changes_reject_missing_or_wrong_admin_password_before_db(changes, supplied):
    actor, _ = administrator()
    db = MagicMock(execute=AsyncMock(), commit=AsyncMock())
    with pytest.raises(HTTPException) as error:
        await update_user_for_admin(uuid.uuid4(), AdminUserUpdate(**changes, admin_password=supplied), db, actor)
    assert error.value.status_code == 403
    db.execute.assert_not_awaited()
    db.commit.assert_not_awaited()


@pytest.mark.anyio
async def test_correct_password_still_cannot_remove_last_active_admin():
    actor, password = administrator()
    target = SimpleNamespace(id=uuid.uuid4(), role=UserRole.ADMIN)
    count = MagicMock()
    count.scalar.return_value = 0
    db = MagicMock(execute=AsyncMock(side_effect=[MagicMock(), db_result(target), count]), commit=AsyncMock())
    with pytest.raises(HTTPException) as error:
        await update_user_for_admin(target.id, AdminUserUpdate(role=UserRole.STUDENT, admin_password=password), db, actor)
    assert error.value.status_code == 400
    db.commit.assert_not_awaited()


@pytest.mark.anyio
async def test_correct_admin_password_permits_role_change_and_response_excludes_password():
    actor, password = administrator()
    target = SimpleNamespace(id=uuid.uuid4(), email='student@example.com', full_name='Student', role=UserRole.STUDENT,
                             is_active=True, avatar_url=None, created_at=None)
    db = MagicMock(execute=AsyncMock(side_effect=[MagicMock(), db_result(target), db_result(None)]), commit=AsyncMock(), refresh=AsyncMock())
    response = await update_user_for_admin(target.id, AdminUserUpdate(role=UserRole.ADMIN, admin_password=password), db, actor)
    assert target.role == UserRole.ADMIN
    db.commit.assert_awaited_once()
    assert 'admin_password' not in response and password not in str(response)


@pytest.mark.anyio
async def test_reset_password_and_new_admin_creation_cannot_bypass_confirmation():
    actor, _ = administrator()
    db = MagicMock(execute=AsyncMock(), commit=AsyncMock())
    with pytest.raises(HTTPException) as error:
        await reset_password(uuid.uuid4(), ResetPassword(password=secrets.token_urlsafe(16)), db, actor)
    assert error.value.status_code == 403
    with pytest.raises(HTTPException) as error:
        await create_account(NewAccount(email='new@example.com', full_name='New admin', password=secrets.token_urlsafe(16), role='ADMIN'), db, actor)
    assert error.value.status_code == 403
    with pytest.raises(HTTPException) as error:
        await unlock_login(uuid.uuid4(), AdminConfirmation(), db, actor)
    assert error.value.status_code == 403
    db.execute.assert_not_awaited()


@pytest.mark.anyio
async def test_unlock_preserves_history_and_does_not_reactivate_disabled_account():
    actor, password = administrator()
    target = SimpleNamespace(id=uuid.uuid4(), email='Student@Example.com', is_active=False)
    db = MagicMock(execute=AsyncMock(return_value=db_result(target)), commit=AsyncMock())
    await unlock_login(target.id, AdminConfirmation(admin_password=password), db, actor)
    event = db.add.call_args.args[0]
    assert event.action == 'login_unlocked' and event.email == 'student@example.com'
    assert event.user_id == actor.id
    assert target.is_active is False
    db.commit.assert_awaited_once()
    db.delete.assert_not_called()


def test_admin_confirmation_accepts_correct_password_and_does_not_echo_it():
    actor, password = administrator()
    confirm_admin_password(actor, SecretStr(password))
    payload = AdminUserUpdate(role=UserRole.ADMIN, admin_password=password)
    assert password not in str(payload) and password not in payload.model_dump_json()


def test_repeated_admin_confirmation_attempts_are_limited():
    actor, _ = administrator()
    for _ in range(10):
        with pytest.raises(HTTPException):
            confirm_admin_password(actor, None)
    with pytest.raises(HTTPException) as error:
        confirm_admin_password(actor, None)
    assert error.value.status_code == 429
