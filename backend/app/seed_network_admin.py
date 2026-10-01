"""Seed COMP303 lessons from the user's local course materials.

Lessons are original explanations based on the week-one and week-three/four
handouts. Existing teacher edits remain untouched.
"""

import shutil
import hashlib
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.lesson import Lesson
from app.models.quiz import Subject, Topic


CONTENT_DIR = Path(__file__).resolve().parent / "data" / "network_admin_course"
ASSET = Path(__file__).resolve().parents[1] / "assets" / "network_admin" / "routersim_manual.pdf"
MEDIA = Path("/app/media/course-slides") / "comp303_routersim_manual.pdf"
MANUAL_URL = "http://localhost:8000/media/course-slides/comp303_routersim_manual.pdf"
PREVIOUS_IP_LESSON_SHA256 = "08383aa1f07fc0263a45dcaf1e4006fa7713999728fc98ba93ebc0504c917458"
CURRICULUM = [
    (
        "Tuần 1: Địa chỉ IP và cấu hình mạng cơ bản",
        "Ôn IP, chia mạng con và thực hành các sơ đồ RouterSim trong tuần đầu.",
        [
            ("01_ip_subnet.md", "Ôn địa chỉ IPv4 và chia mạng con", 20),
            ("02_devices.md", "PC, switch và router làm việc cùng nhau", 18),
            ("03_routersim.md", "Thực hành ba sơ đồ mạng Tuần 1", 30),
            ("04_diagnostics.md", "Kiểm tra kết nối và tìm lỗi cấu hình", 20),
        ],
    ),
    (
        "Tuần 3–4: Kết nối nhiều router và định tuyến RIP",
        "Bài thực hành hai, ba và bốn router từ một khối địa chỉ theo tài liệu học phần.",
        [
            ("05_subnet_one_range.md", "Chia một khối /24 thành các mạng /26", 20),
            ("06_three_router_rip.md", "Kết nối ba router và học đường đi với RIP", 25),
            ("07_four_router_plan.md", "Tự thiết kế bài ba và bốn router", 25),
        ],
    ),
]


async def seed_network_admin_course() -> dict:
    assert ASSET.is_file(), ASSET
    MEDIA.parent.mkdir(parents=True, exist_ok=True)
    if not MEDIA.is_file() or MEDIA.stat().st_size != ASSET.stat().st_size:
        shutil.copyfile(ASSET, MEDIA)
    async with AsyncSessionLocal() as db:
        subject = (await db.execute(select(Subject).where(Subject.code == "COMP303"))).scalar_one_or_none()
        if subject is None:
            subject = Subject(
                code="COMP303",
                name="Quản trị mạng",
                description=(
                    "[26-27-1] COMP303. Bài học Tuần 1 và Tuần 3–4 từ tài liệu học phần: "
                    "địa chỉ IP, chia mạng con, cấu hình PC/switch/router, RIP và thực hành mô phỏng."
                ),
            )
            db.add(subject)
            await db.flush()
        elif subject.description and "Các tuần tiếp theo sẽ được bổ sung" in subject.description:
            subject.description = (
                "[26-27-1] COMP303. Bài học Tuần 1 và Tuần 3–4 từ tài liệu học phần: "
                "địa chỉ IP, chia mạng con, cấu hình PC/switch/router, RIP và thực hành mô phỏng."
            )

        added = 0
        updated = 0
        for topic_order, (topic_name, topic_description, lessons) in enumerate(CURRICULUM, start=1):
            topic = (await db.execute(
                select(Topic).where(Topic.subject_id == subject.id, Topic.name == topic_name)
            )).scalar_one_or_none()
            if topic is None:
                topic = Topic(
                    subject_id=subject.id, name=topic_name,
                    description=topic_description, order=topic_order,
                )
                db.add(topic)
                await db.flush()
            for order, (filename, title, duration) in enumerate(lessons, start=1):
                content = (CONTENT_DIR / filename).read_text(encoding="utf-8")
                existing = (await db.execute(
                    select(Lesson).where(Lesson.topic_id == topic.id, Lesson.title == title)
                )).scalar_one_or_none()
                if existing is not None:
                    # Correct our first provisional lesson from before the official
                    # /26 guide was available, but preserve any teacher revision.
                    if filename == "03_routersim.md" and "10.0.0.0/8" in existing.content:
                        existing.content = content
                        existing.slide_url = MANUAL_URL
                        updated += 1
                    elif filename == "01_ip_subnet.md" and hashlib.sha256(existing.content.encode("utf-8")).hexdigest() == PREVIOUS_IP_LESSON_SHA256:
                        # Add the classful-address and subnetting explanation from
                        # Dia_chi_IP.ppt only when this is still our original text.
                        existing.content = content
                        updated += 1
                    continue
                db.add(Lesson(
                    topic_id=topic.id,
                    title=title,
                    description=content.splitlines()[2].replace("**Mục tiêu:**", "").strip()[:500],
                    content=content,
                    duration_minutes=duration,
                    order=order,
                    slide_url=MANUAL_URL if filename == "03_routersim.md" else None,
                ))
                added += 1
        await db.commit()
        return {"subject": "COMP303", "topics": len(CURRICULUM),
                "lessons": sum(len(item[2]) for item in CURRICULUM),
                "added_lessons": added, "corrected_provisional": updated}
