from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.api.users.auth import current_active_user
from app.models.users.users import User
from app.models.controls.lessons import Lesson
from app.schemas.controls.lessons import LessonCreate, LessonUpdate, LessonResponse
from app.models.controls.universal_task import UniversalTask

router = APIRouter(prefix="/lessons", tags=["Lessons"])

# 📚 Створити урок
@router.post("/", response_model=LessonResponse)
async def create_lesson(
    lesson: LessonCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    new_lesson = Lesson(
        title=lesson.title,
        level=lesson.level,
        created_by=current_user.id  # ✅ Проблема тут, якщо current_user = None
    )
    session.add(new_lesson)
    await session.commit()
    await session.refresh(new_lesson)
    return new_lesson



# 📚 Отримати список уроків
@router.get("/", response_model=List[LessonResponse])
async def get_lesson_list(session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(Lesson))
    lessons = result.scalars().all()
    return lessons


# 📚 Отримати один урок за ID
@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: int, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


# 📚 Оновити урок
@router.put("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: int,
    lesson_data: LessonUpdate,
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    for key, value in lesson_data.dict(exclude_unset=True).items():
        setattr(lesson, key, value)

    await session.commit()
    await session.refresh(lesson)
    return lesson


# 📚 Видалити урок
@router.delete("/{lesson_id}", status_code=204)
async def delete_lesson(lesson_id: int, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Видаляємо урок разом із секціями
    await session.delete(lesson)
    await session.commit()
    return {"message": "Lesson deleted successfully"}


# 📚 Отримати всі секції уроку
@router.get("/{lesson_id}/tasks/")
async def get_lesson_tasks(lesson_id: int, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    result_tasks = await session.execute(select(UniversalTask).where(UniversalTask.lesson_id == lesson_id))
    tasks = result_tasks.scalars().all()

    return tasks
