from unittest.mock import AsyncMock, MagicMock

import pytest

from app import seed
from app.core.security import verify_password
from app.models import UserRole


def bootstrap_session(monkeypatch, existing_user):
    session = MagicMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = existing_user
    session.execute = AsyncMock(return_value=result)
    session.commit = AsyncMock()
    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=session)
    context.__aexit__ = AsyncMock(return_value=False)
    monkeypatch.setattr(seed, "init_db", AsyncMock())
    monkeypatch.setattr(seed, "AsyncSessionLocal", lambda: context)
    return session


@pytest.mark.asyncio
async def test_empty_database_creates_only_admin(monkeypatch):
    session = bootstrap_session(monkeypatch, None)
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "admin@example.com")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_PASSWORD", "bootstrap-test-password")

    await seed.seed_data()

    session.add.assert_called_once()
    admin = session.add.call_args.args[0]
    assert admin.role == UserRole.ADMIN
    assert admin.email == "admin@example.com"
    assert verify_password("bootstrap-test-password", admin.hashed_password)
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_restart_preserves_existing_accounts_and_data(monkeypatch):
    session = bootstrap_session(monkeypatch, "existing-user")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_PASSWORD", "different-test-password")

    await seed.seed_data()

    session.add.assert_not_called()
    session.commit.assert_not_awaited()
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_empty_database_requires_admin_password(monkeypatch):
    session = bootstrap_session(monkeypatch, None)
    monkeypatch.delenv("ADMIN_BOOTSTRAP_PASSWORD", raising=False)

    with pytest.raises(RuntimeError, match="ADMIN_BOOTSTRAP_PASSWORD"):
        await seed.seed_data()

    session.add.assert_not_called()
