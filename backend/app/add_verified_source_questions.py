"""Add verified questions from the user's Word source without duplicating a quiz.

The illustrations and red answers are from ttdpt_1.docx.  The importer is
idempotent so a backend restart cannot add the same question twice.
"""

import json
import re
import shutil
import unicodedata
from pathlib import Path
from uuid import UUID

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.question import Question, QuestionType, QuizQuestion
from app.models.quiz import Quiz


PUBLISHED_ID = UUID("c6419378-82be-4c9e-b2c6-73164a055655")
DRAFT_187_ID = UUID("cc701379-730b-479b-a671-7292c0747ce3")
ASSET_DIR = Path(__file__).resolve().parents[1] / "assets" / "quiz_images"
MEDIA_DIR = Path("/app/media/question-images")
IMAGE_BASE_URL = "http://localhost:8000/media/question-images"
CATALOG = Path(__file__).resolve().parent / "data" / "verified_ttdpt_word_questions.json"
PDF_CATALOG = Path(__file__).resolve().parent / "data" / "verified_ttdpt_pdf_questions.json"

# The option texts and answers follow the red runs in the source Word file.
IMAGE_QUESTIONS = {
    6: {
        "prompt": "Hình ảnh này là một _____ animation.",
        "asset": "ttdpt_source_shrek_3d.png",
        "alt": "Nhân vật trong phim hoạt hình 3D",
        "type": QuestionType.FILL_BLANK,
        "config": {"accepted_answers": ["3D", "3-D", "3D animation"]},
        "word_number": 25,
    },
    24: {
        "prompt": "Dựa vào hình này, câu nào đúng?",
        "asset": "ttdpt_source_spongebob_drawing.jpeg",
        "alt": "Bản vẽ nhân vật hoạt hình",
        "type": QuestionType.MULTIPLE_CHOICE,
        "config": {
            "options": [
                {"id": "A", "text": "Drawing"},
                {"id": "B", "text": "Image"},
                {"id": "C", "text": "Illustration"},
                {"id": "D", "text": "Picture"},
            ],
            "correct": ["A"],
        },
        "word_number": 24,
    },
    110: {
        "prompt": "Hình ảnh này là một _____ animation.",
        "asset": "ttdpt_source_horse_2d.png",
        "alt": "Hình con ngựa hoạt hình 2D",
        "type": QuestionType.FILL_BLANK,
        "config": {"accepted_answers": ["2D", "2-D", "2D animation"]},
        "word_number": 13,
    },
    117: {
        "prompt": "Những yếu tố nào tham gia vào bộ phim này?",
        "asset": "ttdpt_source_raya_movie.jpeg",
        "alt": "Áp phích phim Raya and the Last Dragon",
        "type": QuestionType.MULTIPLE_CHOICE,
        "config": {
            "options": [
                {"id": "A", "text": "text"},
                {"id": "B", "text": "graphic"},
                {"id": "C", "text": "video"},
                {"id": "D", "text": "audio"},
                {"id": "E", "text": "animation"},
            ],
            "correct": ["A", "B", "D", "E"],
        },
        "word_number": 26,
    },
}


def normalized(value: str) -> str:
    value = "".join(
        c for c in unicodedata.normalize("NFKD", value.casefold())
        if not unicodedata.combining(c)
    )
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def content_for(item: dict) -> str:
    return (
        f"{item['prompt']}\n\n"
        f"![{item['alt']}]({IMAGE_BASE_URL}/{item['asset']})"
    )


def same_question(first: str, second: str) -> bool:
    """Compare full question wording, preserving distinctions such as bit/time."""
    first = normalized(first.split("![", 1)[0])
    second = normalized(second.split("![", 1)[0])
    return first == second


async def add_verified_source_questions() -> dict:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    for item in IMAGE_QUESTIONS.values():
        source = ASSET_DIR / item["asset"]
        assert source.is_file(), source
        target = MEDIA_DIR / item["asset"]
        if not target.is_file() or target.read_bytes() != source.read_bytes():
            shutil.copyfile(source, target)

    async with AsyncSessionLocal() as db:
        published = await db.get(Quiz, PUBLISHED_ID)
        draft = await db.get(Quiz, DRAFT_187_ID)
        if published is None:
            return {"skipped": "published quiz not found"}

        # Correct the four matching draft questions too.  The old screenshot
        # selection is a student's attempt, not a verified answer.
        corrected_draft = 0
        if draft is not None:
            draft_rows = (await db.execute(
                select(Question, QuizQuestion.order)
                .join(QuizQuestion, QuizQuestion.question_id == Question.id)
                .where(QuizQuestion.quiz_id == DRAFT_187_ID)
            )).all()
            draft_by_number = {order: q for q, order in draft_rows}
            for number, item in IMAGE_QUESTIONS.items():
                question = draft_by_number.get(number)
                if question is None:
                    continue
                config = dict(item["config"])
                config.update({
                    "answer_source": "ttdpt_1.docx:red_answer",
                    "source_word_number": item["word_number"],
                    "source_187_number": number,
                })
                if (question.type != item["type"] or question.content != content_for(item)
                        or question.config != config):
                    question.type = item["type"]
                    question.content = content_for(item)
                    question.config = config
                    corrected_draft += 1

        rows = (await db.execute(
            select(Question, QuizQuestion.order)
            .join(QuizQuestion, QuizQuestion.question_id == Question.id)
            .where(QuizQuestion.quiz_id == PUBLISHED_ID)
        )).all()
        existing_numbers = {q.config.get("source_187_number") for q, _ in rows}
        existing_prompts = {normalized(q.content.split("![", 1)[0]) for q, _ in rows}
        next_order = max((order for _, order in rows), default=0) + 1
        added = []

        # Number 110 is already covered by the published horse illustration.
        # Its fill-blank version has the same learning content, so skip it.
        for number in (6, 24, 117):
            item = IMAGE_QUESTIONS[number]
            if number in existing_numbers or normalized(item["prompt"]) in existing_prompts:
                continue
            config = dict(item["config"])
            config.update({
                "answer_source": "ttdpt_1.docx:red_answer",
                "source_word_number": item["word_number"],
                "source_187_number": number,
            })
            question = Question(
                type=item["type"],
                content=content_for(item),
                config=config,
                points=1.0,
                created_by=published.created_by,
            )
            db.add(question)
            await db.flush()
            db.add(QuizQuestion(
                quiz_id=PUBLISHED_ID,
                question_id=question.id,
                order=next_order,
            ))
            existing_numbers.add(number)
            existing_prompts.add(normalized(item["prompt"]))
            added.append({"source_187_number": number, "order": next_order})
            next_order += 1

        await db.commit()
        return {"added": added, "corrected_draft": corrected_draft}


async def add_verified_word_questions() -> dict:
    """Import manually screened, red-marked Word questions absent from the quiz."""
    items = json.loads(CATALOG.read_text(encoding="utf-8"))
    async with AsyncSessionLocal() as db:
        published = await db.get(Quiz, PUBLISHED_ID)
        if published is None:
            return {"skipped": "published quiz not found"}
        rows = (await db.execute(
            select(Question, QuizQuestion.order)
            .join(QuizQuestion, QuizQuestion.question_id == Question.id)
            .where(QuizQuestion.quiz_id == PUBLISHED_ID)
        )).all()
        existing_contents = [q.content for q, _ in rows]
        existing_word_indices = {q.config.get("source_word_index") for q, _ in rows}
        next_order = max((order for _, order in rows), default=0) + 1
        added = []
        duplicates = []
        for item in items:
            index = item["source_index"]
            if index in existing_word_indices or any(
                same_question(item["content"], old) for old in existing_contents
            ):
                duplicates.append(index)
                continue
            config = dict(item["config"])
            if item["type"] == "multiple_choice":
                ids = {option["id"] for option in config["options"]}
                assert len(ids) == len(config["options"])
                assert set(config["correct"]) <= ids
                question_type = QuestionType.MULTIPLE_CHOICE
            else:
                assert config["accepted_answers"]
                question_type = QuestionType.FILL_BLANK
            config.update({
                "answer_source": "ttdpt_1.docx:red_answer",
                "source_word_index": index,
                "source_word_number": item["source_word_number"],
            })
            question = Question(
                type=question_type,
                content=item["content"],
                config=config,
                points=1.0,
                created_by=published.created_by,
            )
            db.add(question)
            await db.flush()
            db.add(QuizQuestion(
                quiz_id=PUBLISHED_ID,
                question_id=question.id,
                order=next_order,
            ))
            existing_contents.append(item["content"])
            existing_word_indices.add(index)
            added.append({"source_word_index": index, "order": next_order})
            next_order += 1
        await db.commit()
        return {"added": added, "duplicates": duplicates}


async def add_verified_pdf_questions() -> dict:
    """Import PDF-only exercises with a legible marked answer/result."""
    items = json.loads(PDF_CATALOG.read_text(encoding="utf-8"))
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    for item in items:
        if asset := item.get("image_asset"):
            source = ASSET_DIR / asset
            assert source.is_file(), source
            target = MEDIA_DIR / asset
            if not target.is_file() or target.read_bytes() != source.read_bytes():
                shutil.copyfile(source, target)
    async with AsyncSessionLocal() as db:
        published = await db.get(Quiz, PUBLISHED_ID)
        if published is None:
            return {"skipped": "published quiz not found"}
        rows = (await db.execute(
            select(Question, QuizQuestion.order)
            .join(QuizQuestion, QuizQuestion.question_id == Question.id)
            .where(QuizQuestion.quiz_id == PUBLISHED_ID)
        )).all()
        existing_contents = [q.content for q, _ in rows]
        existing_pdf_indices = {q.config.get("source_pdf_index") for q, _ in rows}
        next_order = max((order for _, order in rows), default=0) + 1
        added = []
        for item in items:
            if item["source_index"] in existing_pdf_indices or any(
                same_question(item["content"], old) for old in existing_contents
            ):
                continue
            config = dict(item["config"])
            if item["type"] == "multiple_choice":
                ids = {option["id"] for option in config["options"]}
                assert len(ids) == len(config["options"])
                assert set(config["correct"]) <= ids
                question_type = QuestionType.MULTIPLE_CHOICE
            elif item["type"] == "matching":
                assert len(config.get("pairs", [])) >= 2
                question_type = QuestionType.MATCHING
            else:
                assert config.get("accepted_answers")
                question_type = QuestionType.FILL_BLANK
            config.update({
                "answer_source": "ttdpt-multimedia-concepts-and-communication-quiz-notes.pdf:marked_result",
                "source_pdf_index": item["source_index"],
            })
            content = item["content"]
            if asset := item.get("image_asset"):
                content += f"\n\n![Hình minh họa câu hỏi]({IMAGE_BASE_URL}/{asset})"
            question = Question(
                type=question_type,
                content=content,
                config=config,
                points=1.0,
                created_by=published.created_by,
            )
            db.add(question)
            await db.flush()
            db.add(QuizQuestion(
                quiz_id=PUBLISHED_ID,
                question_id=question.id,
                order=next_order,
            ))
            existing_contents.append(content)
            existing_pdf_indices.add(item["source_index"])
            added.append({"source_pdf_index": item["source_index"], "order": next_order})
            next_order += 1
        if published.description:
            published.description = re.sub(
                r"gồm\s+\d+\s+câu",
                f"gồm {len(rows) + len(added)} câu",
                published.description,
                flags=re.IGNORECASE,
            )
        await db.commit()
        return {"added": added}


async def add_verified_matrix_question() -> dict:
    """Keep the code matrix as a real matching question with its source image."""
    asset = "ttdpt_source_code_matrix.png"
    source = ASSET_DIR / asset
    assert source.is_file(), source
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    target = MEDIA_DIR / asset
    if not target.is_file() or target.read_bytes() != source.read_bytes():
        shutil.copyfile(source, target)

    prompt = (
        "Cho ma trận từ mã cơ sở cho A, B, C trong hình. "
        "Hãy ghép mỗi từ mã đầu ra với biểu thức tương ứng.\n\n"
        f"![Ma trận từ mã cơ sở]({IMAGE_BASE_URL}/{asset})"
    )
    pairs = [
        {"left": "111", "right": "A xor B xor C"},
        {"left": "0", "right": "NOT(A xor B xor C)"},
        {"left": "1", "right": "A xor 000"},
        {"left": "10", "right": "B xor 00"},
        {"left": "100", "right": "C xor 000"},
    ]
    async with AsyncSessionLocal() as db:
        published = await db.get(Quiz, PUBLISHED_ID)
        if published is None:
            return {"skipped": "published quiz not found"}
        rows = (await db.execute(
            select(Question, QuizQuestion.order)
            .join(QuizQuestion, QuizQuestion.question_id == Question.id)
            .where(QuizQuestion.quiz_id == PUBLISHED_ID)
        )).all()
        if any(
            q.config.get("source_word_index") == 102
            or "ma trận từ mã cơ sở cho a b c" in normalized(q.content)
            for q, _ in rows
        ):
            return {"added": False}
        question = Question(
            type=QuestionType.MATCHING,
            content=prompt,
            config={
                "pairs": pairs,
                "answer_source": "ttdpt_1.docx:red_answer",
                "source_word_index": 102,
            },
            points=1.0,
            created_by=published.created_by,
        )
        db.add(question)
        await db.flush()
        db.add(QuizQuestion(
            quiz_id=PUBLISHED_ID,
            question_id=question.id,
            order=max((order for _, order in rows), default=0) + 1,
        ))
        await db.commit()
        return {"added": True}
