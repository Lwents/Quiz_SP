import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.anyio
async def test_learning_lists_require_login():
    subject_id = uuid.uuid4()
    lesson_id = uuid.uuid4()
    paths = [
        "/api/v1/subjects",
        f"/api/v1/subjects/{subject_id}/topics",
        "/api/v1/quizzes",
        f"/api/v1/lessons/subject/{subject_id}",
        f"/api/v1/lessons/{lesson_id}",
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for path in paths:
            response = await client.get(path)
            assert response.status_code == 401, path
