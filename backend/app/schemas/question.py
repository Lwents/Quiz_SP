import uuid
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from app.models.question import QuestionType
from app.models.quiz import DifficultyLevel


class QuestionBase(BaseModel):
    type: QuestionType
    title: Optional[str] = None
    content: str
    points: float = 1.0
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    config: Dict[str, Any] = {}
    explanation: Optional[str] = None


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    type: Optional[QuestionType] = None
    title: Optional[str] = None
    content: Optional[str] = None
    points: Optional[float] = None
    difficulty: Optional[DifficultyLevel] = None
    config: Optional[Dict[str, Any]] = None
    explanation: Optional[str] = None


class QuestionStudentResponse(BaseModel):
    """Sanitized question response without correct answers for active test takers"""
    id: uuid.UUID
    type: QuestionType
    title: Optional[str] = None
    content: str
    points: float
    difficulty: DifficultyLevel
    config: Dict[str, Any]
    order: Optional[int] = 0

    class Config:
        from_attributes = True


class QuestionTeacherResponse(QuestionBase):
    """Full question response for teachers/admins or post-submission review"""
    id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    order: Optional[int] = 0

    class Config:
        from_attributes = True
