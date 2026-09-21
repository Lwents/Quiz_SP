import uuid
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.quiz import Quiz, QuizStatus
from app.models.question import Question, QuizQuestion
from app.models.attempt import Attempt, AttemptAnswer, AttemptStatus
from app.models.user import User, UserRole
from app.schemas.attempt import (
    SaveAnswerRequest,
    AttemptProgressRequest,
    AttemptStartResponse,
    AttemptStatusResponse,
    AttemptAnswerResponse,
    AttemptResultResponse,
    QuestionReviewItem
)
from app.schemas.question import QuestionStudentResponse, QuestionTeacherResponse
from app.scoring.base import score_question
from app.api.deps import get_current_user

router = APIRouter(prefix="/attempts", tags=["attempts"])

async def grade_and_finalize_attempt(attempt: Attempt, db: AsyncSession) -> Attempt:
    if attempt.status in (AttemptStatus.SUBMITTED, AttemptStatus.GRADED):
        return attempt

    # Ensure relations are loaded
    if not attempt.quiz or not hasattr(attempt.quiz, 'quiz_questions') or not attempt.answers:
        res = await db.execute(
            select(Attempt)
            .where(Attempt.id == attempt.id)
            .options(
                selectinload(Attempt.quiz).selectinload(Quiz.quiz_questions).selectinload(QuizQuestion.question),
                selectinload(Attempt.answers)
            )
        )
        attempt = res.scalar_one()

    quiz = attempt.quiz
    now = datetime.now(timezone.utc)
    if not attempt.submitted_at:
        attempt.submitted_at = now
    delta = now - attempt.started_at
    attempt.duration_seconds = max(0, int(delta.total_seconds()))

    user_answers_map = {a.question_id: a for a in attempt.answers}

    total_score = 0.0
    max_total_score = 0.0

    for qq in quiz.quiz_questions:
        q = qq.question
        q_points = qq.points_override if qq.points_override is not None else q.points
        max_total_score += q_points

        att_ans = user_answers_map.get(q.id)
        user_val = att_ans.answer if att_ans else None

        if user_val is None or user_val == '' or user_val == [] or user_val == {}:
            is_correct_str = 'false'
            score_earned = 0.0
        else:
            score_result = score_question(
                q_type=q.type.value,
                config=q.config or {},
                user_answer=user_val,
                max_score=q_points
            )
            score_earned = score_result['score']
            if score_result['correct']:
                is_correct_str = 'true'
            elif score_earned > 0:
                is_correct_str = 'partial'
            else:
                is_correct_str = 'false'

        total_score += score_earned

        if not att_ans:
            att_ans = AttemptAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                answer=user_val,
                score=score_earned,
                max_score=q_points,
                is_correct=is_correct_str
            )
            db.add(att_ans)
        else:
            att_ans.score = score_earned
            att_ans.max_score = q_points
            att_ans.is_correct = is_correct_str

    attempt.score = round(total_score, 2)
    attempt.max_score = round(max_total_score, 2)
    attempt.status = AttemptStatus.GRADED

    await db.commit()
    await db.refresh(attempt)
    return attempt



@router.post("/quiz/{quiz_id}", response_model=AttemptStartResponse, status_code=status.HTTP_201_CREATED)
async def start_quiz_attempt(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(
            selectinload(Quiz.quiz_questions).selectinload(QuizQuestion.question)
        )
    )
    res = await db.execute(query)
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "QUIZ_NOT_FOUND", "message": "Quiz not found"}}
        )

    if current_user.role == UserRole.STUDENT and quiz.status != QuizStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "QUIZ_NOT_PUBLISHED", "message": "Quiz is not published"}}
        )

    # Check max attempts
    if quiz.max_attempts > 0 and current_user.role == UserRole.STUDENT:
        count_res = await db.execute(
            select(Attempt).where(
                and_(
                    Attempt.quiz_id == quiz_id,
                    Attempt.user_id == current_user.id,
                    Attempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.GRADED])
                )
            )
        )
        completed_attempts = len(count_res.scalars().all())
        if completed_attempts >= quiz.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "MAX_ATTEMPTS_EXCEEDED", "message": f"Maximum allowed attempts ({quiz.max_attempts}) reached"}}
            )

    # Check if there is an in-progress attempt to resume
    in_progress_res = await db.execute(
        select(Attempt)
        .where(
            and_(
                Attempt.quiz_id == quiz_id,
                Attempt.user_id == current_user.id,
                Attempt.status == AttemptStatus.IN_PROGRESS
            )
        )
        .options(
            selectinload(Attempt.quiz).selectinload(Quiz.quiz_questions).selectinload(QuizQuestion.question),
            selectinload(Attempt.answers)
        )
    )
    existing_attempt = in_progress_res.scalar_one_or_none()

    if existing_attempt:
        # Check if duration limit has expired while student was away (NO PAUSE)
        if quiz.duration_minutes > 0:
            elapsed = (datetime.now(timezone.utc) - existing_attempt.started_at).total_seconds()
            if elapsed >= quiz.duration_minutes * 60:
                # Expired while away, auto finalize
                await grade_and_finalize_attempt(existing_attempt, db)
                existing_attempt = None

    if not existing_attempt:
        # If max attempts limit is configured, re-verify completed count
        if quiz.max_attempts > 0 and current_user.role == UserRole.STUDENT:
            count_res = await db.execute(
                select(Attempt).where(
                    and_(
                        Attempt.quiz_id == quiz_id,
                        Attempt.user_id == current_user.id,
                        Attempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.GRADED])
                    )
                )
            )
            completed_attempts = len(count_res.scalars().all())
            if completed_attempts >= quiz.max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "MAX_ATTEMPTS_EXCEEDED", "message": f"Bài làm trước đó đã hết giờ và được tự động nộp. Bạn đã đạt tối đa ({quiz.max_attempts}) lượt làm bài."}}
                )

        attempt = Attempt(
            user_id=current_user.id,
            quiz_id=quiz.id,
            started_at=datetime.now(timezone.utc),
            status=AttemptStatus.IN_PROGRESS,
            duration_seconds=0
        )
        db.add(attempt)
        await db.commit()
        await db.refresh(attempt)
    else:
        # Resuming active attempt:
        # TIME DOES NOT PAUSE! started_at is preserved exactly as original.
        attempt = existing_attempt

    # Build sanitized questions for student with deterministic PRNG based on attempt.id
    qq_list = list(quiz.quiz_questions)
    rng = random.Random(str(attempt.id))
    if quiz.shuffle_questions:
        rng.shuffle(qq_list)
    else:
        qq_list.sort(key=lambda x: x.order)

    questions_out = []
    for idx, qq in enumerate(qq_list):
        q = qq.question
        points = qq.points_override if qq.points_override is not None else q.points
        sanitized_config = dict(q.config or {})
        sanitized_config.pop("correct", None)
        sanitized_config.pop("accepted_answers", None)
        sanitized_config.pop("correct_order", None)

        q_rng = random.Random(f"{attempt.id}_{q.id}")

        if q.type in ("matching", "drag_drop"):
            pairs = sanitized_config.get("pairs", [])
            left_items = [p.get("left") for p in pairs if "left" in p]
            right_items = [p.get("right") for p in pairs if "right" in p]
            if quiz.shuffle_answers:
                q_rng.shuffle(right_items)
            sanitized_config["left_items"] = left_items
            sanitized_config["right_items"] = right_items
            sanitized_config.pop("pairs", None)

        if quiz.shuffle_answers and "options" in sanitized_config and isinstance(sanitized_config["options"], list):
            opts = list(sanitized_config["options"])
            q_rng.shuffle(opts)
            sanitized_config["options"] = opts

        questions_out.append(QuestionStudentResponse(
            id=q.id,
            type=q.type,
            title=q.title,
            content=q.content,
            points=points,
            difficulty=q.difficulty,
            config=sanitized_config,
            order=idx
        ))

    return AttemptStartResponse(
        id=attempt.id,
        quiz_id=quiz.id,
        started_at=attempt.started_at,
        status=attempt.status,
        duration_minutes=quiz.duration_minutes,
        questions=questions_out
    )


@router.get("/my-active", response_model=List[uuid.UUID])
async def get_my_active_attempts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(
        select(Attempt)
        .where(
            and_(
                Attempt.user_id == current_user.id,
                Attempt.status == AttemptStatus.IN_PROGRESS
            )
        )
        .options(
            selectinload(Attempt.quiz).selectinload(Quiz.quiz_questions).selectinload(QuizQuestion.question),
            selectinload(Attempt.answers)
        )
    )
    in_progress = res.scalars().all()
    active_quiz_ids = []
    now = datetime.now(timezone.utc)

    for att in in_progress:
        if att.quiz and att.quiz.duration_minutes > 0:
            elapsed = (now - att.started_at).total_seconds()
            if elapsed >= att.quiz.duration_minutes * 60:
                # Expired while away, auto finalize
                await grade_and_finalize_attempt(att, db)
                continue
        active_quiz_ids.append(att.quiz_id)

    return list(set(active_quiz_ids))


@router.patch("/{attempt_id}/progress")
async def update_attempt_progress(
    attempt_id: uuid.UUID,
    data: AttemptProgressRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attempt = await db.get(Attempt, attempt_id)
    if not attempt or attempt.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt not in progress")

    if data.duration_seconds is not None:
        attempt.duration_seconds = max(attempt.duration_seconds or 0, data.duration_seconds)
    await db.commit()
    return {"status": "ok", "duration_seconds": attempt.duration_seconds}


@router.get("/{attempt_id}", response_model=AttemptStatusResponse)
async def get_attempt_state(
    attempt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        select(Attempt)
        .where(Attempt.id == attempt_id)
        .options(selectinload(Attempt.quiz), selectinload(Attempt.answers))
    )
    res = await db.execute(query)
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "ATTEMPT_NOT_FOUND", "message": "Attempt not found"}}
        )

    if attempt.user_id != current_user.id and current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "You cannot access this attempt"}}
        )

    answers_out = [
        AttemptAnswerResponse.model_validate(a) for a in attempt.answers
    ]

    # If in-progress and time limit expired, auto finalize
    if attempt.status == AttemptStatus.IN_PROGRESS and attempt.quiz and attempt.quiz.duration_minutes > 0:
        elapsed = (datetime.now(timezone.utc) - attempt.started_at).total_seconds()
        if elapsed >= attempt.quiz.duration_minutes * 60:
            attempt = await grade_and_finalize_attempt(attempt, db)

    duration = attempt.duration_seconds
    if attempt.status == AttemptStatus.IN_PROGRESS:
        delta = datetime.now(timezone.utc) - attempt.started_at
        duration = int(delta.total_seconds())

    return AttemptStatusResponse(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        status=attempt.status,
        duration_seconds=duration,
        answers=answers_out
    )


@router.patch("/{attempt_id}/answers/{question_id}", response_model=AttemptAnswerResponse)
async def save_answer(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    answer_in: SaveAnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attempt = await db.get(Attempt, attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "ATTEMPT_NOT_FOUND", "message": "Attempt not found"}}
        )

    if attempt.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Forbidden"}}
        )

    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "ATTEMPT_ALREADY_CLOSED", "message": "Attempt is already submitted"}}
        )

    # Check if expired (grace period of 15 seconds for network latency)
    quiz = await db.get(Quiz, attempt.quiz_id)
    if quiz and quiz.duration_minutes > 0:
        elapsed = (datetime.now(timezone.utc) - attempt.started_at).total_seconds()
        if elapsed > quiz.duration_minutes * 60 + 15:
            await grade_and_finalize_attempt(attempt, db)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "TIME_EXPIRED", "message": "Thời gian làm bài thi đã kết thúc"}}
            )

    # Upsert attempt answer
    res = await db.execute(
        select(AttemptAnswer).where(
            and_(AttemptAnswer.attempt_id == attempt_id, AttemptAnswer.question_id == question_id)
        )
    )
    attempt_answer = res.scalar_one_or_none()

    if not attempt_answer:
        attempt_answer = AttemptAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            answer=answer_in.answer
        )
        db.add(attempt_answer)
    else:
        attempt_answer.answer = answer_in.answer

    await db.commit()
    await db.refresh(attempt_answer)
    return attempt_answer


@router.post("/{attempt_id}/submit", response_model=AttemptResultResponse)
async def submit_attempt(
    attempt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        select(Attempt)
        .where(Attempt.id == attempt_id)
        .options(
            selectinload(Attempt.quiz).selectinload(Quiz.quiz_questions).selectinload(QuizQuestion.question),
            selectinload(Attempt.answers)
        )
    )
    res = await db.execute(query)
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "ATTEMPT_NOT_FOUND", "message": "Attempt not found"}}
        )

    if attempt.user_id != current_user.id and current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Forbidden"}}
        )

    # Idempotent submit: if already submitted, simply return result
    if attempt.status in (AttemptStatus.SUBMITTED, AttemptStatus.GRADED):
        return await get_attempt_result(attempt_id=attempt_id, db=db, current_user=current_user)

    await grade_and_finalize_attempt(attempt, db)
    return await get_attempt_result(attempt_id=attempt_id, db=db, current_user=current_user)


@router.get("/{attempt_id}/result", response_model=AttemptResultResponse)
async def get_attempt_result(
    attempt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        select(Attempt)
        .where(Attempt.id == attempt_id)
        .options(
            selectinload(Attempt.quiz).selectinload(Quiz.quiz_questions).selectinload(QuizQuestion.question),
            selectinload(Attempt.answers)
        )
    )
    res = await db.execute(query)
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "ATTEMPT_NOT_FOUND", "message": "Attempt not found"}}
        )

    if attempt.user_id != current_user.id and current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Forbidden"}}
        )

    quiz = attempt.quiz
    ans_map = {a.question_id: a for a in attempt.answers}

    correct_count = 0
    incorrect_count = 0
    unanswered_count = 0

    questions_review = None
    # Show detailed answer review if configured or if teacher/admin
    can_view_answers = quiz.show_answer_after_submit or current_user.role in (UserRole.TEACHER, UserRole.ADMIN)

    if can_view_answers:
        questions_review = []
        for qq in sorted(quiz.quiz_questions, key=lambda x: x.order):
            q = qq.question
            points = qq.points_override if qq.points_override is not None else q.points
            att_ans = ans_map.get(q.id)

            if att_ans and att_ans.is_correct == "true":
                correct_count += 1
            elif att_ans and att_ans.is_correct in ("false", "partial"):
                incorrect_count += 1
            else:
                unanswered_count += 1

            q_resp = QuestionTeacherResponse(
                id=q.id,
                type=q.type,
                title=q.title,
                content=q.content,
                points=points,
                difficulty=q.difficulty,
                config=q.config or {},
                explanation=q.explanation,
                created_by=q.created_by,
                order=qq.order
            )

            questions_review.append(QuestionReviewItem(
                question=q_resp,
                user_answer=att_ans.answer if att_ans else None,
                is_correct=att_ans.is_correct if att_ans else "false",
                score=att_ans.score if att_ans else 0.0,
                max_score=points
            ))
    else:
        for qq in quiz.quiz_questions:
            att_ans = ans_map.get(qq.question_id)
            if att_ans and att_ans.is_correct == "true":
                correct_count += 1
            elif att_ans and att_ans.is_correct in ("false", "partial"):
                incorrect_count += 1
            else:
                unanswered_count += 1

    pct = round((attempt.score / attempt.max_score * 100), 1) if attempt.max_score > 0 else 0.0
    passed = (pct >= (quiz.pass_score / 10.0 * 100)) if quiz.pass_score else True

    return AttemptResultResponse(
        id=attempt.id,
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        duration_seconds=attempt.duration_seconds,
        score=attempt.score,
        max_score=attempt.max_score,
        percentage=pct,
        passed=passed,
        total_questions=len(quiz.quiz_questions),
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        unanswered_count=unanswered_count,
        questions_review=questions_review
    )
