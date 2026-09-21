import enum
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class QuizStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class DifficultyLevel(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class Subject(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "subjects"

    name = Column(String(255), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    topics = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="subject")


class Topic(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "topics"

    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    subject = relationship("Subject", back_populates="topics")
    quizzes = relationship("Quiz", back_populates="topic")


class Quiz(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "quizzes"

    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.MEDIUM, nullable=False)
    duration_minutes = Column(Integer, default=30, nullable=False) # 0 = unlimited
    pass_score = Column(Float, default=5.0, nullable=False)
    max_attempts = Column(Integer, default=0, nullable=False) # 0 = unlimited
    shuffle_questions = Column(Boolean, default=False, nullable=False)
    shuffle_answers = Column(Boolean, default=False, nullable=False)
    show_answer_after_submit = Column(Boolean, default=True, nullable=False)
    
    status = Column(Enum(QuizStatus), default=QuizStatus.DRAFT, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    subject = relationship("Subject", back_populates="quizzes")
    topic = relationship("Topic", back_populates="quizzes")
    quiz_questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.order")
    attempts = relationship("Attempt", back_populates="quiz", cascade="all, delete-orphan")
