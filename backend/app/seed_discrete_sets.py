"""Curated, nonduplicated COMP122 set-theory quiz from 15 Moodle reviews.

The user's 225 question screenshots repeat the same small question pool. The
entries below were checked against the visible correct-answer marks and the
existing 23-question logic quiz. Source screenshots are kept outside the app;
only two cropped Venn figures are published.
"""

from __future__ import annotations

import re
import shutil
import unicodedata
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.question import Question, QuestionType, QuizQuestion
from app.models.quiz import DifficultyLevel, Quiz, QuizStatus, Subject, Topic


QUIZ_SLUG = "quiz-2-1-tap-hop-tu-15-luot-lam"
ASSETS = Path(__file__).resolve().parents[1] / "assets" / "discrete_sets"
MEDIA = Path("/app/media/question-images")
IMAGE_BASE = "http://localhost:8000/media/question-images"


QUESTIONS = [
    {
        "key": "venn-union-complement",
        "type": "single_choice",
        "content": "Phần màu xanh trong hình biểu diễn tập nào?",
        "image": "venn_union_complement.png",
        "options": ["A ∪ B", "U \\ (A ∩ B)", "U \\ (A ∪ B)", "A ∩ B"],
        "correct": [2],
        "explanation": "Phần tô màu thuộc U nhưng không thuộc A hoặc B, tức phần bù của A ∪ B.",
    },
    {
        "key": "union-explicit-sets",
        "type": "single_choice",
        "content": "Cho A = {1, 3, 4} và B = {2, 4, 6, 8}. Tìm A ∪ B.",
        "options": ["{1, 3, 4}", "{1, 2, 3, 4, 6, 8}", "{1, 2, 3, 4, 5, 6, 7}", "{1, 2, 3, 4, 5, 6, 7, 8}"],
        "correct": [1],
        "explanation": "Hợp lấy mỗi phần tử xuất hiện trong A hoặc B đúng một lần.",
    },
    {
        "key": "five-element-powerset",
        "type": "single_choice",
        "content": "Cho X = {1, 2, 3, 4, 5}. Tập X có bao nhiêu tập con?",
        "options": ["64", "5", "25", "32"],
        "correct": [3],
        "explanation": "Mỗi trong 5 phần tử có hai khả năng: thuộc hoặc không thuộc tập con, nên có 2⁵ = 32 tập con.",
    },
    {
        "key": "three-set-intersection",
        "type": "single_choice",
        "content": "Cho α = {j, a, u, h}, β = {r, a, j}, γ = {p, a, n, t, i}. Tìm α ∩ β ∩ γ.",
        "options": ["{j, h}", "{a}", "{a, h}", "{a, j}"],
        "correct": [1],
        "explanation": "Chỉ có a xuất hiện trong cả ba tập.",
    },
    {
        "key": "set-law-matching",
        "type": "matching",
        "content": "Ghép mỗi đẳng thức tập hợp với tên luật tương ứng.",
        "pairs": [
            ("A̅ ∩ B̅ = (A ∪ B)̅", "Luật De Morgan"),
            ("A ∩ A̅ = ∅", "Luật phi mâu thuẫn"),
            ("A ∪ A̅ = U", "Luật đầy đủ"),
            ("A ∪ U = U", "Luật nuốt"),
        ],
        "explanation": "Các cặp ghép được xác nhận bằng dấu kiểm xanh trong ảnh xem lại.",
    },
    {
        "key": "venn-disjoint",
        "type": "single_choice",
        "content": "Kết luận nào đúng về A và B trong hình?",
        "image": "venn_disjoint.png",
        "options": ["A ∩ B = ∅", "A ∪ B = ∅", "A ∪ B = A", "A ∩ B = A"],
        "correct": [0],
        "explanation": "Hai hình tròn không giao nhau nên giao của A và B là tập rỗng.",
    },
    {
        "key": "cartesian-product-subsets",
        "type": "multiple_choice",
        "content": "Cho A = {1, 2, 3, 4, 5, a, hoa, xe máy, nhà, táo, mận}, B = {hoa, 3, 4, táo}. Tập nào là tập con của tích Đề-các A × B? Chọn 2.",
        "options": [
            "{(hoa, hoa), (táo, mận), (5, 4)}",
            "{(hoa, táo), (táo, hoa), (táo, táo), (hoa, hoa)}",
            "{(1, táo), (a, 3), (3, 3)}",
            "{hoa, táo}",
        ],
        "correct": [1, 2],
        "explanation": "Mỗi phần tử của A × B là một cặp có thứ tự (phần tử thuộc A, phần tử thuộc B).",
    },
    {
        "key": "complement-b",
        "type": "single_choice",
        "content": "Cho U = {a,b,c,d,e,f,g,h,i,j}, A = {a,c,e,g,i}, B = {b,c,d,e,f}. Tìm phần bù của B trong U.",
        "options": ["{a,b,c,d,e,f,g,i}", "{b,d,f,h}", "{a,g,h,i,j}", "{c,e}"],
        "correct": [2],
        "explanation": "U \\ B gồm những phần tử thuộc U nhưng không thuộc B: a, g, h, i, j.",
    },
    {
        "key": "prime-odd-even-expression",
        "type": "single_choice",
        "content": "Cho U = {0,1,2,…,10}; A là tập số nguyên tố trong U, B là tập số lẻ trong U, C là tập số chẵn trong U. Tìm (A ∪ B) ∩ C.",
        "options": ["{1,3,5,7,9}", "{3,5,7}", "{2,4,6,8,10}", "{2}"],
        "correct": [3],
        "explanation": "Số nguyên tố chẵn duy nhất là 2; mọi phần tử khác của B đều lẻ.",
    },
    {
        "key": "two-intersections-union",
        "type": "single_choice",
        "content": "Cho P = {0,1,2,3,4}, Q = {4,6,8}, R = {6,12,18}. Tìm (P ∩ Q) ∪ (Q ∩ R).",
        "options": ["{4,6}", "{4}", "{4,6,8}", "{1,2,3,4,6,8}"],
        "correct": [0],
        "explanation": "P ∩ Q = {4}, Q ∩ R = {6}, nên hợp bằng {4,6}.",
    },
    {
        "key": "student-set-matching",
        "type": "matching",
        "content": "Gọi A là tập sinh viên Trường ĐHSP Hà Nội, B là tập sinh viên ngành Sư phạm trong cả nước, C là tập sinh viên học ngành Tin học trong cả nước. Ghép ký hiệu với mô tả.",
        "pairs": [
            ("A ∩ B", "Sinh viên ngành Sư phạm tại Trường ĐHSP Hà Nội"),
            ("A \\ B", "Sinh viên không học ngành Sư phạm tại Trường ĐHSP Hà Nội"),
            ("A ∩ B ∩ C", "Sinh viên ngành Sư phạm Tin học tại Trường ĐHSP Hà Nội"),
            ("(A ∩ C) \\ B", "Sinh viên học ngành Tin học tại Trường ĐHSP Hà Nội nhưng không học ngành Sư phạm"),
        ],
        "explanation": "Giao giữ phần tử cùng thuộc các tập; hiệu loại phần tử thuộc tập bên phải.",
    },
    {
        "key": "nested-set-inclusion",
        "type": "multiple_choice",
        "content": "Cho A = {{1}} và B = {1, {1}}. Khẳng định nào đúng? Chọn 2.",
        "options": ["A = B", "A ⊆ B", "A ⊂ B", "A ∈ B"],
        "correct": [1, 2],
        "explanation": "Phần tử duy nhất của A là {1}, và {1} thuộc B; B còn chứa thêm số 1.",
    },
    {
        "key": "set-difference",
        "type": "single_choice",
        "content": "Cho A = {2,3,4,5,7,8,9} và B = {1,3,5,7,9}. Tìm A \\ B.",
        "options": ["{3,5,7,9}", "{2,4,6,8,9}", "{1,2,3,4,5,7,8,9}", "{2,4,8}"],
        "correct": [3],
        "explanation": "Giữ các phần tử thuộc A nhưng không thuộc B.",
    },
    {
        "key": "letters-anh-nhanh",
        "type": "single_choice",
        "content": "A là tập các chữ cái trong từ ANH; B là tập các chữ cái trong từ NHANH. Mệnh đề nào đúng?",
        "options": ["A, B không bằng nhau vì A có 3 phần tử còn B có 5 phần tử", "A là tập con thực sự của B", "A = B vì cả hai cùng có các chữ cái A, N, H", "B là tập con thực sự của A"],
        "correct": [2],
        "explanation": "Tập hợp không tính số lần lặp. Cả A và B đều là {A,N,H}.",
    },
    {
        "key": "cartesian-product-truth",
        "type": "multiple_choice",
        "content": "Cho A, B là hai tập hữu hạn bất kỳ. Những mệnh đề nào luôn đúng?",
        "options": ["A × B = B × A", "|A × B| = |A|·|B|", "|A × B| = |B × A|", "|B × A| = |A|·|B|"],
        "correct": [1, 2, 3],
        "explanation": "Tích Đề-các nói chung không giao hoán về thứ tự cặp, nhưng lực lượng đều bằng |A|·|B|.",
    },
]


def _normalized(content: str) -> str:
    content = re.sub(r"!\[[^]]*\]\([^)]*\)", "", content)
    decomposed = unicodedata.normalize("NFKD", content).casefold()
    return re.sub(r"[^a-z0-9]+", "", "".join(ch for ch in decomposed if not unicodedata.combining(ch)))


async def seed_discrete_sets_quiz() -> dict:
    MEDIA.mkdir(parents=True, exist_ok=True)
    for filename in ("venn_union_complement.png", "venn_disjoint.png"):
        source = ASSETS / filename
        assert source.is_file(), source
        target = MEDIA / filename
        if not target.is_file() or target.read_bytes() != source.read_bytes():
            shutil.copyfile(source, target)

    async with AsyncSessionLocal() as db:
        subject = (await db.execute(select(Subject).where(Subject.code == "COMP122"))).scalar_one()
        topic = (await db.execute(select(Topic).where(
            Topic.subject_id == subject.id, Topic.name == "Chương 2: Lý thuyết tập hợp"
        ))).scalar_one()
        quiz = (await db.execute(select(Quiz).where(Quiz.slug == QUIZ_SLUG))).scalar_one_or_none()
        if quiz is None:
            quiz = Quiz(
                title="Quiz 2.1: Phép toán và đẳng thức tập hợp",
                slug=QUIZ_SLUG,
                description="Các câu khác nhau được đối chiếu từ 15 lượt xem lại bài COMP122; chỉ giữ đáp án đã kiểm chứng.",
                subject_id=subject.id,
                topic_id=topic.id,
                difficulty=DifficultyLevel.MEDIUM,
                duration_minutes=30,
                pass_score=5.0,
                max_attempts=0,
                shuffle_questions=True,
                shuffle_answers=True,
                show_answer_after_submit=True,
                status=QuizStatus.PUBLISHED,
            )
            db.add(quiz)
            await db.flush()

        rows = (await db.execute(
            select(Question, QuizQuestion.order)
            .join(QuizQuestion, QuizQuestion.question_id == Question.id)
            .where(QuizQuestion.quiz_id == quiz.id)
        )).all()
        source_keys = {q.config.get("source_discrete_key") for q, _ in rows}
        existing_subject = (await db.execute(
            select(Question.content)
            .join(QuizQuestion, QuizQuestion.question_id == Question.id)
            .join(Quiz, Quiz.id == QuizQuestion.quiz_id)
            .where(Quiz.subject_id == subject.id, Quiz.id != quiz.id)
        )).scalars().all()
        existing_stems = {_normalized(content) for content in existing_subject}
        order = max((position for _, position in rows), default=0) + 1
        added = 0
        skipped_existing = 0
        skipped_review = 0
        for item in QUESTIONS:
            if item.get("review"):
                skipped_review += 1
                continue
            if item["key"] in source_keys:
                continue
            if _normalized(item["content"]) in existing_stems:
                skipped_existing += 1
                continue
            content = item["content"]
            if item.get("image"):
                content += f"\n\n![Hình minh họa]({IMAGE_BASE}/{item['image']})"
            if item["type"] == "matching":
                config = {"pairs": [{"left": a, "right": b} for a, b in item["pairs"]]}
            else:
                options = [{"id": chr(97 + i), "text": text} for i, text in enumerate(item["options"])]
                correct = [options[i]["id"] for i in item["correct"]]
                config = {"options": options, "correct": correct if item["type"] == "multiple_choice" else correct[0]}
            config["source_discrete_key"] = item["key"]
            question = Question(
                type=QuestionType(item["type"]),
                content=content,
                config=config,
                explanation=item["explanation"],
                points=1.0,
                difficulty=DifficultyLevel.MEDIUM,
            )
            db.add(question)
            await db.flush()
            db.add(QuizQuestion(quiz_id=quiz.id, question_id=question.id, order=order))
            order += 1
            added += 1
        await db.commit()
        return {"quiz_id": str(quiz.id), "catalog": len(QUESTIONS), "added": added,
                "skipped_existing": skipped_existing, "needs_review": skipped_review}
