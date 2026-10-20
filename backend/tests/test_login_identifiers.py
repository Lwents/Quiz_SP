import secrets
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi import HTTPException
from app.api.v1.auth import login
from app.core.security import get_password_hash
from app.schemas.user import LoginRequest


def login_database(user):
    found = MagicMock()
    found.scalar_one_or_none.return_value = user
    none = MagicMock()
    none.scalar_one_or_none.return_value = None
    count = MagicMock()
    count.scalar.return_value = 0
    return MagicMock(execute=AsyncMock(side_effect=[found, none, count, none]), commit=AsyncMock())


@pytest.mark.anyio
@pytest.mark.parametrize('identifier', ['audit@example.com', 'AUDIT@EXAMPLE.COM', 'AuDiT@Example.Com', '  AUDIT@EXAMPLE.COM  '])
async def test_email_case_and_outer_whitespace_do_not_change_login(identifier):
    password = secrets.token_urlsafe(16)
    user = SimpleNamespace(id=uuid.uuid4(), email='Audit@Example.COM', is_active=True, hashed_password=get_password_hash(password))
    db = login_database(user)
    response = await login(LoginRequest(email=identifier, password=password), db)
    assert response['access_token']
    statement = db.execute.call_args_list[0].args[0]
    assert 'audit@example.com' in statement.compile().params.values()
    assert 'lower(trim(users.email))' in str(statement)


@pytest.mark.anyio
async def test_password_remains_case_sensitive_and_error_is_vietnamese():
    password = 'aB' + secrets.token_urlsafe(12)
    user = SimpleNamespace(id=uuid.uuid4(), email='audit@example.com', is_active=True, hashed_password=get_password_hash(password))
    db = login_database(user)
    count = MagicMock()
    count.scalar.return_value = 0
    found, policy = MagicMock(), MagicMock()
    found.scalar_one_or_none.return_value = user
    policy.scalar_one_or_none.return_value = None
    db.execute.side_effect = [found, policy, count, count]
    with pytest.raises(HTTPException) as error:
        await login(LoginRequest(email='AUDIT@EXAMPLE.COM', password=password.swapcase()), db)
    assert error.value.status_code == 401
    assert error.value.detail['error']['code'] == 'INVALID_CREDENTIALS'
    assert 'mật khẩu' in error.value.detail['error']['message']
