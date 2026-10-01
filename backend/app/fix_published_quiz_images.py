"""Replace the three misleading stock images in the multimedia quiz.

The horse and cube are extracted from the user's source Word document and
shipped with the backend. The source set has no matching fiber-optic picture,
so that question is made self-contained instead of showing an unrelated photo.
"""

import asyncio
import shutil
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.question import Question


ASSET_DIR = Path(__file__).resolve().parents[1] / "assets" / "quiz_images"
MEDIA_DIR = Path("/app/media/question-images")

FIXES = {
    "image-16": {
        "content": (
            "Quan sát hình con ngựa dạng đồ họa phẳng dưới đây. "
            "Đây là ví dụ về loại hoạt ảnh nào?\n\n"
            "![Hình con ngựa 2D]"
            "(http://localhost:8000/media/question-images/ttdpt_source_horse_2d.png)"
        ),
        "explanation": "Hình con ngựa dạng đồ họa phẳng minh họa cho hoạt ảnh hai chiều.",
        "asset": "ttdpt_source_horse_2d.png",
    },
    "image-17": {
        "content": (
            "Quan sát hình khối lập phương dạng khung dây trong không gian ba chiều "
            "dưới đây. Hình này minh họa cho kỹ thuật đồ họa nào?\n\n"
            "![Khối lập phương 3D]"
            "(http://localhost:8000/media/question-images/ttdpt_source_cube_3d.png)"
        ),
        "explanation": "Hình khối lập phương dạng khung dây đại diện cho 3D modeling / 3D graphics.",
        "asset": "ttdpt_source_cube_3d.png",
    },
    "image-18": {
        "content": "Phương tiện truyền dẫn nào sử dụng các sợi thủy tinh để truyền dữ liệu bằng xung ánh sáng?",
        "asset": None,
    },
}


async def repair_question_images() -> dict[str, int]:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    for item in FIXES.values():
        if item["asset"]:
            source = ASSET_DIR / item["asset"]
            assert source.is_file(), source
            target = MEDIA_DIR / item["asset"]
            if not target.is_file() or target.read_bytes() != source.read_bytes():
                shutil.copyfile(source, target)

    changed = 0
    found = {key: 0 for key in FIXES}
    async with AsyncSessionLocal() as db:
        questions = (await db.execute(select(Question))).scalars().all()
        for question in questions:
            source_qid = question.config.get("source_qid")
            if source_qid not in FIXES:
                continue
            found[source_qid] += 1
            fix = FIXES[source_qid]
            # Keep later user edits; migrate only the importer stock image.
            if "images.unsplash.com" not in question.content:
                continue
            question.content = fix["content"]
            if fix.get("explanation"):
                question.explanation = fix["explanation"]
            config = dict(question.config)
            config.pop("image_url", None)
            question.config = config
            changed += 1
        await db.commit()
    return {"changed": changed, **found}


if __name__ == "__main__":
    print(asyncio.run(repair_question_images()))
