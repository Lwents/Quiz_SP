import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.question import Question, QuestionType
from app.models.quiz import DifficultyLevel
from app.models.user import User, UserRole
from app.schemas.question import (
    QuestionCreate,
    QuestionUpdate,
    QuestionTeacherResponse
)
from app.api.deps import require_role

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("", response_model=List[QuestionTeacherResponse])
async def list_questions(
    type: Optional[QuestionType] = None,
    difficulty: Optional[DifficultyLevel] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    query = select(Question)
    if type:
        query = query.where(Question.type == type)
    if difficulty:
        query = query.where(Question.difficulty == difficulty)
    if search:
        query = query.where(Question.content.ilike(f"%{search}%"))

    query = query.order_by(Question.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=QuestionTeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    q_in: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    question = Question(
        **q_in.model_dump(),
        created_by=current_user.id
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.get("/{question_id}", response_model=QuestionTeacherResponse)
async def get_question(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "QUESTION_NOT_FOUND", "message": "Question not found"}}
        )
    return question


@router.patch("/{question_id}", response_model=QuestionTeacherResponse)
async def update_question(
    question_id: uuid.UUID,
    q_in: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "QUESTION_NOT_FOUND", "message": "Question not found"}}
        )

    for field, val in q_in.model_dump(exclude_unset=True).items():
        setattr(question, field, val)

    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    question = await db.get(Question, question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "QUESTION_NOT_FOUND", "message": "Question not found"}}
        )
    await db.delete(question)
    await db.commit()
    return None
