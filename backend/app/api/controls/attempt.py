from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.core.database import get_async_session
from app.api.users.auth import current_active_user
from app.models.users.users import User
from app.models.controls.lessons import Lesson
from app.models.controls.block import Block
from app.models.controls.questions import Question
from app.models.controls.lesson_attempt import LessonAttempt
from app.models.controls.answer import Answer
from app.schemas.controls.attempt import (
    AttemptStart,
    AttemptResponse,
    AttemptFullResponse,
    AnswerSubmit,
    AnswerResponse,
    AnswerGrade,
    AttemptGrade,
    MyAttemptItem,
)

router = APIRouter(prefix="/attempts", tags=["Attempts"])

# типи, де можлива автоматична (бот) перевірка
AUTO_TYPES = {"multiple_choice", "true_false", "gap_fill", "short_answer"}


def _norm(s):
    return (s or "").strip().lower()


def bot_check(student_answer, correct_answer, task_type):
    """True/False для обʼєктивних типів, None — якщо автоперевірка неможлива."""
    if not correct_answer or task_type not in AUTO_TYPES:
        return None
    return _norm(student_answer) == _norm(correct_answer)


def is_staff(user: User) -> bool:
    # за потреби підправ перелік ролей під свою БД
    return getattr(user, "is_superuser", False) or getattr(user, "role", None) in (
        "teacher",
        "admin",
        "staff",
    )


async def _load_attempt_full(session: AsyncSession, attempt_id: int) -> LessonAttempt | None:
    result = await session.execute(
        select(LessonAttempt)
        .where(LessonAttempt.id == attempt_id)
        .options(selectinload(LessonAttempt.answers))
    )
    return result.scalar_one_or_none()


# ---------- спроба ----------
@router.post("/start", response_model=AttemptResponse)
async def start_attempt(
    data: AttemptStart,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    lesson = (
        await session.execute(select(Lesson).where(Lesson.id == data.lesson_id))
    ).scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # якщо вже є незавершена спроба — повертаємо її
    existing = (
        await session.execute(
            select(LessonAttempt).where(
                LessonAttempt.lesson_id == data.lesson_id,
                LessonAttempt.student_id == current_user.id,
                LessonAttempt.status == "in_progress",
            )
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    attempt = LessonAttempt(
        lesson_id=data.lesson_id,
        student_id=current_user.id,
        status="in_progress",
    )
    session.add(attempt)
    await session.commit()
    await session.refresh(attempt)
    return attempt


@router.get("/my", response_model=list[MyAttemptItem])
async def get_my_attempts(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Усі спроби поточного учня (для сторінки «Мої результати»)."""
    result = await session.execute(
        select(LessonAttempt, Lesson.title)
        .join(Lesson, Lesson.id == LessonAttempt.lesson_id)
        .where(LessonAttempt.student_id == current_user.id)
        .order_by(LessonAttempt.started_at.desc())
    )
    items = []
    for attempt, title in result.all():
        items.append(
            MyAttemptItem(
                id=attempt.id,
                lesson_id=attempt.lesson_id,
                lesson_title=title,
                status=attempt.status,
                overall_grade=attempt.overall_grade,
                started_at=attempt.started_at,
                completed_at=attempt.completed_at,
            )
        )
    return items


@router.get("/{attempt_id}", response_model=AttemptFullResponse)
async def get_attempt(
    attempt_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    attempt = await _load_attempt_full(session, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    # учень може дивитись лише свою спробу; staff — будь-яку
    if not is_staff(current_user) and attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return attempt


@router.get("/lesson/{lesson_id}/me", response_model=AttemptFullResponse)
async def get_my_attempt(
    lesson_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(LessonAttempt)
        .where(
            LessonAttempt.lesson_id == lesson_id,
            LessonAttempt.student_id == current_user.id,
        )
        .options(selectinload(LessonAttempt.answers))
        .order_by(LessonAttempt.started_at.desc())
    )
    attempt = result.scalars().first()
    if not attempt:
        raise HTTPException(status_code=404, detail="No attempt yet")
    return attempt


@router.get("/lesson/{lesson_id}", response_model=list[AttemptResponse])
async def get_lesson_attempts(
    lesson_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Список усіх спроб уроку (для вчителя/адміна)."""
    if not is_staff(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")
    result = await session.execute(
        select(LessonAttempt)
        .where(LessonAttempt.lesson_id == lesson_id)
        .order_by(LessonAttempt.started_at.desc())
    )
    return result.scalars().all()


# ---------- відповіді ----------
@router.post("/{attempt_id}/answer", response_model=AnswerResponse)
async def submit_answer(
    attempt_id: int,
    data: AnswerSubmit,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    attempt = (
        await session.execute(select(LessonAttempt).where(LessonAttempt.id == attempt_id))
    ).scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    block = (
        await session.execute(select(Block).where(Block.id == data.block_id))
    ).scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    correct = None
    if data.question_id:
        question = (
            await session.execute(select(Question).where(Question.id == data.question_id))
        ).scalar_one_or_none()
        correct = question.correct_answer if question else None

    is_correct = bot_check(data.student_answer, correct, block.task_type)
    bot_score = None if is_correct is None else (1.0 if is_correct else 0.0)

    # upsert: одна відповідь на (attempt, block, question)
    q = select(Answer).where(
        Answer.attempt_id == attempt_id, Answer.block_id == data.block_id
    )
    q = q.where(Answer.question_id.is_(None) if data.question_id is None else Answer.question_id == data.question_id)
    answer = (await session.execute(q)).scalar_one_or_none()

    if answer:
        answer.student_answer = data.student_answer
        answer.is_correct = is_correct
        answer.bot_score = bot_score
    else:
        answer = Answer(
            attempt_id=attempt_id,
            block_id=data.block_id,
            question_id=data.question_id,
            student_answer=data.student_answer,
            is_correct=is_correct,
            bot_score=bot_score,
        )
        session.add(answer)

    await session.commit()
    await session.refresh(answer)
    return answer


@router.post("/{attempt_id}/complete", response_model=AttemptResponse)
async def complete_attempt(
    attempt_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    attempt = (
        await session.execute(select(LessonAttempt).where(LessonAttempt.id == attempt_id))
    ).scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    attempt.status = "completed"
    attempt.completed_at = datetime.utcnow()
    await session.commit()
    await session.refresh(attempt)
    return attempt


# ---------- оцінювання (вчитель) ----------
@router.put("/answer/{answer_id}/grade", response_model=AnswerResponse)
async def grade_answer(
    answer_id: int,
    data: AnswerGrade,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    if not is_staff(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    answer = (
        await session.execute(select(Answer).where(Answer.id == answer_id))
    ).scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(answer, key, value)
    await session.commit()
    await session.refresh(answer)
    return answer


@router.put("/{attempt_id}/grade", response_model=AttemptResponse)
async def grade_attempt(
    attempt_id: int,
    data: AttemptGrade,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    if not is_staff(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    attempt = (
        await session.execute(select(LessonAttempt).where(LessonAttempt.id == attempt_id))
    ).scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(attempt, key, value)
    await session.commit()
    await session.refresh(attempt)
    return attempt