import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.ai_explanation_context import explanation_context
from app.api.v1 import ai
from app.core.config import settings
from app.models.attempt import AttemptStatus
from app.models.question import QuestionType
from app.models.user import UserRole


@pytest.fixture(autouse=True)
def runtime_config(monkeypatch):
    monkeypatch.setattr(ai, "ai_runtime", AsyncMock(return_value=(SimpleNamespace(base_url=settings.AI_BASE_URL.rstrip('/'), model=settings.AI_MODEL), "test-placeholder")))


def test_matching_retains_repeated_answers_and_explains_only_wrong_rows():
    config = {"pairs": [{"left": x, "right": "True" if x != "R" else "False"}
                        for x in ["N", "Z", "Q", "R"]]}
    ctx = explanation_context("matching", config, {"N": "True", "Z": "True", "Q": "False"})
    assert ctx["state"] == "partial"
    assert ctx["score"] == 0.5
    assert "N: Đúng" in ctx["details"]
    assert "Z: Đúng" in ctx["details"]
    assert "Q: Sai" in ctx["details"]
    assert "R: Chưa ghép" in ctx["details"]
    assert "N → True" in ctx["correct_answer"]
    assert "R → False" in ctx["correct_answer"]


def test_ordering_and_fill_blank_include_their_actual_answer_keys():
    ctx = explanation_context("ordering", {"correct_order": ["Thu", "Nén", "Truyền"]}, ["Nén", "Thu", "Truyền"])
    assert ctx["state"] == "incorrect"
    assert ctx["correct_answer"] == "Thu\nNén\nTruyền"
    assert "Vị trí 1: bạn đặt Nén; chuẩn là Thu" in ctx["details"]
    ctx = explanation_context("fill_blank", {"accepted_answers": ["3d", "3D animation"]}, "3D")
    assert ctx["state"] == "correct"
    assert "3D animation" in ctx["correct_answer"]


def test_multiple_choice_distinguishes_missing_and_extra_selections():
    config = {"options": [{"id": "a", "text": "Đơn ánh"}, {"id": "b", "text": "Toàn ánh"},
                          {"id": "c", "text": "Không phải hàm"}], "correct": ["a", "b"]}
    ctx = explanation_context("multiple_choice", config, ["a", "c"])
    assert "Còn thiếu: b: Toàn ánh" in ctx["details"]
    assert "Chọn thừa: c: Không phải hàm" in ctx["details"]
    assert "a: Đơn ánh" in ctx["correct_answer"]


@pytest.mark.parametrize("answer", [None, "", [], {}])
def test_blank_answer_is_not_reported_as_a_wrong_choice(answer):
    assert explanation_context("single_choice", {"correct": "a"}, answer)["state"] == "unanswered"


def make_request_context(answer_state="true", answer="a"):
    uid, aid, qid, quiz_id = (uuid.uuid4() for _ in range(4))
    user = SimpleNamespace(id=uid, role=UserRole.STUDENT)
    attempt = SimpleNamespace(id=aid, user_id=uid, quiz_id=quiz_id, status=AttemptStatus.GRADED,
                              quiz=SimpleNamespace(show_answer_after_submit=True))
    question = SimpleNamespace(id=qid, type=QuestionType.SINGLE_CHOICE, points=1.0,
                               content="Hàm nào là đơn ánh?", explanation="Hai đầu vào khác nhau có ảnh khác nhau.",
                               config={"options": [{"id": "a", "text": "f(x) = x"}], "correct": "a"})
    saved = SimpleNamespace(answer=answer, is_correct=answer_state, score=1.0 if answer_state == "true" else 0.0, max_score=1.0)
    results = []
    for value, method in [(attempt, "scalar_one_or_none"), ((question, None), "one_or_none"), (saved, "scalar_one_or_none")]:
        result = MagicMock()
        getattr(result, method).return_value = value
        results.append(result)
    db = SimpleNamespace(execute=AsyncMock(side_effect=results))
    return ai.AIExplainRequest(attempt_id=aid, question_id=qid), user, db


@pytest.mark.asyncio
async def test_correct_saved_answer_is_sent_to_ai_as_correct(monkeypatch):
    req, user, db = make_request_context()
    captured = {}
    response = MagicMock(status_code=200, headers={"content-type": "application/json"})
    response.json.return_value = {"choices": [{"message": {"content": "Bạn đã trả lời đúng."}}]}

    async def post(*args, **kwargs):
        captured.update(kwargs["json"])
        return response

    client = AsyncMock()
    client.post.side_effect = post
    manager = AsyncMock()
    manager.__aenter__.return_value = client
    monkeypatch.setattr(ai.httpx, "AsyncClient", lambda **kwargs: manager)
    result = await ai.explain_question_with_ai(req, user, db)
    assert result.explanation == "Bạn đã trả lời đúng."
    prompt = captured["messages"][1]["content"]
    assert "KẾT QUẢ CHẤM ĐÃ KIỂM CHỨNG: ĐÚNG" in prompt
    assert "### 💡 1. Vì sao cách làm của bạn đúng?" in prompt
    assert "a: f(x) = x" in prompt
    assert "và trả lời CHƯA CHÍNH XÁC" not in prompt


@pytest.mark.asyncio
async def test_conflicting_saved_grade_is_reported_before_calling_ai():
    req, user, db = make_request_context(answer_state="false", answer="a")
    with pytest.raises(ai.HTTPException) as error:
        await ai.explain_question_with_ai(req, user, db)
    assert error.value.status_code == 409
    assert "không khớp" in error.value.detail


@pytest.mark.asyncio
async def test_other_students_attempt_is_rejected():
    req, user, db = make_request_context()
    user.id = uuid.uuid4()
    with pytest.raises(ai.HTTPException) as error:
        await ai.explain_question_with_ai(req, user, db)
    assert error.value.status_code == 403
