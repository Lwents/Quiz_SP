import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content: str
    video_url: Optional[str] = None
    slide_url: Optional[str] = None
    duration_minutes: int = 15
    order: Optional[int] = None
    quiz_id: Optional[uuid.UUID] = None


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    slide_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    order: Optional[int] = None
    quiz_id: Optional[uuid.UUID] = None


class LessonSimpleResponse(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    title: str
    description: Optional[str] = None
    duration_minutes: int = 15
    order: int = 0
    video_url: Optional[str] = None
    slide_url: Optional[str] = None
    quiz_id: Optional[uuid.UUID] = None
    is_completed: bool = False

    model_config = ConfigDict(from_attributes=True)


class LessonNavInfo(BaseModel):
    id: uuid.UUID
    title: str
    topic_name: Optional[str] = None


class LessonDetailResponse(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    topic_name: str
    subject_id: uuid.UUID
    subject_name: str
    title: str
    description: Optional[str] = None
    content: str
    video_url: Optional[str] = None
    slide_url: Optional[str] = None
    duration_minutes: int = 15
    order: int = 0
    quiz_id: Optional[uuid.UUID] = None
    quiz_info: Optional[Dict[str, Any]] = None
    is_completed: bool = False
    prev_lesson: Optional[LessonNavInfo] = None
    next_lesson: Optional[LessonNavInfo] = None

    model_config = ConfigDict(from_attributes=True)


class CourseTopicResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    name: str
    description: Optional[str] = None
    slide_url: Optional[str] = None
    order: int = 0
    lessons: List[LessonSimpleResponse] = []
    quizzes: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)


class CourseCurriculumResponse(BaseModel):
    subject_id: uuid.UUID
    subject_name: str
    subject_code: str
    subject_description: Optional[str] = None
    total_lessons: int = 0
    completed_lessons: int = 0
    progress_percent: float = 0.0
    total_quizzes: int = 0
    topics: List[CourseTopicResponse] = []

    model_config = ConfigDict(from_attributes=True)


class LessonReorderRequest(BaseModel):
    lesson_ids: List[uuid.UUID]
