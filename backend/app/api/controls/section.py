from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_async_session
from app.api.users.auth import current_active_user
from app.api.deps import require_staff
from app.models.users.users import User
from app.models.controls.lessons import Lesson
from app.models.controls.section import Section
from app.schemas.controls.section import SectionCreate, SectionUpdate, SectionResponse

router = APIRouter(prefix="/sections", tags=["Sections"])


@router.post("/", response_model=SectionResponse)
async def create_section(
    data: SectionCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_staff),
):
    lesson = (
        await session.execute(select(Lesson).where(Lesson.id == data.lesson_id))
    ).scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    section = Section(**data.model_dump())
    session.add(section)
    await session.commit()
    await session.refresh(section)
    return section


@router.get("/lesson/{lesson_id}", response_model=List[SectionResponse])
async def list_sections(
    lesson_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Section).where(Section.lesson_id == lesson_id).order_by(Section.order)
    )
    return result.scalars().all()


@router.put("/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: int,
    data: SectionUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_staff),
):
    section = (
        await session.execute(select(Section).where(Section.id == section_id))
    ).scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(section, key, value)

    await session.commit()
    await session.refresh(section)
    return section


@router.delete("/{section_id}", status_code=204)
async def delete_section(
    section_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_staff),
):
    section = (
        await session.execute(select(Section).where(Section.id == section_id))
    ).scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    await session.delete(section)
    await session.commit()