import json
import uuid
from unittest.mock import MagicMock

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.api import deps
from app.api.v1 import ai
from app.main import app
from app.models.user import User


@pytest.mark.anyio
async def test_network_lab_uses_configured_model_and_current_diagram(monkeypatch):
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    app.dependency_overrides[deps.get_current_user] = lambda: user
    monkeypatch.setattr(ai.settings, "AI_API_KEY", "test-placeholder")
    seen = {}
    original_client = httpx.AsyncClient

    def provider(request: httpx.Request) -> httpx.Response:
        seen["payload"] = json.loads(request.content)
        return httpx.Response(200, json={"choices": [{"message": {"content": "PC1 gửi cho cổng R1 .1 vì PC2 ở mạng khác."}}]})

    monkeypatch.setattr(ai.httpx, "AsyncClient", lambda **kwargs: original_client(transport=httpx.MockTransport(provider), **kwargs))
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/ai/network-lab/ask", json={
                "lab_id": "week1-two-router-diagram",
                "question": "Vì sao cần gateway?",
                "lesson_context": "PC1 .20/26, R1 .1, PC2 .150/26",
                "topology_context": "PC1 gateway 192.168.1.1; R1 F0/1 192.168.1.1",
                "history": [{"role": "user", "content": "Mask là gì?"}, {"role": "assistant", "content": "Mask cho biết ranh giới mạng."}],
            })
        assert response.status_code == 200
        assert "cổng R1" in response.json()["answer"]
        assert seen["payload"]["model"] == ai.settings.AI_MODEL
        assert "PC1 gateway 192.168.1.1" in seen["payload"]["messages"][1]["content"]
        assert seen["payload"]["messages"][-1]["content"] == "Vì sao cần gateway?"
        assert seen["payload"]["messages"][2]["content"] == "Mask là gì?"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_network_lab_rejects_unknown_lab(monkeypatch):
    app.dependency_overrides[deps.get_current_user] = lambda: MagicMock(spec=User)
    monkeypatch.setattr(ai.settings, "AI_API_KEY", "test-placeholder")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/ai/network-lab/ask", json={
                "lab_id": "unknown", "question": "Vì sao?", "lesson_context": "x", "topology_context": "x",
            })
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_network_lab_reports_provider_timeout(monkeypatch):
    app.dependency_overrides[deps.get_current_user] = lambda: MagicMock(spec=User)
    monkeypatch.setattr(ai.settings, "AI_API_KEY", "test-placeholder")
    original_client = httpx.AsyncClient

    def provider(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("provider unavailable")

    monkeypatch.setattr(ai.httpx, "AsyncClient", lambda **kwargs: original_client(transport=httpx.MockTransport(provider), **kwargs))
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/ai/network-lab/ask", json={
                "lab_id": "week1-two-router-diagram", "question": "Gateway là gì?",
                "lesson_context": "PC1 192.168.1.20/26", "topology_context": "PC1 gateway 192.168.1.1",
            })
        assert response.status_code == 504
        assert "Dịch vụ AI hiện không kết nối được" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()
