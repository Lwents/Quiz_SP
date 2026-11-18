import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.deps import get_current_user, get_db
from app.models.user import UserRole
from app.models.attempt import AttemptStatus
from datetime import datetime, timezone

@pytest.mark.asyncio
@pytest.mark.parametrize('role', [UserRole.STUDENT, UserRole.TEACHER])
async def test_history_rejects_non_admin(role):
    db = SimpleNamespace(get=AsyncMock())
    async def database(): yield db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role=role)
    app.dependency_overrides[get_db] = database
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            res = await client.get(f'/api/v1/users/admin/{uuid.uuid4()}/attempts')
        assert res.status_code == 403
        db.get.assert_not_awaited()
    finally: app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_admin_history_returns_scores_and_limits():
    uid = uuid.uuid4()
    count = MagicMock(); count.scalar_one.return_value = 21
    row = SimpleNamespace(id=uuid.uuid4(), quiz=SimpleNamespace(title='Toán rời rạc', duration_minutes=30), quiz_id=uuid.uuid4(), status=AttemptStatus.GRADED, score=8, max_score=10, started_at=datetime.now(timezone.utc), submitted_at=datetime.now(timezone.utc), duration_seconds=60, extra_minutes=0)
    rows = MagicMock(); rows.scalars.return_value.all.return_value = [row]
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(id=uid)), execute=AsyncMock(side_effect=[count, rows]))
    async def database(): yield db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role=UserRole.ADMIN)
    app.dependency_overrides[get_db] = database
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            res = await client.get(f'/api/v1/users/admin/{uid}/attempts?limit=20&offset=20')
            invalid = await client.get(f'/api/v1/users/admin/{uid}/attempts?limit=10000')
        assert res.status_code == 200
        assert res.json()['total'] == 21
        item = res.json()['items'][0]
        assert item['score'] == 8 and item['percentage'] == 80
        assert item['timed'] is True and item['extra_minutes'] == 0
        assert 'password' not in item and 'answer' not in item
        assert invalid.status_code == 422
        statement = db.execute.call_args_list[1].args[0].compile().params
        assert 20 in statement.values() and uid in statement.values()
    finally: app.dependency_overrides.clear()
