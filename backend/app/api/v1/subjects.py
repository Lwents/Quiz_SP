from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.quiz import Subject, Topic, Quiz
from app.models.user import User, UserRole
from app.schemas.quiz import (
    SubjectCreate,
    SubjectResponse,
    TopicCreate,
    TopicResponse,
    TopicReorderRequest
)
from app.api.deps import require_role

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=List[SubjectResponse])
async def list_subjects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subject).order_by(Subject.name))
    return result.scalars().all()


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    subject_in: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    existing = await db.execute(select(Subject).where(Subject.code == subject_in.code.strip().upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "SUBJECT_CODE_EXISTS", "message": "Mã môn học đã tồn tại"}}
        )
    subject = Subject(
        name=subject_in.name.strip(),
        code=subject_in.code.strip().upper(),
        description=subject_in.description
    )
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: uuid.UUID,
    subject_in: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    subject = await db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SUBJECT_NOT_FOUND", "message": "Không tìm thấy môn học"}}
        )
    subject.name = subject_in.name.strip()
    subject.code = subject_in.code.strip().upper()
    subject.description = subject_in.description
    await db.commit()
    await db.refresh(subject)
    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    subject = await db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SUBJECT_NOT_FOUND", "message": "Không tìm thấy môn học"}}
        )
    await db.delete(subject)
    await db.commit()
    return None


@router.get("/{subject_id}/topics", response_model=List[TopicResponse])
async def list_topics(subject_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Topic)
        .where(Topic.subject_id == subject_id)
        .order_by(Topic.order.asc(), Topic.created_at.asc())
    )
    return result.scalars().all()


@router.post("/{subject_id}/topics", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    subject_id: uuid.UUID,
    topic_in: TopicCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    subject = await db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SUBJECT_NOT_FOUND", "message": "Môn học không tồn tại"}}
        )
    
    if topic_in.order is not None:
        topic_order = topic_in.order
    else:
        max_order_res = await db.execute(
            select(func.coalesce(func.max(Topic.order), -1)).where(Topic.subject_id == subject_id)
        )
        topic_order = max_order_res.scalar() + 1

    topic = Topic(
        subject_id=subject_id,
        name=topic_in.name.strip(),
        description=topic_in.description,
        order=topic_order
    )
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic


@router.put("/{subject_id}/topics/reorder", response_model=List[TopicResponse])
async def reorder_topics(
    subject_id: uuid.UUID,
    reorder_data: TopicReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    subject = await db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SUBJECT_NOT_FOUND", "message": "Không tìm thấy môn học"}}
        )
    
    result = await db.execute(select(Topic).where(Topic.subject_id == subject_id))
    topics = result.scalars().all()
    topic_map = {t.id: t for t in topics}

    for index, tid in enumerate(reorder_data.topic_ids):
        if tid in topic_map:
            topic_map[tid].order = index

    await db.commit()

    updated_result = await db.execute(
        select(Topic)
        .where(Topic.subject_id == subject_id)
        .order_by(Topic.order.asc(), Topic.created_at.asc())
    )
    return updated_result.scalars().all()


@router.delete("/{subject_id}/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    subject_id: uuid.UUID,
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    topic = await db.get(Topic, topic_id)
    if not topic or topic.subject_id != subject_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "TOPIC_NOT_FOUND", "message": "Chủ đề không tồn tại"}}
        )
    await db.delete(topic)
    await db.commit()
    return None
