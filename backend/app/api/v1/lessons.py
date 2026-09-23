# -*- coding: utf-8 -*-
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.quiz import Subject, Topic, Quiz, QuizStatus
from app.models.lesson import Lesson, UserLessonProgress
from app.models.user import User, UserRole
from app.api.deps import get_current_user, get_optional_current_user, require_role
from app.schemas.lesson import (
    LessonCreate,
    LessonUpdate,
    LessonSimpleResponse,
    LessonDetailResponse,
    LessonNavInfo,
    CourseCurriculumResponse,
    CourseTopicResponse,
    LessonReorderRequest
)

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/subject/{subject_id}", response_model=CourseCurriculumResponse)
async def get_subject_curriculum(
    subject_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    subject = await db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SUBJECT_NOT_FOUND", "message": "Không tìm thấy môn học"}}
        )

    # Get topics with lessons and quizzes
    topics_res = await db.execute(
        select(Topic)
        .where(Topic.subject_id == subject_id)
        .order_by(Topic.order.asc(), Topic.created_at.asc())
        .options(
            selectinload(Topic.lessons),
            selectinload(Topic.quizzes)
        )
    )
    topics = topics_res.scalars().all()

    # Get user progress if logged in
    completed_lesson_ids = set()
    if current_user:
        progress_res = await db.execute(
            select(UserLessonProgress.lesson_id)
            .join(Lesson, UserLessonProgress.lesson_id == Lesson.id)
            .join(Topic, Lesson.topic_id == Topic.id)
            .where(
                and_(
                    UserLessonProgress.user_id == current_user.id,
                    UserLessonProgress.completed == True,
                    Topic.subject_id == subject_id
                )
            )
        )
        completed_lesson_ids = set(progress_res.scalars().all())

    total_lessons_count = 0
    total_quizzes_count = 0
    topic_responses = []

    for top in topics:
        # Sort lessons by order
        sorted_lessons = sorted(top.lessons, key=lambda l: (l.order, l.created_at))
        lesson_items = []
        for les in sorted_lessons:
            total_lessons_count += 1
            is_comp = les.id in completed_lesson_ids
            lesson_items.append(
                LessonSimpleResponse(
                    id=les.id,
                    topic_id=les.topic_id,
                    title=les.title,
                    description=les.description,
                    duration_minutes=les.duration_minutes,
                    order=les.order,
                    video_url=les.video_url,
                    slide_url=les.slide_url,
                    quiz_id=les.quiz_id,
                    is_completed=is_comp
                )
            )

        # Quizzes of topic
        quiz_items = []
        for qz in top.quizzes:
            if qz.status == QuizStatus.PUBLISHED:
                total_quizzes_count += 1
                quiz_items.append({
                    "id": str(qz.id),
                    "title": qz.title,
                    "difficulty": qz.difficulty.value if hasattr(qz.difficulty, 'value') else str(qz.difficulty),
                    "duration_minutes": qz.duration_minutes,
                    "pass_score": qz.pass_score,
                    "topic_id": str(top.id)
                })

        topic_responses.append(
            CourseTopicResponse(
                id=top.id,
                subject_id=top.subject_id,
                name=top.name,
                description=top.description,
                slide_url=top.slide_url,
                order=top.order,
                lessons=lesson_items,
                quizzes=quiz_items
            )
        )

    completed_count = len(completed_lesson_ids)
    progress_pct = round((completed_count / total_lessons_count) * 100, 1) if total_lessons_count > 0 else 0.0

    return CourseCurriculumResponse(
        subject_id=subject.id,
        subject_name=subject.name,
        subject_code=subject.code,
        subject_description=subject.description,
        total_lessons=total_lessons_count,
        completed_lessons=completed_count,
        progress_percent=progress_pct,
        total_quizzes=total_quizzes_count,
        topics=topic_responses
    )


@router.get("/{lesson_id}", response_model=LessonDetailResponse)
async def get_lesson_detail(
    lesson_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = (
        select(Lesson)
        .where(Lesson.id == lesson_id)
        .options(
            selectinload(Lesson.topic).selectinload(Topic.subject),
            selectinload(Lesson.quiz)
        )
    )
    res = await db.execute(query)
    lesson = res.scalar_one_or_none()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "LESSON_NOT_FOUND", "message": "Không tìm thấy bài học"}}
        )

    subject = lesson.topic.subject

    # Check user completion
    is_completed = False
    if current_user:
        prog = await db.execute(
            select(UserLessonProgress)
            .where(
                and_(
                    UserLessonProgress.user_id == current_user.id,
                    UserLessonProgress.lesson_id == lesson.id,
                    UserLessonProgress.completed == True
                )
            )
        )
        is_completed = prog.scalar_one_or_none() is not None

    # Get all lessons of this subject ordered by (Topic.order, Lesson.order) to get prev/next
    all_lessons_res = await db.execute(
        select(Lesson)
        .join(Topic, Lesson.topic_id == Topic.id)
        .where(Topic.subject_id == subject.id)
        .order_by(Topic.order.asc(), Lesson.order.asc(), Lesson.created_at.asc())
        .options(selectinload(Lesson.topic))
    )
    ordered_lessons = all_lessons_res.scalars().all()

    cur_idx = -1
    for idx, l in enumerate(ordered_lessons):
        if l.id == lesson.id:
            cur_idx = idx
            break

    prev_info = None
    if cur_idx > 0:
        prev_l = ordered_lessons[cur_idx - 1]
        prev_info = LessonNavInfo(
            id=prev_l.id,
            title=prev_l.title,
            topic_name=prev_l.topic.name if prev_l.topic else None
        )

    next_info = None
    if cur_idx >= 0 and cur_idx < len(ordered_lessons) - 1:
        next_l = ordered_lessons[cur_idx + 1]
        next_info = LessonNavInfo(
            id=next_l.id,
            title=next_l.title,
            topic_name=next_l.topic.name if next_l.topic else None
        )

    quiz_info = None
    if lesson.quiz:
        quiz_info = {
            "id": str(lesson.quiz.id),
            "title": lesson.quiz.title,
            "duration_minutes": lesson.quiz.duration_minutes,
            "difficulty": lesson.quiz.difficulty.value if hasattr(lesson.quiz.difficulty, 'value') else str(lesson.quiz.difficulty),
            "pass_score": lesson.quiz.pass_score,
        }

    return LessonDetailResponse(
        id=lesson.id,
        topic_id=lesson.topic_id,
        topic_name=lesson.topic.name,
        subject_id=subject.id,
        subject_name=subject.name,
        title=lesson.title,
        description=lesson.description,
        content=lesson.content,
        video_url=lesson.video_url,
        slide_url=lesson.slide_url or lesson.topic.slide_url,
        duration_minutes=lesson.duration_minutes,
        order=lesson.order,
        quiz_id=lesson.quiz_id,
        quiz_info=quiz_info,
        is_completed=is_completed,
        prev_lesson=prev_info,
        next_lesson=next_info
    )


@router.post("/{lesson_id}/toggle-complete")
async def toggle_lesson_complete(
    lesson_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "LESSON_NOT_FOUND", "message": "Không tìm thấy bài học"}}
        )

    prog_res = await db.execute(
        select(UserLessonProgress).where(
            and_(
                UserLessonProgress.user_id == current_user.id,
                UserLessonProgress.lesson_id == lesson_id
            )
        )
    )
    prog = prog_res.scalar_one_or_none()

    if prog:
        # Toggle state
        prog.completed = not prog.completed
        prog.completed_at = datetime.now(timezone.utc) if prog.completed else None
        new_state = prog.completed
    else:
        # Create new completed record
        prog = UserLessonProgress(
            user_id=current_user.id,
            lesson_id=lesson_id,
            completed=True,
            completed_at=datetime.now(timezone.utc)
        )
        db.add(prog)
        new_state = True

    await db.commit()
    return {"lesson_id": lesson_id, "completed": new_state}


@router.post("/topic/{topic_id}", response_model=LessonSimpleResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    topic_id: uuid.UUID,
    lesson_in: LessonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    topic = await db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "TOPIC_NOT_FOUND", "message": "Không tìm thấy chủ đề"}}
        )

    # Determine order
    if lesson_in.order is None:
        order_res = await db.execute(
            select(func.coalesce(func.max(Lesson.order), -1)).where(Lesson.topic_id == topic_id)
        )
        max_order = order_res.scalar()
        order_val = max_order + 1
    else:
        order_val = lesson_in.order

    # Kiểm tra liên kết đề thi nếu có
    if lesson_in.quiz_id is not None:
        quiz = await db.get(Quiz, lesson_in.quiz_id)
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "QUIZ_NOT_FOUND", "message": "Đề thi liên kết không tồn tại"}}
            )
        if quiz.subject_id and quiz.subject_id != topic.subject_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "SUBJECT_MISMATCH", "message": "Đề thi không thuộc môn học của bài giảng này"}}
            )

    lesson = Lesson(
        topic_id=topic_id,
        title=lesson_in.title.strip(),
        description=lesson_in.description.strip() if lesson_in.description else None,
        content=lesson_in.content,
        video_url=lesson_in.video_url.strip() if lesson_in.video_url else None,
        slide_url=lesson_in.slide_url.strip() if lesson_in.slide_url else None,
        duration_minutes=lesson_in.duration_minutes,
        order=order_val,
        quiz_id=lesson_in.quiz_id
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)

    return LessonSimpleResponse(
        id=lesson.id,
        topic_id=lesson.topic_id,
        title=lesson.title,
        description=lesson.description,
        duration_minutes=lesson.duration_minutes,
        order=lesson.order,
        video_url=lesson.video_url,
        slide_url=lesson.slide_url,
        quiz_id=lesson.quiz_id,
        is_completed=False
    )


@router.put("/{lesson_id}", response_model=LessonSimpleResponse)
@router.patch("/{lesson_id}", response_model=LessonSimpleResponse)
async def update_lesson(
    lesson_id: uuid.UUID,
    lesson_in: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "LESSON_NOT_FOUND", "message": "Không tìm thấy bài học"}}
        )

    # Nếu cập nhật quiz_id, kiểm tra xem quiz có tồn tại và có thuộc cùng subject không
    if lesson_in.quiz_id is not None:
        quiz = await db.get(Quiz, lesson_in.quiz_id)
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "QUIZ_NOT_FOUND", "message": "Đề thi liên kết không tồn tại"}}
            )
        # Kiểm tra subject của topic chứa lesson
        topic = await db.get(Topic, lesson.topic_id)
        if topic and quiz.subject_id and quiz.subject_id != topic.subject_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "SUBJECT_MISMATCH", "message": "Đề thi không thuộc môn học của bài giảng này"}}
            )

    update_data = lesson_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(lesson, field, val)

    await db.commit()
    await db.refresh(lesson)

    return LessonSimpleResponse(
        id=lesson.id,
        topic_id=lesson.topic_id,
        title=lesson.title,
        description=lesson.description,
        duration_minutes=lesson.duration_minutes,
        order=lesson.order,
        video_url=lesson.video_url,
        slide_url=lesson.slide_url,
        quiz_id=lesson.quiz_id,
        is_completed=False
    )


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "LESSON_NOT_FOUND", "message": "Không tìm thấy bài học"}}
        )
    await db.delete(lesson)
    await db.commit()
    return None


@router.put("/topic/{topic_id}/reorder", response_model=List[LessonSimpleResponse])
async def reorder_lessons(
    topic_id: uuid.UUID,
    reorder_data: LessonReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    topic = await db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "TOPIC_NOT_FOUND", "message": "Không tìm thấy chủ đề"}}
        )

    res = await db.execute(select(Lesson).where(Lesson.topic_id == topic_id))
    lessons = res.scalars().all()
    les_map = {l.id: l for l in lessons}

    for idx, lid in enumerate(reorder_data.lesson_ids):
        if lid in les_map:
            les_map[lid].order = idx

    await db.commit()

    updated = await db.execute(
        select(Lesson).where(Lesson.topic_id == topic_id).order_by(Lesson.order.asc(), Lesson.created_at.asc())
    )
    return updated.scalars().all()
