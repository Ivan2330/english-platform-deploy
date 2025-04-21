from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.classrooms.classroom import Classroom
from app.models.users.users import User
from app.schemas.classrooms.classroom import ClassroomCreate, ClassroomResponse, ClassroomUpdate
from app.api.users.auth import current_active_user
from app.core.cache import get_cache, set_cache, delete_cache

router = APIRouter(prefix="/classrooms", tags=["Classrooms"])


def is_admin(current_user: User):
    """Перевіряє, чи є користувач адміністратором."""
    if current_user.role != "staff" or current_user.status != "admin":
        raise HTTPException(status_code=403, detail="User is not authorized as admin")

def is_teacher_or_admin(current_user: User):
    if str(current_user.role) != "staff" or str(current_user.status) not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="User doesn't have access")


@router.post("/", response_model=ClassroomResponse)
async def create_classroom(
    classroom: ClassroomCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    new_classroom = Classroom(**classroom.model_dump())
    session.add(new_classroom)
    await session.commit()
    await session.refresh(new_classroom)


    cache_key = f"classroom_{new_classroom.id}"
    await set_cache(cache_key, ClassroomResponse.model_validate(new_classroom).model_dump(), ttl=1800)

    return new_classroom


@router.get("/", response_model=List[ClassroomResponse])
async def classrooms_list(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Отримує список усіх класів без кешу."""

    result = await session.execute(select(Classroom))
    return result.scalars().all()


@router.get("/{classroom_id}", response_model=ClassroomResponse)
async def get_classroom(
    classroom_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Отримання деталей класу."""

    cache_key = f"classroom_{classroom_id}"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    result = await session.execute(select(Classroom).where(Classroom.id == classroom_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    classroom_data = ClassroomResponse.model_validate(classroom).model_dump()
    await set_cache(cache_key, classroom_data, ttl=600)

    return classroom



@router.put("/{classroom_id}", response_model=ClassroomResponse)
async def update_classroom(
    classroom_id: int,
    classroom: ClassroomUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(Classroom).where(Classroom.id == classroom_id))
    existing_classroom = result.scalar_one_or_none()
    if not existing_classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    for key, value in classroom.model_dump(exclude_unset=True).items():
        setattr(existing_classroom, key, value)

    session.add(existing_classroom)
    await session.commit()
    await session.refresh(existing_classroom)


    cache_key = f"classroom_{classroom_id}"
    updated_data = ClassroomResponse.model_validate(existing_classroom).model_dump()
    await set_cache(cache_key, updated_data, ttl=600)

    return existing_classroom


@router.delete("/{classroom_id}")
async def delete_classroom(
    classroom_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(Classroom).where(Classroom.id == classroom_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    await session.delete(classroom)
    await session.commit()


    cache_key = f"classroom_{classroom_id}"
    await delete_cache(cache_key)

    return {"detail": "Classroom deleted successfully."}


@router.patch("/{classroom_id}/set-lesson/{lesson_id}")
async def set_classroom_lesson(
    classroom_id: int, 
    lesson_id: int, 
    session: AsyncSession = Depends(get_async_session),
):

    result = await session.execute(select(Classroom).where(Classroom.id == classroom_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")

    classroom.current_lesson_id = lesson_id
    await session.commit()
    return {"message": "Lesson set successfully"}
