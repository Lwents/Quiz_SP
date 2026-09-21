import enum
from sqlalchemy import Column, String, Text, Float, Integer, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin
from app.models.quiz import DifficultyLevel


class QuestionType(str, enum.Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    FILL_BLANK = "fill_blank"
    MULTIPLE_BLANK = "multiple_blank"
    MATCHING = "matching"
    DRAG_DROP = "drag_drop"
    ORDERING = "ordering"
    DROPDOWN = "dropdown"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    NUMERIC = "numeric"
    IMAGE = "image"
    CODE = "code"


class Question(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "questions"

    type = Column(Enum(QuestionType), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    points = Column(Float, default=1.0, nullable=False)
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.MEDIUM, nullable=False)
    
    # config stores question options, blanks, pairs, code stubs, tolerances etc.
    config = Column(JSONB, nullable=False, default=dict)
    explanation = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    quiz_questions = relationship("QuizQuestion", back_populates="question", cascade="all, delete-orphan")


class QuizQuestion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "quiz_questions"

    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    order = Column(Integer, default=0, nullable=False)
    points_override = Column(Float, nullable=True)

    quiz = relationship("Quiz", back_populates="quiz_questions")
    question = relationship("Question", back_populates="quiz_questions")
