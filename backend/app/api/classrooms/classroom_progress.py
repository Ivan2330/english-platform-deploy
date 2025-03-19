from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.classrooms.classroom_progress import ClassroomProgress
from app.models.users.users import User, Status
from app.schemas.classrooms.classroom_progress import ClassroomProgressResponse, ClassroomProgressUpdate, ClassroomProgressCreate
from app.api.users.auth import current_active_user
from app.core.cache import set_cache, get_cache, delete_cache

router = APIRouter(prefix="/classroom-progress", tags=["Classroom Progress"])

def is_teacher_or_admin(current_user: User):
    """Перевіряє, чи є користувач викладачем або адміністратором."""
    if current_user.role != "staff" or current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="User doesn't have access")


@router.post("/", response_model=ClassroomProgressResponse)
async def create_classroom_progress(
    progress: ClassroomProgressCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    # Перевірка, чи існує користувач
    user_result = await session.execute(select(User).where(User.id == progress.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    new_progress = ClassroomProgress(**progress.model_dump(), user_id=progress.user_id)
    session.add(new_progress)
    await session.commit()
    await session.refresh(new_progress)

    # Видалення кешу для оновлення списку прогресів класу
    await delete_cache(f"classroom_{progress.classroom_id}_progress")
    
    return new_progress


@router.get("/classroom/{classroom_id}", response_model=List[ClassroomProgressResponse])
async def list_classroom_progress(
    classroom_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    cache_key = f"classroom_{classroom_id}_progress"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    result = await session.execute(select(ClassroomProgress).where(ClassroomProgress.classroom_id == classroom_id))
    progress = result.scalars().all()

    # Конвертація у список Pydantic-схем перед кешуванням
    progress_list = [ClassroomProgressResponse.from_orm(p) for p in progress]
    await set_cache(cache_key, progress_list, ttl=600)
    
    return progress_list


@router.put("/{progress_id}", response_model=ClassroomProgressResponse)
async def update_classroom_progress(
    progress_id: int,
    progress: ClassroomProgressUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    result = await session.execute(select(ClassroomProgress).where(ClassroomProgress.id == progress_id))
    existing_progress = result.scalar_one_or_none()
    if not existing_progress:
        raise HTTPException(status_code=404, detail="Classroom progress not found.")

    for key, value in progress.model_dump(exclude_unset=True).items():
        setattr(existing_progress, key, value)

    session.add(existing_progress)
    await session.commit()
    await session.refresh(existing_progress)

    # Видалення кешу, оскільки дані змінилися
    await delete_cache(f"classroom_{existing_progress.classroom_id}_progress")
    
    return existing_progress


@router.delete("/{progress_id}")
async def delete_classroom_progress(
    progress_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    result = await session.execute(select(ClassroomProgress).where(ClassroomProgress.id == progress_id))
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail="Classroom progress not found.")

    await session.delete(progress)
    await session.commit()
    
    # Видалення кешу для всього класу, а не лише одного запису
    await delete_cache(f"classroom_{progress.classroom_id}_progress")
    
    return {"detail": "Classroom progress deleted successfully."}