import json
import secrets
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi import HTTPException
from app.core.integrations import AIConfig, MailConfig, encrypt_secret, decrypt_secret, ai_runtime
from app.api.v1.integrations import get_ai, save_config, send_mail
from app.models import AdminSetting
from pydantic import SecretStr


@pytest.fixture(autouse=True)
def private_env(tmp_path, monkeypatch):
    from app.core.config import settings
    path = tmp_path / 'private' / 'integrations.env'
    monkeypatch.setattr(settings, 'INTEGRATIONS_ENV_FILE', str(path))
    return path


@pytest.mark.parametrize("url", ["http://example.com/v1", "https://user:pass@example.com/v1", "https://example.com/v1?key=example", "file:///etc/passwd"])
def test_ai_config_rejects_plaintext_remote_urls_and_embedded_credentials(url):
    with pytest.raises(ValueError):
        AIConfig(base_url=url, model="example-model")


def test_ai_config_accepts_local_proxy_without_weakening_public_tls():
    assert AIConfig(base_url="http://localhost:8000/v1", model="local-model").base_url == "http://localhost:8000/v1"


def test_integration_credentials_are_encrypted_with_separate_contexts():
    secret = secrets.token_urlsafe(24)
    encrypted = encrypt_secret(secret, "ai")
    assert secret not in encrypted
    assert decrypt_secret(encrypted, "ai") == secret
    with pytest.raises(HTTPException):
        decrypt_secret(encrypted, "smtp")


@pytest.mark.anyio
async def test_saved_config_encrypts_secret_and_public_response_never_returns_it(private_env):
    secret = secrets.token_urlsafe(24)
    row = AdminSetting(key="ai_integration", value={})
    result = MagicMock()
    result.scalar_one_or_none.return_value = row
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()
    actor = SimpleNamespace(id=uuid.uuid4(), email="audit@example.com")
    await save_config(db, "ai_integration", {"base_url": "https://example.com/v1", "model": "saved-model"}, SecretStr(secret), "ai", actor)
    assert secret not in json.dumps(row.value)
    assert 'secret' not in row.value
    assert secret not in private_env.read_text()
    assert private_env.stat().st_mode & 0o777 == 0o600
    public = await get_ai(db, actor)
    assert public["key_configured"] is True
    assert public["model"] == "saved-model"
    assert "secret" not in public and "api_key" not in public
    assert secret not in json.dumps(public)
    config, key = await ai_runtime(db)
    assert config.model == "saved-model" and key == secret


@pytest.mark.anyio
async def test_blank_secret_preserves_existing_key():
    from app.core.integrations import stored_secret, write_secret
    write_secret(secrets.token_urlsafe(20), "ai")
    before = stored_secret("ai")
    row = AdminSetting(key="ai_integration", value={})
    result = MagicMock()
    result.scalar_one_or_none.return_value = row
    db = MagicMock(execute=AsyncMock(return_value=result), commit=AsyncMock())
    await save_config(db, "ai_integration", {"model": "next-model"}, SecretStr(""), "ai", SimpleNamespace(id=uuid.uuid4(), email="audit@example.com"))
    assert stored_secret("ai") == before


def test_smtp_requires_verified_tls_before_sending_credentials(monkeypatch):
    from app.api.v1 import integrations
    client = MagicMock()
    client.__enter__.return_value = client
    smtp = MagicMock(return_value=client)
    monkeypatch.setattr(integrations.smtplib, "SMTP", smtp)
    password = secrets.token_urlsafe(20)
    config = MailConfig(host="mail.example.com", port=587, tls_mode="starttls", username="sender@example.com", from_email="sender@example.com")
    send_mail(config, password, "receiver@example.com")
    assert client.starttls.call_args.kwargs["context"].check_hostname is True
    calls = [call[0] for call in client.method_calls]
    assert calls.index("starttls") < calls.index("login") < calls.index("send_message")


def test_smtp_rejects_header_injection():
    with pytest.raises(ValueError):
        MailConfig(from_name="Name\r\nBcc: other@example.com")
