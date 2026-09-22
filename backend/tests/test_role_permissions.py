import uuid
import pytest
from unittest.mock import MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.api.deps import get_current_user, get_db
from app.models.user import User, UserRole
from app.models.quiz import Quiz, QuizStatus
from app.models.attempt import Attempt, AttemptStatus
from app.models.question import Question, QuestionType, QuizQuestion


def make_user(role: UserRole, user_id: str = None) -> User:
    u = MagicMock(spec=User)
    u.id = uuid.UUID(user_id) if user_id else uuid.uuid4()
    u.email = f"{role.value.lower()}@hnue.edu.vn"
    u.full_name = f"Test {role.value}"
    u.role = role
    u.is_active = True
    return u


async def dummy_db():
    mock_session = MagicMock()
    yield mock_session


@pytest.fixture(autouse=True)
def clean_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_admin_and_teacher_cannot_start_quiz_attempt():
    """Yêu cầu 2 & 4: Chặn ADMIN và TEACHER tạo attempt làm bài thi thật"""
    app.dependency_overrides[get_db] = dummy_db
    transport = ASGITransport(app=app)
    quiz_id = uuid.uuid4()

    for role in [UserRole.ADMIN, UserRole.TEACHER]:
        app.dependency_overrides[get_current_user] = lambda r=role: make_user(r)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(f"/api/v1/attempts/quiz/{quiz_id}")
            assert res.status_code == 403
            assert res.json()["detail"]["error"]["code"] == "FORBIDDEN_ROLE"


@pytest.mark.anyio
async def test_admin_and_teacher_cannot_save_answer():
    """Yêu cầu 4: Chặn ADMIN và TEACHER lưu đáp án làm bài"""
    app.dependency_overrides[get_db] = dummy_db
    transport = ASGITransport(app=app)
    attempt_id = uuid.uuid4()
    q_id = uuid.uuid4()

    for role in [UserRole.ADMIN, UserRole.TEACHER]:
        app.dependency_overrides[get_current_user] = lambda r=role: make_user(r)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.patch(
                f"/api/v1/attempts/{attempt_id}/answers/{q_id}",
                json={"answer": "Sample Answer"}
            )
            assert res.status_code == 403
            assert res.json()["detail"]["error"]["code"] == "FORBIDDEN_ROLE"


@pytest.mark.anyio
async def test_admin_and_teacher_cannot_submit_attempt():
    """Yêu cầu 4: Chặn ADMIN và TEACHER nộp bài thi"""
    app.dependency_overrides[get_db] = dummy_db
    transport = ASGITransport(app=app)
    attempt_id = uuid.uuid4()

    for role in [UserRole.ADMIN, UserRole.TEACHER]:
        app.dependency_overrides[get_current_user] = lambda r=role: make_user(r)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(f"/api/v1/attempts/{attempt_id}/submit")
            assert res.status_code == 403
            assert res.json()["detail"]["error"]["code"] == "FORBIDDEN_ROLE"


@pytest.mark.anyio
async def test_admin_and_teacher_cannot_update_progress():
    """Yêu cầu 4: Chặn ADMIN và TEACHER cập nhật progress của attempt"""
    app.dependency_overrides[get_db] = dummy_db
    transport = ASGITransport(app=app)
    attempt_id = uuid.uuid4()

    for role in [UserRole.ADMIN, UserRole.TEACHER]:
        app.dependency_overrides[get_current_user] = lambda r=role: make_user(r)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.patch(
                f"/api/v1/attempts/{attempt_id}/progress",
                json={"duration_seconds": 120}
            )
            assert res.status_code == 403
            assert res.json()["detail"]["error"]["code"] == "FORBIDDEN_ROLE"


@pytest.mark.anyio
async def test_student_cannot_submit_another_students_attempt():
    """Yêu cầu 4: Đặc biệt không cho học sinh nộp bài thi của người khác"""
    mock_session = MagicMock()
    mock_attempt = MagicMock()
    mock_attempt.id = uuid.uuid4()
    mock_attempt.user_id = uuid.uuid4()  # Khác user ID của học sinh đang đăng nhập
    mock_attempt.status = AttemptStatus.IN_PROGRESS

    scalar_mock = MagicMock()
    scalar_mock.scalar_one_or_none.return_value = mock_attempt

    async def async_exec(*args, **kwargs):
        return scalar_mock

    mock_session.execute = async_exec

    async def override_db():
        yield mock_session

    student = make_user(UserRole.STUDENT)
    app.dependency_overrides[get_current_user] = lambda: student
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(f"/api/v1/attempts/{mock_attempt.id}/submit")
        assert res.status_code == 403
        assert "không có quyền" in res.json()["detail"]["error"]["message"]


@pytest.mark.anyio
async def test_student_dashboard_stats_for_all_roles():
    """Yêu cầu 5: Thống kê học sinh trả về 0 nếu user là STAFF/ADMIN"""
    app.dependency_overrides[get_db] = dummy_db
    transport = ASGITransport(app=app)

    for role in [UserRole.ADMIN, UserRole.TEACHER]:
        app.dependency_overrides[get_current_user] = lambda r=role: make_user(r)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/v1/stats/student/dashboard")
            assert res.status_code == 200
            data = res.json()
            assert data["total_attempts"] == 0
            assert data["recent_history"] == []


@pytest.mark.anyio
async def test_teacher_overview_stats_access_control():
    """Yêu cầu 1 & 5: Chỉ TEACHER/ADMIN truy cập được overview, STUDENT bị 403"""
    app.dependency_overrides[get_db] = dummy_db
    transport = ASGITransport(app=app)

    # Student accessing teacher stats should be 403
    student = make_user(UserRole.STUDENT)
    app.dependency_overrides[get_current_user] = lambda: student
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/stats/teacher/overview")
        assert res.status_code == 403


@pytest.mark.anyio
async def test_quiz_preview_security_for_student_vs_staff():
    """Yêu cầu 3: Học sinh không được truy cập câu hỏi bản nháp hoặc đáp án qua get_quiz_detail"""
    mock_session = MagicMock()
    mock_quiz = MagicMock()
    mock_quiz.id = uuid.uuid4()
    mock_quiz.status = "DRAFT"

    scalar_mock = MagicMock()
    scalar_mock.scalar_one_or_none.return_value = mock_quiz

    async def async_exec(*args, **kwargs):
        return scalar_mock

    mock_session.execute = async_exec

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)

    # Student accessing DRAFT quiz should get 403
    student = make_user(UserRole.STUDENT)
    app.dependency_overrides[get_current_user] = lambda: student
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(f"/api/v1/quizzes/{mock_quiz.id}")
        assert res.status_code == 403
        assert res.json()["detail"]["error"]["code"] == "QUIZ_NOT_PUBLISHED"
