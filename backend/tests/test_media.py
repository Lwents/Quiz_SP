import uuid
from unittest.mock import MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.api import deps
from app.api.v1 import media
from app.api.v1.media import detect_image_extension
from app.main import app
from app.models.user import User, UserRole


def test_detect_image_extension_accepts_supported_signatures():
    assert detect_image_extension(b"\xff\xd8\xff\xe0jpeg") == ".jpg"
    assert detect_image_extension(b"\x89PNG\r\n\x1a\npng") == ".png"
    assert detect_image_extension(b"GIF89agif") == ".gif"
    assert detect_image_extension(b"RIFFxxxxWEBPwebp") == ".webp"


def test_detect_image_extension_rejects_non_images():
    assert detect_image_extension(b"not an image") is None


@pytest.mark.anyio
async def test_admin_can_upload_a_question_screenshot(monkeypatch, tmp_path):
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.role = UserRole.ADMIN
    monkeypatch.setattr(media, "QUESTION_IMAGE_DIR", tmp_path)
    app.dependency_overrides[deps.get_current_user] = lambda: user

    png = b"\x89PNG\r\n\x1a\nsmall-test-image"
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/media/question-images",
                files={"file": ("source-question.png", png, "image/png")},
            )
        assert response.status_code == 201
        uploaded_name = response.json()["filename"]
        assert uploaded_name.endswith(".png")
        assert (tmp_path / uploaded_name).read_bytes() == png
    finally:
        app.dependency_overrides.clear()
