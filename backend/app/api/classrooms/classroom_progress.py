from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.classrooms.classroom_progress import ClassroomProgress
from app.models.users.staff import Staff, Status
from app.models.users.students import Student
from app.schemas.classrooms.classroom_progress import ClassroomProgressResponse, ClassroomProgressUpdate, ClassroomProgressCreate
from app.api.users.auth import current_active_staff
from app.core.cache import set_cache, get_cache

router = APIRouter(prefix="/classroom-progress", tags=["Classroom Progress"])

def is_teacher_or_admin(current_user: Staff):
    if current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="User doesn't have access")

# Create classroom progress (teacher or admin)
@router.post("/", response_model=ClassroomProgressResponse)
async def create_classroom_progress(
    progress: ClassroomProgressCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_teacher_or_admin(current_user)

    new_progress = ClassroomProgress(**progress.dict())
    session.add(new_progress)
    await session.commit()
    await session.refresh(new_progress)
    return new_progress

# Get all progress for a classroom
@router.get("/classroom/{classroom_id}", response_model=List[ClassroomProgressResponse])
async def list_classroom_progress(
    classroom_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    cache_key = f"classroom_{classroom_id}_progress"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    result = await session.execute(select(ClassroomProgress).where(ClassroomProgress.classroom_id == classroom_id))
    progress = result.scalars().all()
    await set_cache(cache_key, progress, ttl=300)
    return progress

# Update classroom progress (teacher or admin)
@router.put("/{progress_id}", response_model=ClassroomProgressResponse)
async def update_classroom_progress(
    progress_id: int,
    progress: ClassroomProgressUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
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
    return existing_progress

# Delete classroom progress (teacher or admin)
@router.delete("/{progress_id}")
async def delete_classroom_progress(
    progress_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_teacher_or_admin(current_user)

    result = await session.execute(select(ClassroomProgress).where(ClassroomProgress.id == progress_id))
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail="Classroom progress not found.")

    await session.delete(progress)
    await session.commit()
    return {"detail": "Classroom progress deleted successfully."}
