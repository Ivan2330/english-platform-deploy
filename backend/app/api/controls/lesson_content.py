from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.api.users.auth import current_active_user
from app.models.users.users import User
from app.models.controls.lessons import Lesson
from app.models.controls.section import Section
from app.models.controls.block import Block
from app.schemas.controls.lesson_full import LessonFullResponse, SectionFullResponse
from app.api.controls.block import block_to_response  # переюзовуємо серіалізацію блоку

router = APIRouter(prefix="/lesson-content", tags=["Lesson Content"])


@router.get("/{lesson_id}/full", response_model=LessonFullResponse)
async def get_full_lesson(
    lesson_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Повертає урок із секціями, блоками й питаннями (для сторінки заняття)."""
    result = await session.execute(
        select(Lesson)
        .where(Lesson.id == lesson_id)
        .options(
            selectinload(Lesson.lesson_sections)
            .selectinload(Section.blocks)
            .selectinload(Block.questions)
        )
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    sections = sorted(lesson.lesson_sections, key=lambda s: s.order)
    section_responses = []
    for s in sections:
        blocks = sorted(s.blocks, key=lambda b: b.order)
        section_responses.append(
            SectionFullResponse(
                id=s.id,
                lesson_id=s.lesson_id,
                title=s.title,
                kind=s.kind,
                icon=s.icon,
                order=s.order,
                blocks=[block_to_response(b) for b in blocks],
            )
        )

    return LessonFullResponse(
        id=lesson.id,
        title=lesson.title,
        level=lesson.level,
        lesson_type=lesson.lesson_type,
        sections=section_responses,
    )