import uuid
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.quiz import Quiz, QuizStatus, DifficultyLevel, Subject, Topic
from app.models.question import Question, QuizQuestion, QuestionType
from app.models.attempt import Attempt, AttemptAnswer, AttemptStatus
from app.models.user import User, UserRole
from app.schemas.quiz import (
    QuizCreate,
    QuizUpdate,
    QuizListResponse,
    QuizStudentDetailResponse,
    QuizTeacherDetailResponse,
    SubjectResponse,
    TopicResponse,
    QuizQuestionReorderRequest
)
from app.schemas.question import QuestionStudentResponse, QuestionTeacherResponse, QuestionCreate
from app.api.deps import get_current_user, get_optional_current_user, require_role

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-') or str(uuid.uuid4())[:8]


@router.get("", response_model=List[QuizListResponse])
async def list_quizzes(
    subject_id: Optional[uuid.UUID] = None,
    topic_id: Optional[uuid.UUID] = None,
    difficulty: Optional[DifficultyLevel] = None,
    search: Optional[str] = None,
    status_filter: Optional[QuizStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = select(Quiz).options(
        selectinload(Quiz.subject),
        selectinload(Quiz.topic),
        selectinload(Quiz.quiz_questions)
    )

    # If student or unauthenticated guest, only see published quizzes
    if not current_user or current_user.role == UserRole.STUDENT:
        query = query.where(Quiz.status == QuizStatus.PUBLISHED)
    elif status_filter:
        query = query.where(Quiz.status == status_filter)

    if subject_id:
        query = query.where(Quiz.subject_id == subject_id)
    if topic_id:
        query = query.where(Quiz.topic_id == topic_id)
    if difficulty:
        query = query.where(Quiz.difficulty == difficulty)
    if search:
        query = query.where(Quiz.title.ilike(f"%{search}%"))

    query = query.order_by(Quiz.created_at.desc())
    result = await db.execute(query)
    quizzes = result.scalars().all()

    response = []
    for q in quizzes:
        q_dict = {
            "id": q.id,
            "title": q.title,
            "slug": q.slug,
            "description": q.description,
            "subject_id": q.subject_id,
            "topic_id": q.topic_id,
            "difficulty": q.difficulty,
            "duration_minutes": q.duration_minutes,
            "pass_score": q.pass_score,
            "max_attempts": q.max_attempts,
            "shuffle_questions": q.shuffle_questions,
            "shuffle_answers": q.shuffle_answers,
            "show_answer_after_submit": q.show_answer_after_submit,
            "status": q.status,
            "created_by": q.created_by,
            "created_at": q.created_at,
            "question_count": len(q.quiz_questions),
            "total_points": sum(qq.points_override or 1.0 for qq in q.quiz_questions),
            "subject": SubjectResponse.model_validate(q.subject) if q.subject else None,
            "topic": TopicResponse.model_validate(q.topic) if q.topic else None
        }
        response.append(QuizListResponse(**q_dict))
    return response


async def validate_quiz_settings(
    title: Optional[str],
    subject_id: Optional[uuid.UUID],
    topic_id: Optional[uuid.UUID],
    duration_minutes: Optional[int],
    pass_score: Optional[float],
    max_attempts: Optional[int],
    status_val: Optional[QuizStatus],
    db: AsyncSession,
    quiz_id: Optional[uuid.UUID] = None
):
    if title is not None and not title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_TITLE", "message": "Tiêu đề đề thi không được để trống"}}
        )

    if duration_minutes is not None and duration_minutes < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_DURATION", "message": "Thời gian làm bài không được là số âm"}}
        )

    if pass_score is not None and (pass_score < 0.0 or pass_score > 10.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_PASS_SCORE", "message": "Điểm đạt phải nằm trong khoảng từ 0.0 đến 10.0"}}
        )

    if max_attempts is not None and max_attempts < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_MAX_ATTEMPTS", "message": "Số lần làm bài tối đa không được là số âm"}}
        )

    if subject_id:
        subj = await db.get(Subject, subject_id)
        if not subj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "SUBJECT_NOT_FOUND", "message": "Môn học không tồn tại"}}
            )

    if topic_id:
        top = await db.get(Topic, topic_id)
        if not top:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "TOPIC_NOT_FOUND", "message": "Chủ đề không tồn tại"}}
            )
        if subject_id and top.subject_id != subject_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "TOPIC_SUBJECT_MISMATCH", "message": "Chủ đề được chọn không thuộc môn học đã chọn"}}
            )

    # Chặn xuất bản đề thi nếu rỗng hoặc câu hỏi thiếu cấu hình
    if status_val == QuizStatus.PUBLISHED and quiz_id:
        qq_res = await db.execute(
            select(QuizQuestion)
            .where(QuizQuestion.quiz_id == quiz_id)
            .options(selectinload(QuizQuestion.question))
        )
        qq_list = qq_res.scalars().all()
        if not qq_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "EMPTY_QUIZ_PUBLISH", "message": "Không thể xuất bản đề thi chưa có câu hỏi nào. Vui lòng thêm ít nhất một câu hỏi hợp lệ."}}
            )
        
        # Kiểm tra tính hợp lệ của từng câu hỏi
        for qq in qq_list:
            q = qq.question
            c = q.config or {}
            if q.type == QuestionType.SINGLE_CHOICE and not c.get("correct"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "INVALID_QUESTION_CONFIG", "message": f"Câu hỏi '{q.title or q.content[:30]}' loại trắc nghiệm đơn chưa chọn đáp án đúng."}}
                )
            elif q.type == QuestionType.MULTIPLE_CHOICE and not c.get("correct"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "INVALID_QUESTION_CONFIG", "message": f"Câu hỏi '{q.title or q.content[:30]}' loại nhiều lựa chọn chưa có đáp án đúng."}}
                )
            elif q.type == QuestionType.FILL_BLANK and not c.get("accepted_answers"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "INVALID_QUESTION_CONFIG", "message": f"Câu hỏi '{q.title or q.content[:30]}' loại điền từ chưa thiết lập từ khóa chấp nhận."}}
                )
            elif q.type == QuestionType.MATCHING and not c.get("pairs"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "INVALID_QUESTION_CONFIG", "message": f"Câu hỏi '{q.title or q.content[:30]}' loại ghép nối chưa thiết lập cặp ghép."}}
                )
            elif q.type == QuestionType.ORDERING and not c.get("correct_order"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "INVALID_QUESTION_CONFIG", "message": f"Câu hỏi '{q.title or q.content[:30]}' loại sắp xếp chưa thiết lập thứ tự đúng."}}
                )


@router.post("", response_model=QuizTeacherDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz_in: QuizCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    await validate_quiz_settings(
        title=quiz_in.title,
        subject_id=quiz_in.subject_id,
        topic_id=quiz_in.topic_id,
        duration_minutes=quiz_in.duration_minutes,
        pass_score=quiz_in.pass_score,
        max_attempts=quiz_in.max_attempts,
        status_val=quiz_in.status,
        db=db,
        quiz_id=None
    )

    if quiz_in.status == QuizStatus.PUBLISHED:
        # Đề mới tạo chưa có câu hỏi nào thì không được để status là PUBLISHED
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "EMPTY_QUIZ_PUBLISH", "message": "Đề thi mới tạo chưa có câu hỏi nào, không thể để trạng thái PUBLISHED. Hãy lưu nháp (DRAFT) trước."}}
        )

    base_slug = slugify(quiz_in.title)
    slug = base_slug
    counter = 1
    while True:
        existing = await db.execute(select(Quiz).where(Quiz.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    quiz = Quiz(
        **quiz_in.model_dump(exclude={"slug"}),
        slug=slug,
        created_by=current_user.id
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    
    return QuizTeacherDetailResponse(
        **quiz.__dict__,
        questions=[],
        question_count=0,
        total_points=0.0
    )


@router.get("/{quiz_id}")
async def get_quiz_detail(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(
            selectinload(Quiz.subject),
            selectinload(Quiz.topic),
            selectinload(Quiz.quiz_questions).selectinload(QuizQuestion.question)
        )
    )
    result = await db.execute(query)
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "QUIZ_NOT_FOUND", "message": "Quiz not found"}}
        )

    # If student, check if published
    if current_user.role == UserRole.STUDENT and quiz.status != QuizStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "QUIZ_NOT_PUBLISHED", "message": "This quiz is not available"}}
        )

    is_teacher_or_admin = current_user.role in (UserRole.TEACHER, UserRole.ADMIN)

    questions_out = []
    total_points = 0.0
    for qq in sorted(quiz.quiz_questions, key=lambda x: x.order):
        q = qq.question
        points = qq.points_override if qq.points_override is not None else q.points
        total_points += points

        if is_teacher_or_admin:
            # Teacher sees complete question including correct answers and explanation
            questions_out.append(QuestionTeacherResponse(
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
            ))
        else:
            # Student sees sanitized question: NEVER EXPOSE CORRECT ANSWERS IN ACTIVE TAKING
            sanitized_config = dict(q.config or {})
            sanitized_config.pop("correct", None)
            sanitized_config.pop("accepted_answers", None)
            sanitized_config.pop("correct_order", None)

            # For matching pairs, hide right-side mapping association
            if q.type in ("matching", "drag_drop"):
                pairs = sanitized_config.get("pairs", [])
                left_items = [p.get("left") for p in pairs if "left" in p]
                right_items = [p.get("right") for p in pairs if "right" in p]
                sanitized_config["left_items"] = left_items
                sanitized_config["right_items"] = right_items
                sanitized_config.pop("pairs", None)

            questions_out.append(QuestionStudentResponse(
                id=q.id,
                type=q.type,
                title=q.title,
                content=q.content,
                points=points,
                difficulty=q.difficulty,
                config=sanitized_config,
                order=qq.order
            ))

    if is_teacher_or_admin:
        return QuizTeacherDetailResponse(
            id=quiz.id,
            title=quiz.title,
            slug=quiz.slug,
            description=quiz.description,
            subject_id=quiz.subject_id,
            topic_id=quiz.topic_id,
            difficulty=quiz.difficulty,
            duration_minutes=quiz.duration_minutes,
            pass_score=quiz.pass_score,
            max_attempts=quiz.max_attempts,
            shuffle_questions=quiz.shuffle_questions,
            shuffle_answers=quiz.shuffle_answers,
            show_answer_after_submit=quiz.show_answer_after_submit,
            status=quiz.status,
            created_by=quiz.created_by,
            created_at=quiz.created_at,
            questions=questions_out,
            question_count=len(questions_out),
            total_points=total_points
        )
    else:
        return QuizStudentDetailResponse(
            id=quiz.id,
            title=quiz.title,
            slug=quiz.slug,
            description=quiz.description,
            subject_id=quiz.subject_id,
            topic_id=quiz.topic_id,
            difficulty=quiz.difficulty,
            duration_minutes=quiz.duration_minutes,
            pass_score=quiz.pass_score,
            max_attempts=quiz.max_attempts,
            shuffle_questions=quiz.shuffle_questions,
            shuffle_answers=quiz.shuffle_answers,
            show_answer_after_submit=quiz.show_answer_after_submit,
            status=quiz.status,
            questions=questions_out,
            question_count=len(questions_out),
            total_points=total_points
        )


@router.patch("/{quiz_id}", response_model=QuizTeacherDetailResponse)
async def update_quiz(
    quiz_id: uuid.UUID,
    quiz_in: QuizUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    quiz = await db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "QUIZ_NOT_FOUND", "message": "Quiz not found"}}
        )

    # Validate quiz settings
    new_title = quiz_in.title if quiz_in.title is not None else quiz.title
    new_subject_id = quiz_in.subject_id if quiz_in.subject_id is not None else quiz.subject_id
    new_topic_id = quiz_in.topic_id if quiz_in.topic_id is not None else quiz.topic_id
    new_duration = quiz_in.duration_minutes if quiz_in.duration_minutes is not None else quiz.duration_minutes
    new_pass_score = quiz_in.pass_score if quiz_in.pass_score is not None else quiz.pass_score
    new_max_attempts = quiz_in.max_attempts if quiz_in.max_attempts is not None else quiz.max_attempts
    new_status = quiz_in.status if quiz_in.status is not None else quiz.status

    await validate_quiz_settings(
        title=new_title,
        subject_id=new_subject_id,
        topic_id=new_topic_id,
        duration_minutes=new_duration,
        pass_score=new_pass_score,
        max_attempts=new_max_attempts,
        status_val=new_status,
        db=db,
        quiz_id=quiz.id
    )

    update_data = quiz_in.model_dump(exclude_unset=True)
    if "title" in update_data and not update_data.get("slug"):
        base_slug = slugify(update_data["title"])
        slug = base_slug
        counter = 1
        while True:
            existing = await db.execute(
                select(Quiz).where(and_(Quiz.slug == slug, Quiz.id != quiz_id))
            )
            if not existing.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        update_data["slug"] = slug

    for field, val in update_data.items():
        setattr(quiz, field, val)

    await db.commit()
    await db.refresh(quiz)
    return await get_quiz_detail(quiz_id=quiz.id, db=db, current_user=current_user)


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    quiz = await db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "QUIZ_NOT_FOUND", "message": "Quiz not found"}}
        )

    # Bảo vệ dữ liệu lịch sử thi: chặn xóa cứng nếu bài thi đã có sinh viên làm bài
    att_res = await db.execute(
        select(func.count(Attempt.id)).where(Attempt.quiz_id == quiz_id)
    )
    attempt_count = att_res.scalar() or 0
    if attempt_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "QUIZ_HAS_ATTEMPTS",
                    "message": f"Bài thi này đã có {attempt_count} lượt làm bài của học sinh. Để bảo vệ kết quả và lịch sử học tập, không thể xóa cứng bài thi. Vui lòng chuyển trạng thái sang 'Lưu trữ' (ARCHIVED)."
                }
            }
        )

    await db.delete(quiz)
    await db.commit()
    return None


@router.post("/{quiz_id}/questions", response_model=QuestionTeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_and_attach_question(
    quiz_id: uuid.UUID,
    q_in: QuestionCreate,
    order: Optional[int] = None,
    points_override: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    """
    Thực hiện TẠO câu hỏi và GẮN vào đề thi trong cùng một transaction nguyên tử (atomic),
    tránh để lại câu hỏi mồ côi nếu bước gắn vào đề thi xảy ra lỗi.
    """
    quiz = await db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "QUIZ_NOT_FOUND", "message": "Không tìm thấy bài thi"}}
        )

    question = Question(
        **q_in.model_dump(),
        created_by=current_user.id
    )
    db.add(question)
    await db.flush()  # Nhận question.id nhưng chưa commit

    if order is None:
        max_order_res = await db.execute(
            select(func.coalesce(func.max(QuizQuestion.order), -1)).where(QuizQuestion.quiz_id == quiz_id)
        )
        order = max_order_res.scalar() + 1

    qq = QuizQuestion(
        quiz_id=quiz.id,
        question_id=question.id,
        order=order,
        points_override=points_override
    )
    db.add(qq)
    await db.commit()
    await db.refresh(question)

    return QuestionTeacherResponse(
        id=question.id,
        type=question.type,
        title=question.title,
        content=question.content,
        points=points_override if points_override is not None else question.points,
        difficulty=question.difficulty,
        config=question.config or {},
        explanation=question.explanation,
        created_by=question.created_by,
        order=order
    )


@router.post("/{quiz_id}/questions/{question_id}", status_code=status.HTTP_200_OK)
async def add_question_to_quiz(
    quiz_id: uuid.UUID,
    question_id: uuid.UUID,
    order: Optional[int] = None,
    points_override: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    quiz = await db.get(Quiz, quiz_id)
    question = await db.get(Question, question_id)
    if not quiz or not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Quiz or Question not found"}}
        )

    # Check if already linked
    existing = await db.execute(
        select(QuizQuestion).where(
            and_(QuizQuestion.quiz_id == quiz_id, QuizQuestion.question_id == question_id)
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Question already in quiz"}

    if order is None:
        max_order_res = await db.execute(
            select(func.coalesce(func.max(QuizQuestion.order), -1)).where(QuizQuestion.quiz_id == quiz_id)
        )
        order = max_order_res.scalar() + 1

    qq = QuizQuestion(
        quiz_id=quiz_id,
        question_id=question_id,
        order=order,
        points_override=points_override
    )
    db.add(qq)
    await db.commit()
    return {"message": "Question added to quiz successfully", "order": order}


@router.delete("/{quiz_id}/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_question_from_quiz(
    quiz_id: uuid.UUID,
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    # Bảo vệ dữ liệu thi: nếu đề thi đã có sinh viên làm bài thì không được gỡ câu hỏi
    att_res = await db.execute(
        select(func.count(Attempt.id)).where(
            and_(Attempt.quiz_id == quiz_id, Attempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.GRADED]))
        )
    )
    attempt_count = att_res.scalar() or 0
    if attempt_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "QUIZ_HAS_ATTEMPTS",
                    "message": f"Bài thi này đã có {attempt_count} lượt làm bài của học sinh. Để bảo vệ tính nhất quán của kết quả và xem lại bài thi, không thể gỡ câu hỏi khỏi đề thi."
                }
            }
        )

    result = await db.execute(
        select(QuizQuestion).where(
            and_(QuizQuestion.quiz_id == quiz_id, QuizQuestion.question_id == question_id)
        )
    )
    qq = result.scalar_one_or_none()
    if qq:
        await db.delete(qq)
        await db.commit()
    return None


@router.put("/{quiz_id}/questions/reorder", status_code=status.HTTP_200_OK)
async def reorder_quiz_questions(
    quiz_id: uuid.UUID,
    reorder_in: QuizQuestionReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN))
):
    # Bảo vệ thứ tự hiển thị của các bài thi đã có kết quả
    att_res = await db.execute(
        select(func.count(Attempt.id)).where(
            and_(Attempt.quiz_id == quiz_id, Attempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.GRADED]))
        )
    )
    attempt_count = att_res.scalar() or 0
    if attempt_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "QUIZ_HAS_ATTEMPTS",
                    "message": f"Bài thi này đã có {attempt_count} bài nộp của học sinh, không thể thay đổi thứ tự câu hỏi."
                }
            }
        )

    question_ids = reorder_in.question_ids
    for idx, q_id in enumerate(question_ids):
        result = await db.execute(
            select(QuizQuestion).where(
                and_(QuizQuestion.quiz_id == quiz_id, QuizQuestion.question_id == q_id)
            )
        )
        qq = result.scalar_one_or_none()
        if qq:
            qq.order = idx
    await db.commit()
    return {"message": "Questions reordered successfully"}
