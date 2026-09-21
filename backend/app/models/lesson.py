import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Lesson(Base, UUIDMixin, TimestampMixin):
    __tablename__ = 'lessons'

    topic_id = Column(UUID(as_uuid=True), ForeignKey('topics.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    video_url = Column(String(500), nullable=True)
    slide_url = Column(String(500), nullable=True)
    duration_minutes = Column(Integer, default=15, nullable=False)
    order = Column(Integer, default=0, nullable=False)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey('quizzes.id', ondelete='SET NULL'), nullable=True)

    topic = relationship('Topic', back_populates='lessons')
    quiz = relationship('Quiz')
    progress = relationship('UserLessonProgress', back_populates='lesson', cascade='all, delete-orphan')


class UserLessonProgress(Base, UUIDMixin, TimestampMixin):
    __tablename__ = 'user_lesson_progress'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False)
    completed = Column(Boolean, default=True, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'lesson_id', name='uq_user_lesson_progress'),
    )

    lesson = relationship('Lesson', back_populates='progress')
