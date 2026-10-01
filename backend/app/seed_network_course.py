"""Create the K74 Advanced Computer Networks course from seven source PDFs.

The lesson Markdown is authored from the extracted lecture slides. Existing
lessons are left untouched on later starts so teacher edits remain intact.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.lesson import Lesson
from app.models.quiz import Quiz, Subject, Topic
from app.seed_network_advanced import QUIZ_SLUG, SUBJECT_CODE


CONTENT_DIR = Path(__file__).resolve().parent / "data" / "network_course"
SLIDE_ASSETS = Path(__file__).resolve().parents[1] / "assets" / "network_course_slides"
SLIDE_MEDIA = Path("/app/media/course-slides")
SLIDE_BASE = "http://localhost:8000/media/course-slides"

CURRICULUM = [
    (
        "Chương 1: Mạng không dây và Wi-Fi",
        "Mạng vô tuyến, WLAN, các thế hệ IEEE 802.11 và kết nối cá nhân.",
        1,
        [
            ("01_wireless_foundations.md", "Mạng không dây giải quyết bài toán gì?", 16),
            ("02_wifi_standards.md", "Wi-Fi, 802.11 và các thế hệ tốc độ", 20),
            ("03_bluetooth.md", "Bluetooth và kết nối tầm gần", 12),
        ],
    ),
    (
        "Chương 2: Môi trường truyền và thiết bị vô tuyến",
        "Phổ tần, dải ISM, Access Point, Bridge, Repeater và vệ tinh.",
        2,
        [
            ("04_radio_spectrum.md", "Tần số, vật cản và dải ISM", 18),
            ("05_access_points.md", "Access Point, Bridge, Repeater và bảo mật", 18),
            ("06_satellite_access.md", "Kết nối ở vùng xa và Internet vệ tinh", 14),
        ],
    ),
    (
        "Chương 3: Truy cập đường truyền Wi-Fi",
        "Vùng phủ, roaming, trạm ẩn, trạm lộ và giao thức CSMA/CA.",
        3,
        [
            ("07_coverage_hidden_exposed.md", "Vùng phủ, chuyển vùng, trạm ẩn và trạm lộ", 18),
            ("08_csma_ca.md", "CSMA/CA: lắng nghe, xin phát và xác nhận", 20),
        ],
    ),
    (
        "Chương 4: Mạng cảm biến không dây",
        "Cảm biến, gateway, IEEE 802.15.4, ZigBee và bài toán năng lượng.",
        4,
        [("09_sensor_networks.md", "Mạng cảm biến không dây và 802.15.4", 20)],
    ),
    (
        "Chương 5: MANET và thuật toán định tuyến",
        "Mạng tùy biến di động, Dijkstra, Bellman–Ford và hai họ định tuyến.",
        5,
        [
            ("10_manet_basics.md", "MANET: mạng tự tổ chức khi các nút di chuyển", 18),
            ("11_routing_algorithms.md", "Tìm đường: Dijkstra, Bellman–Ford và BGP", 22),
            ("12_routing_families.md", "Định tuyến MANET: biết đường sẵn hay tìm khi cần?", 16),
        ],
    ),
    (
        "Chương 6: Giao thức AODV và OLSR",
        "Khám phá, bảo trì tuyến và tối ưu phát quảng bá.",
        6,
        [
            ("13_aodv.md", "AODV: tìm đường và sửa đường khi mạng đổi", 22),
            ("14_olsr.md", "OLSR và nút chuyển tiếp MPR", 18),
        ],
    ),
    (
        "Chương 7: Mô phỏng mạng",
        "Thiết kế thí nghiệm, sự kiện NS-2 và đọc giới hạn của mô hình.",
        7,
        [("15_simulation.md", "Mô phỏng mạng: thử lớn, đo rõ, hiểu giới hạn", 17)],
    ),
]


async def seed_network_course() -> dict:
    SLIDE_MEDIA.mkdir(parents=True, exist_ok=True)
    for number in range(1, 8):
        filename = f"network_k74_{number}.pdf"
        source = SLIDE_ASSETS / filename
        assert source.is_file(), source
        destination = SLIDE_MEDIA / filename
        if not destination.is_file() or destination.stat().st_size != source.stat().st_size:
            shutil.copyfile(source, destination)

    async with AsyncSessionLocal() as db:
        subject = (await db.execute(select(Subject).where(Subject.code == SUBJECT_CODE))).scalar_one_or_none()
        if subject is None:
            subject = (await db.execute(
                select(Subject).where(Subject.name == "Mạng máy tính nâng cao")
            )).scalar_one_or_none()
        if subject is None:
            return {"skipped": "network subject not found; seed quiz first"}
        quiz = (await db.execute(select(Quiz).where(Quiz.slug == QUIZ_SLUG))).scalar_one_or_none()
        added_topics = 0
        added_lessons = 0
        for topic_name, topic_description, slide_number, lessons in CURRICULUM:
            topic = (await db.execute(
                select(Topic).where(Topic.subject_id == subject.id, Topic.name == topic_name)
            )).scalar_one_or_none()
            if topic is None:
                topic = Topic(
                    subject_id=subject.id,
                    name=topic_name,
                    description=topic_description,
                    order=slide_number,
                    slide_url=f"{SLIDE_BASE}/network_k74_{slide_number}.pdf",
                )
                db.add(topic)
                await db.flush()
                added_topics += 1
            for order, (filename, title, duration) in enumerate(lessons, start=1):
                markdown = (CONTENT_DIR / filename).read_text(encoding="utf-8")
                assert markdown.strip().startswith("# "), filename
                existing = (await db.execute(
                    select(Lesson).where(Lesson.topic_id == topic.id, Lesson.title == title)
                )).scalar_one_or_none()
                if existing is not None:
                    continue
                is_final = slide_number == 7 and order == len(lessons)
                db.add(Lesson(
                    topic_id=topic.id,
                    title=title,
                    description=markdown.splitlines()[2].replace("**Mục tiêu:**", "").strip()[:500],
                    content=markdown,
                    duration_minutes=duration,
                    order=order,
                    slide_url=f"{SLIDE_BASE}/network_k74_{slide_number}.pdf",
                    quiz_id=quiz.id if quiz and is_final else None,
                ))
                added_lessons += 1
        await db.commit()
        return {"topics": len(CURRICULUM), "lessons": sum(len(t[3]) for t in CURRICULUM),
                "added_topics": added_topics, "added_lessons": added_lessons}
