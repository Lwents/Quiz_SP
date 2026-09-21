import enum
from sqlalchemy import Column, String, Float, Integer, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class AttemptStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    GRADED = "GRADED"


class Attempt(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attempts"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(Enum(AttemptStatus), default=AttemptStatus.IN_PROGRESS, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    max_score = Column(Float, default=0.0, nullable=False)
    duration_seconds = Column(Integer, default=0, nullable=False)

    quiz = relationship("Quiz", back_populates="attempts")
    answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")


class AttemptAnswer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attempt_answers"

    attempt_id = Column(UUID(as_uuid=True), ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # user answer in JSONB format
    answer = Column(JSONB, nullable=True)
    is_correct = Column(String(50), nullable=True) # "true", "false", "partial", "pending"
    score = Column(Float, default=0.0, nullable=False)
    max_score = Column(Float, default=1.0, nullable=False)
    feedback = Column(String(500), nullable=True)

    attempt = relationship("Attempt", back_populates="answers")
    question = relationship("Question")
