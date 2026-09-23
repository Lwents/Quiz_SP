import uuid
import pytest
from unittest.mock import MagicMock, AsyncMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.api.deps import get_current_user, get_db
from app.models.user import User, UserRole
from app.models.quiz import Subject, Topic, Quiz, QuizStatus
from app.models.lesson import Lesson
from app.models.question import Question, QuestionType


def make_user(role: UserRole, user_id: str = None) -> User:
    u = MagicMock(spec=User)
    u.id = uuid.UUID(user_id) if user_id else uuid.uuid4()
    u.email = f"{role.value.lower()}@hnue.edu.vn"
    u.full_name = f"Test {role.value}"
    u.role = role
    u.is_active = True
    return u


@pytest.fixture(autouse=True)
def clean_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_create_subject_unique_code_and_name_validation():
    """Kiểm tra validation trùng mã và trùng tên môn học"""
    mock_session = MagicMock()
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    # 1. Trùng mã môn học
    existing_sub = MagicMock(spec=Subject)
    scalar_code = MagicMock()
    scalar_code.scalar_one_or_none.return_value = existing_sub

    async def async_exec_code(*args, **kwargs):
        return scalar_code

    mock_session.execute = async_exec_code

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.TEACHER)
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/subjects",
            json={"name": "Toán 12 Mới", "code": "MATH12", "description": "Mô tả"}
        )
        assert res.status_code == 400
        assert res.json()["detail"]["error"]["code"] == "SUBJECT_CODE_EXISTS"

    # 2. Trùng tên môn học (mã chưa trùng nhưng tên đã có)
    scalar_none = MagicMock()
    scalar_none.scalar_one_or_none.return_value = None

    exec_call_count = 0

    async def async_exec_name(*args, **kwargs):
        nonlocal exec_call_count
        exec_call_count += 1
        if exec_call_count == 1:
            return scalar_none  # Code check passes
        return scalar_code  # Name check finds duplicate

    mock_session.execute = async_exec_name

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/subjects",
            json={"name": "Toán Học 12", "code": "NEWCODE12", "description": "Mô tả"}
        )
        assert res.status_code == 400
        assert res.json()["detail"]["error"]["code"] == "SUBJECT_NAME_EXISTS"


@pytest.mark.anyio
async def test_update_topic_validation():
    """Kiểm tra cập nhật chủ đề (PUT /subjects/{s}/topics/{t}) & validation tên rỗng"""
    sub_id = uuid.uuid4()
    top_id = uuid.uuid4()
    mock_topic = MagicMock(spec=Topic)
    mock_topic.id = top_id
    mock_topic.subject_id = sub_id
    mock_topic.name = "Chương 1 cũ"
    mock_topic.description = "Mô tả cũ"
    mock_topic.order = 0

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=mock_topic)
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.TEACHER)
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Tên rỗng -> 400
        res = await client.put(
            f"/api/v1/subjects/{sub_id}/topics/{top_id}",
            json={"name": "   ", "description": "Mô tả mới"}
        )
        assert res.status_code == 400
        assert res.json()["detail"]["error"]["code"] == "INVALID_NAME"

        # Tên hợp lệ -> 200
        res = await client.put(
            f"/api/v1/subjects/{sub_id}/topics/{top_id}",
            json={"name": "Chương 1: Đạo hàm cập nhật", "description": "Nội dung nâng cao"}
        )
        assert res.status_code == 200
        assert mock_topic.name == "Chương 1: Đạo hàm cập nhật"


@pytest.mark.anyio
async def test_delete_subject_attempt_protection():
    """Chặn xóa cứng môn học khi đề thi bên trong đã có sinh viên làm bài"""
    sub_id = uuid.uuid4()
    mock_subject = MagicMock(spec=Subject)
    mock_subject.id = sub_id

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=mock_subject)

    # Mock count attempt trả về 3
    count_mock = MagicMock()
    count_mock.scalar.return_value = 3

    async def async_exec(*args, **kwargs):
        return count_mock

    mock_session.execute = async_exec

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.TEACHER)
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.delete(f"/api/v1/subjects/{sub_id}")
        assert res.status_code == 400
        assert res.json()["detail"]["error"]["code"] == "SUBJECT_HAS_ATTEMPTS"


@pytest.mark.anyio
async def test_delete_topic_attempt_protection():
    """Chặn xóa cứng chủ đề khi đề thi bên trong đã có sinh viên làm bài"""
    sub_id = uuid.uuid4()
    top_id = uuid.uuid4()
    mock_topic = MagicMock(spec=Topic)
    mock_topic.id = top_id
    mock_topic.subject_id = sub_id

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=mock_topic)

    count_mock = MagicMock()
    count_mock.scalar.return_value = 2

    async def async_exec(*args, **kwargs):
        return count_mock

    mock_session.execute = async_exec

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.TEACHER)
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.delete(f"/api/v1/subjects/{sub_id}/topics/{top_id}")
        assert res.status_code == 400
        assert res.json()["detail"]["error"]["code"] == "TOPIC_HAS_ATTEMPTS"


@pytest.mark.anyio
async def test_delete_quiz_attempt_protection():
    """Chặn xóa cứng bài thi đã có attempt của sinh viên"""
    quiz_id = uuid.uuid4()
    mock_quiz = MagicMock(spec=Quiz)
    mock_quiz.id = quiz_id

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=mock_quiz)

    count_mock = MagicMock()
    count_mock.scalar.return_value = 5

    async def async_exec(*args, **kwargs):
        return count_mock

    mock_session.execute = async_exec

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.TEACHER)
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.delete(f"/api/v1/quizzes/{quiz_id}")
        assert res.status_code == 400
        assert res.json()["detail"]["error"]["code"] == "QUIZ_HAS_ATTEMPTS"


@pytest.mark.anyio
async def test_delete_question_attempt_protection():
    """Chặn xóa câu hỏi đã có câu trả lời trong bài làm của học sinh"""
    q_id = uuid.uuid4()
    mock_q = MagicMock(spec=Question)
    mock_q.id = q_id

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=mock_q)

    count_mock = MagicMock()
    count_mock.scalar.return_value = 10

    async def async_exec(*args, **kwargs):
        return count_mock

    mock_session.execute = async_exec

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.TEACHER)
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.delete(f"/api/v1/questions/{q_id}")
        assert res.status_code == 400
        assert res.json()["detail"]["error"]["code"] == "QUESTION_HAS_ATTEMPTS"


@pytest.mark.anyio
async def test_empty_quiz_cannot_be_published_directly():
    """Chặn xuất bản đề thi mới khi chưa có câu hỏi nào (EMPTY_QUIZ_PUBLISH)"""
    mock_session = MagicMock()

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.TEACHER)
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/quizzes",
            json={
                "title": "Đề thi rỗng",
                "difficulty": "EASY",
                "duration_minutes": 30,
                "pass_score": 5.0,
                "status": "PUBLISHED"
            }
        )
        assert res.status_code == 400
        assert res.json()["detail"]["error"]["code"] == "EMPTY_QUIZ_PUBLISH"


@pytest.mark.anyio
async def test_lesson_quiz_subject_mismatch_validation():
    """Chặn liên kết đề thi vào bài học khi đề thi thuộc môn học khác (SUBJECT_MISMATCH)"""
    sub_math = uuid.uuid4()
    sub_phys = uuid.uuid4()
    top_id = uuid.uuid4()
    quiz_id = uuid.uuid4()

    mock_topic = MagicMock(spec=Topic)
    mock_topic.id = top_id
    mock_topic.subject_id = sub_math

    mock_quiz = MagicMock(spec=Quiz)
    mock_quiz.id = quiz_id
    mock_quiz.subject_id = sub_phys  # Khác môn!

    mock_session = MagicMock()

    async def async_get(model, obj_id):
        if model == Topic and obj_id == top_id:
            return mock_topic
        if model == Quiz and obj_id == quiz_id:
            return mock_quiz
        return None

    mock_session.get = async_get

    order_mock = MagicMock()
    order_mock.scalar.return_value = 0

    async def async_exec(*args, **kwargs):
        return order_mock

    mock_session.execute = async_exec

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.TEACHER)
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            f"/api/v1/lessons/topic/{top_id}",
            json={
                "title": "Bài học toán",
                "content": "Nội dung",
                "quiz_id": str(quiz_id)
            }
        )
        assert res.status_code == 400
        assert res.json()["detail"]["error"]["code"] == "SUBJECT_MISMATCH"


@pytest.mark.anyio
async def test_atomic_create_question_in_quiz():
    """Tạo câu hỏi và gắn vào đề thi trong 1 transaction nguyên tử (POST /quizzes/{id}/questions)"""
    quiz_id = uuid.uuid4()
    mock_quiz = MagicMock(spec=Quiz)
    mock_quiz.id = quiz_id

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=mock_quiz)
    def mock_add(obj):
        if hasattr(obj, 'id') and getattr(obj, 'id') is None:
            obj.id = uuid.uuid4()
    mock_session.add = MagicMock(side_effect=mock_add)
    mock_session.flush = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    order_mock = MagicMock()
    order_mock.scalar.return_value = 1

    async def async_exec(*args, **kwargs):
        return order_mock

    mock_session.execute = async_exec

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.TEACHER)
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "type": "single_choice",
            "title": "Câu hỏi nguyên tử",
            "content": "Tìm nghiệm phương trình x + 1 = 2",
            "points": 1.0,
            "difficulty": "EASY",
            "config": {
                "options": [
                    {"id": "A", "content": "x = 1"},
                    {"id": "B", "content": "x = 2"}
                ],
                "correct": "A"
            },
            "explanation": "1 + 1 = 2"
        }
        res = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["title"] == "Câu hỏi nguyên tử"
        assert mock_session.add.call_count == 2  # Added Question and QuizQuestion
        assert mock_session.flush.call_count == 1
        assert mock_session.commit.call_count == 1
