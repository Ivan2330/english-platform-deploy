from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.classrooms.classroom_task import ClassroomTask
from app.models.controls.universal_task import UniversalTask
from app.models.users.staff import Staff, Status
from app.schemas.classrooms.classroom_task import ClassroomTaskCreate, ClassroomTaskResponse, ClassroomTaskUpdate
from app.api.users.auth import current_active_staff
from app.core.cache import set_cache, get_cache

router = APIRouter(prefix="/classroom-tasks", tags=["Classroom Tasks"])

def is_teacher_or_admin(current_user: Staff):
    if current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="User doesn't have access")

# Assign a task to a classroom (teacher or admin)
@router.post("/", response_model=ClassroomTaskResponse)
async def assign_task_to_classroom(
    classroom_task: ClassroomTaskCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_teacher_or_admin(current_user)

    # Verify the task exists
    task = await session.execute(select(UniversalTask).where(UniversalTask.id == classroom_task.task_id))
    task = task.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    new_classroom_task = ClassroomTask(**classroom_task.model_dump())
    session.add(new_classroom_task)
    await session.commit()
    await session.refresh(new_classroom_task)
    return new_classroom_task

# Get tasks assigned to a classroom
@router.get("/classroom/{classroom_id}", response_model=List[ClassroomTaskResponse])
async def list_classroom_tasks(
    classroom_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    cache_key = f"classroom_{classroom_id}_tasks"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    result = await session.execute(select(ClassroomTask).where(ClassroomTask.classroom_id == classroom_id))
    tasks = result.scalars().all()
    await set_cache(cache_key, tasks, ttl=300)
    return tasks

# Update a classroom task assignment (teacher or admin)
@router.put("/{classroom_task_id}", response_model=ClassroomTaskResponse)
async def update_classroom_task(
    classroom_task_id: int,
    classroom_task: ClassroomTaskUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_teacher_or_admin(current_user)

    result = await session.execute(select(ClassroomTask).where(ClassroomTask.id == classroom_task_id))
    existing_classroom_task = result.scalar_one_or_none()
    if not existing_classroom_task:
        raise HTTPException(status_code=404, detail="Classroom task not found.")

    for key, value in classroom_task.dict(exclude_unset=True).items():
        setattr(existing_classroom_task, key, value)

    session.add(existing_classroom_task)
    await session.commit()
    await session.refresh(existing_classroom_task)
    return existing_classroom_task

# Delete a classroom task assignment (teacher or admin)
@router.delete("/{classroom_task_id}")
async def delete_classroom_task(
    classroom_task_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_teacher_or_admin(current_user)

    result = await session.execute(select(ClassroomTask).where(ClassroomTask.id == classroom_task_id))
    classroom_task = result.scalar_one_or_none()
    if not classroom_task:
        raise HTTPException(status_code=404, detail="Classroom task not found.")

    await session.delete(classroom_task)
    await session.commit()
    return {"detail": "Classroom task deleted successfully."}
