"""Teacher/admin uploads for question illustrations.

Images are stored in a dedicated persistent media volume and returned with an
absolute URL so they can be used directly in a question's ``config.image_url``.
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.api.deps import require_role
from app.models.user import User, UserRole


router = APIRouter(prefix="/media", tags=["media"])

QUESTION_IMAGE_DIR = Path("/app/media/question-images")
MAX_IMAGE_BYTES = 8 * 1024 * 1024


def detect_image_extension(data: bytes) -> str | None:
    """Return a trusted extension from common image signatures, if recognized."""
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return ".webp"
    return None


@router.post("/question-images", status_code=status.HTTP_201_CREATED)
async def upload_question_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    """Store an image used by a question and return its public local URL."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Chỉ hỗ trợ tệp hình ảnh (JPG, PNG, GIF hoặc WEBP).")

    data = await file.read(MAX_IMAGE_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Tệp ảnh đang trống.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Ảnh không được vượt quá 8 MB.")

    extension = detect_image_extension(data)
    if extension is None:
        raise HTTPException(status_code=415, detail="Định dạng ảnh không hợp lệ.")

    QUESTION_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    (QUESTION_IMAGE_DIR / filename).write_bytes(data)

    base_url = str(request.base_url).rstrip("/")
    return {"url": f"{base_url}/media/question-images/{filename}", "filename": filename}
