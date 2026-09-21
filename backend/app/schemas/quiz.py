import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.models.quiz import QuizStatus, DifficultyLevel
from app.schemas.question import QuestionStudentResponse, QuestionTeacherResponse


class SubjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None


class SubjectCreate(SubjectBase):
    pass


class SubjectResponse(SubjectBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class TopicBase(BaseModel):
    name: str
    description: Optional[str] = None
    subject_id: uuid.UUID


class TopicCreate(TopicBase):
    pass


class TopicResponse(TopicBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class QuizBase(BaseModel):
    title: str
    slug: Optional[str] = None
    description: Optional[str] = None
    subject_id: Optional[uuid.UUID] = None
    topic_id: Optional[uuid.UUID] = None
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    duration_minutes: int = 30
    pass_score: float = 5.0
    max_attempts: int = 0
    shuffle_questions: bool = False
    shuffle_answers: bool = False
    show_answer_after_submit: bool = True
    status: QuizStatus = QuizStatus.DRAFT


class QuizCreate(QuizBase):
    pass


class QuizUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    subject_id: Optional[uuid.UUID] = None
    topic_id: Optional[uuid.UUID] = None
    difficulty: Optional[DifficultyLevel] = None
    duration_minutes: Optional[int] = None
    pass_score: Optional[float] = None
    max_attempts: Optional[int] = None
    shuffle_questions: Optional[bool] = None
    shuffle_answers: Optional[bool] = None
    show_answer_after_submit: Optional[bool] = None
    status: Optional[QuizStatus] = None


class QuizListResponse(QuizBase):
    id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    question_count: Optional[int] = 0
    total_points: Optional[float] = 0.0
    subject: Optional[SubjectResponse] = None
    topic: Optional[TopicResponse] = None

    class Config:
        from_attributes = True


class QuizStudentDetailResponse(QuizBase):
    id: uuid.UUID
    questions: List[QuestionStudentResponse] = []
    question_count: int = 0
    total_points: float = 0.0

    class Config:
        from_attributes = True


class QuizTeacherDetailResponse(QuizBase):
    id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    questions: List[QuestionTeacherResponse] = []
    question_count: int = 0
    total_points: float = 0.0

    class Config:
        from_attributes = True
