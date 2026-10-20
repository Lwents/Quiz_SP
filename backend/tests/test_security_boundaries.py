"""Regression tests for attacks reproduced against the local application."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import jwt
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user, get_db
from app.core.config import Settings, settings
from app.core.rate_limit import SlidingWindowLimiter
from app.core.security import (
    create_access_token, create_refresh_token, decode_token,
    get_password_hash, token_matches_user,
)
from app.main import app
from app.models.attempt import AttemptStatus
from app.models.user import UserRole
from app.schemas.user import UserCreate, LoginRequest, ChangePasswordRequest
from app.schemas.attempt import SaveAnswerRequest
from app.student_questions import student_question_config


@pytest.fixture(autouse=True)
def clean_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_student_config_excludes_nested_keys_and_imported_answers():
    config = {
        "correct": "B", "answer_reference": "Private answer B", "verification_answer": "B",
        "image_url": "/media/example.png",
        "options": [{"id": "A", "text": "One", "correct": False},
                    {"id": "B", "text": "Two", "is_correct": True}],
    }
    visible = student_question_config("single_choice", config, "attempt")
    assert visible == {"image_url": "/media/example.png",
                       "options": [{"id": "A", "text": "One"}, {"id": "B", "text": "Two"}]}
    assert "correct" in config


@pytest.mark.parametrize("kind", ["matching", "drag_drop", "ordering"])
def test_student_config_preserves_interactions_without_the_key(kind):
    values = [f"item-{i}" for i in range(12)]
    config = {"correct_order": values, "pairs": [{"left": f"L{i}", "right": v} for i, v in enumerate(values)]}
    visible = student_question_config(kind, config, "stable-seed")
    assert visible == student_question_config(kind, config, "stable-seed")
    assert not {"correct_order", "pairs"}.intersection(visible)
    shuffled = visible["items"] if kind == "ordering" else visible["right_items"]
    assert sorted(shuffled) == sorted(values)
    assert shuffled != values


def test_password_change_and_deactivation_revoke_both_token_types():
    user = SimpleNamespace(id=uuid.uuid4(), hashed_password=get_password_hash("audit-password-1"), is_active=True)
    for create in (create_access_token, create_refresh_token):
        payload = decode_token(create(user.id, password_hash=user.hashed_password))
        assert token_matches_user(payload, user)
        user.is_active = False
        assert not token_matches_user(payload, user)
        user.is_active = True
        old_hash = user.hashed_password
        user.hashed_password = get_password_hash("audit-password-2")
        assert not token_matches_user(payload, user)
        user.hashed_password = old_hash
    assert not token_matches_user({"sub": str(user.id)}, user)


def test_unsigned_and_missing_expiry_tokens_are_rejected():
    unsigned = jwt.encode({"sub": str(uuid.uuid4()), "type": "access"}, "", algorithm="none")
    assert decode_token(unsigned) is None
    no_expiry = jwt.encode({"sub": str(uuid.uuid4()), "type": "access"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    assert decode_token(no_expiry) is None


@pytest.mark.parametrize("key", ["", "short", "change-this-jwt-secret-in-production-via-env"])
def test_placeholder_signing_keys_fail_closed(key):
    with pytest.raises(ValueError):
        Settings(SECRET_KEY=key, _env_file=None)


def test_password_inputs_cannot_silently_truncate_utf8():
    with pytest.raises(ValueError):
        UserCreate(email="audit@example.com", full_name="Audit", password="é" * 40)
    with pytest.raises(ValueError):
        LoginRequest(email="audit@example.com", password="é" * 40)
    with pytest.raises(ValueError):
        ChangePasswordRequest(current_password="valid123", new_password="é" * 40)
    with pytest.raises(ValueError):
        SaveAnswerRequest(answer="x" * 65537)


def test_rate_limit_is_bounded_and_returns_retry_after():
    limiter = SlidingWindowLimiter(max_keys=2)
    limiter.check("one", 1, 60)
    with pytest.raises(HTTPException) as failure:
        limiter.check("one", 1, 60)
    assert failure.value.status_code == 429
    assert int(failure.value.headers["Retry-After"]) > 0
    limiter.check("two", 1, 60)
    limiter.check("three", 1, 60)
    assert len(limiter.entries) == 2


def mock_db_and_student(attempt):
    student = SimpleNamespace(id=attempt.user_id, role=UserRole.STUDENT)
    result = MagicMock()
    result.scalar_one_or_none.return_value = attempt
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()
    async def override_db():
        yield db
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: student
    return db


@pytest.mark.anyio
async def test_cannot_reveal_answer_key_before_submission():
    attempt = SimpleNamespace(id=uuid.uuid4(), user_id=uuid.uuid4(), status=AttemptStatus.IN_PROGRESS)
    db = mock_db_and_student(attempt)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"/api/v1/attempts/{attempt.id}/result")
    assert response.status_code == 409
    assert "questions_review" not in response.text
    db.commit.assert_not_awaited()


@pytest.mark.anyio
async def test_cannot_save_question_outside_own_quiz():
    attempt = SimpleNamespace(id=uuid.uuid4(), user_id=uuid.uuid4(), quiz_id=uuid.uuid4(), status=AttemptStatus.IN_PROGRESS)
    db = mock_db_and_student(attempt)
    db.get = AsyncMock(return_value=SimpleNamespace(duration_minutes=0))
    membership = MagicMock()
    membership.scalar_one_or_none.return_value = None
    initial = MagicMock()
    initial.scalar_one_or_none.return_value = attempt
    db.execute.side_effect = [initial, membership]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.patch(f"/api/v1/attempts/{attempt.id}/answers/{uuid.uuid4()}", json={"answer": "A"})
    assert response.status_code == 404
    db.commit.assert_not_awaited()


@pytest.mark.anyio
async def test_api_security_headers_and_error_redaction():
    async def broken_db():
        raise RuntimeError("private database connection details")
        yield
    app.dependency_overrides[get_db] = broken_db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role=UserRole.ADMIN)
    async with AsyncClient(transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test") as client:
        response = await client.get("/api/v1/quizzes")
        assert response.status_code == 500
        assert "private database" not in response.text
        # Use an unauthenticated endpoint for headers independently of mocks.
        health = await client.get("/health")
        assert health.headers["x-content-type-options"] == "nosniff"


@pytest.mark.anyio
async def test_oversized_requests_are_rejected_even_without_content_length():
    async def chunked_body():
        for _ in range(20):
            yield b"x" * 1024
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/auth/login", content=b"x" * 20000)
        assert response.status_code == 413
        response = await client.post("/api/v1/auth/login", content=chunked_body())
        assert response.status_code == 413
