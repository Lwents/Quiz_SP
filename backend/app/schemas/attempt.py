import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel
from app.models.attempt import AttemptStatus
from app.schemas.question import QuestionStudentResponse, QuestionTeacherResponse


class SaveAnswerRequest(BaseModel):
    answer: Any # user-selected answer (string, list, dict, number, etc.)


class AttemptProgressRequest(BaseModel):
    duration_seconds: Optional[int] = None


class AttemptAnswerResponse(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    answer: Optional[Any] = None
    is_correct: Optional[str] = None
    score: float = 0.0
    max_score: float = 1.0
    feedback: Optional[str] = None

    class Config:
        from_attributes = True


class AttemptStartResponse(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    started_at: datetime
    status: AttemptStatus
    duration_minutes: int
    questions: List[QuestionStudentResponse] = []

    class Config:
        from_attributes = True


class AttemptStatusResponse(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    started_at: datetime
    submitted_at: Optional[datetime] = None
    status: AttemptStatus
    duration_seconds: int
    answers: List[AttemptAnswerResponse] = []

    class Config:
        from_attributes = True


class QuestionReviewItem(BaseModel):
    question: QuestionTeacherResponse
    user_answer: Optional[Any] = None
    is_correct: Optional[str] = None
    score: float = 0.0
    max_score: float = 1.0


class AttemptResultResponse(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    quiz_title: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    duration_seconds: int
    score: float
    max_score: float
    percentage: float
    passed: bool
    total_questions: int
    correct_count: int
    incorrect_count: int
    unanswered_count: int
    questions_review: Optional[List[QuestionReviewItem]] = None

    class Config:
        from_attributes = True
