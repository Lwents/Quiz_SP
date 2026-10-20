"""Test confirmation gates and single-use links without real email delivery."""
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi import HTTPException
from app.api.v1.auth import verify_email, VerificationToken, resend_verification, VerificationEmail
from app.core import email_verification as service


def database(*rows):
    results = []
    for row in rows:
        result = MagicMock()
        result.scalar_one_or_none.return_value = row
        results.append(result)
    return MagicMock(execute=AsyncMock(side_effect=results), flush=AsyncMock(), commit=AsyncMock())


@pytest.mark.anyio
async def test_pending_cannot_login_but_legacy_and_verified_can():
    user = SimpleNamespace(id=uuid.uuid4())
    with pytest.raises(HTTPException) as error:
        await service.require_verified(database(SimpleNamespace(verified_at=None)), user)
    assert error.value.status_code == 403
    await service.require_verified(database(None), user)
    await service.require_verified(database(SimpleNamespace(verified_at=datetime.now(timezone.utc))), user)


@pytest.mark.anyio
async def test_send_stores_hash_only_and_delivers_to_owner(monkeypatch):
    mail = MagicMock()
    monkeypatch.setattr(service, 'send_mail', mail)
    monkeypatch.setattr(service, 'mail_runtime', AsyncMock(return_value=(SimpleNamespace(host='mail.example.com', from_email='sender@example.com', username=''), '')))
    monkeypatch.setattr(service.settings, 'PUBLIC_APP_URL', 'https://app.example.com')
    db = database(None)
    user = SimpleNamespace(id=uuid.uuid4(), email='recipient@example.com')
    await service.send_verification(db, user)
    row = db.add.call_args.args[0]
    token = mail.call_args.kwargs['body'].split('?token=')[1].split()[0]
    assert row.token_hash == service.token_digest(token) and token != row.token_hash
    assert mail.call_args.args[2] == user.email
    assert 'https://app.example.com/verify-email?' in mail.call_args.kwargs['body']
    assert row.expires_at > row.sent_at + timedelta(hours=23)


@pytest.mark.anyio
async def test_confirmation_invalid_expired_valid_and_repeatable_after_success():
    token = VerificationToken(token=secrets.token_urlsafe(32))
    now = datetime.now(timezone.utc)
    for row in [None, SimpleNamespace(verified_at=None, expires_at=now-timedelta(seconds=1))]:
        db = database(row)
        with pytest.raises(HTTPException) as error:
            await verify_email(token, db)
        assert error.value.status_code == 400
        db.commit.assert_not_called()
    previously_verified = SimpleNamespace(verified_at=now, expires_at=now+timedelta(hours=1))
    db = database(previously_verified)
    response = await verify_email(token, db)
    assert response["message"] == "Email đã được xác minh. Bạn có thể đăng nhập."
    db.commit.assert_not_called()
    row = SimpleNamespace(verified_at=None, expires_at=now+timedelta(hours=1))
    db = database(row)
    await verify_email(token, db)
    db.commit.assert_awaited_once()
    repeated = await verify_email(token, database(row))
    assert repeated["message"] == "Email đã được xác minh. Bạn có thể đăng nhập."


@pytest.mark.anyio
async def test_resend_generic_and_throttled_per_account(monkeypatch):
    send = AsyncMock()
    monkeypatch.setattr('app.api.v1.auth.send_verification', send)
    data = VerificationEmail(email='recipient@example.com')
    absent = await resend_verification(data, database(None))
    recent = await resend_verification(data, database(SimpleNamespace(id=uuid.uuid4()), SimpleNamespace(verified_at=None, sent_at=datetime.now(timezone.utc))))
    assert recent == absent
    send.assert_not_awaited()


@pytest.mark.anyio
async def test_smtp_failure_is_redacted(monkeypatch):
    monkeypatch.setattr(service, 'mail_runtime', AsyncMock(return_value=(SimpleNamespace(host='mail.example.com', from_email='sender@example.com', username=''), '')))
    monkeypatch.setattr(service, 'send_mail', MagicMock(side_effect=OSError('private provider detail')))
    with pytest.raises(HTTPException) as error:
        await service.send_verification(database(None), SimpleNamespace(id=uuid.uuid4(), email='recipient@example.com'))
    assert error.value.status_code == 502 and 'private' not in str(error.value.detail)


@pytest.mark.parametrize('url', ['https://user:pass@example.com', 'http://example.com', 'https://example.com?redirect=other', 'file:///tmp'])
def test_confirmation_url_requires_trusted_origin(monkeypatch, url):
    monkeypatch.setattr(service.settings, 'PUBLIC_APP_URL', url)
    with pytest.raises(HTTPException):
        service.confirmation_url(secrets.token_urlsafe(32))
