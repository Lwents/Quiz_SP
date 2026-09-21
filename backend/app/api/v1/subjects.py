from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.quiz import Subject, Topic
from app.models.user import User, UserRole
from app.schemas.quiz import (
    SubjectCreate,
    SubjectResponse,
    TopicCreate,
    TopicResponse
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
    existing = await db.execute(select(Subject).where(Subject.code == subject_in.code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "SUBJECT_CODE_EXISTS", "message": "Subject code already exists"}}
        )
    subject = Subject(**subject_in.model_dump())
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.get("/{subject_id}/topics", response_model=List[TopicResponse])
async def list_topics(subject_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Topic).where(Topic.subject_id == subject_id).order_by(Topic.name))
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
            detail={"error": {"code": "SUBJECT_NOT_FOUND", "message": "Subject not found"}}
        )
    topic = Topic(
        subject_id=subject_id,
        name=topic_in.name,
        description=topic_in.description
    )
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic
