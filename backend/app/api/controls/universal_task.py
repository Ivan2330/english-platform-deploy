from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.core.cache import get_cache, set_cache, delete_cache
from app.models.controls.universal_task import UniversalTask
from app.schemas.controls.universal_task import UniversalTaskCreate, UniversalTaskUpdate, UniversalTaskResponse
from app.api.users.auth import current_active_staff
from app.models.users.staff import Staff


router = APIRouter(prefix="/tasks", tags=["Universal_Tasks"])


@router.post("/", response_model=UniversalTaskResponse, status_code=201)
async def create_task(
    task: UniversalTaskCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    """
    Створення нового завдання
    """
    new_task = UniversalTask(**task.model_dump(), created_by=current_user.id)
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    
    cache_key = f"task:{new_task.id}"
    await set_cache(cache_key, UniversalTaskResponse.model_validate(new_task).model_dump(), ttl=3600)

    return new_task


@router.get("/", response_model=List[UniversalTaskResponse])
async def get_task_list(db: AsyncSession = Depends(get_async_session)):
    """
    Отримання списку всіх завдань
    """
    result = await db.execute(select(UniversalTask))
    task_list = result.scalars().all()
    return task_list


@router.get("/{task_id}", response_model=UniversalTaskResponse)
async def get_task(task_id: int, db: AsyncSession = Depends(get_async_session)):
    """
    Отримання завдання за його ID
    """
    cache_key = f"task:{task_id}"
    cached_task = await get_cache(cache_key)
    if cached_task:
        return cached_task
    
    task = await db.get(UniversalTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_data = UniversalTaskResponse.model_validate(task)
    await set_cache(cache_key, task_data, ttl=3600)
    
    return task_data


@router.put("/{task_id}", response_model=UniversalTaskResponse)
async def update_task(task_id: int, updated_task: UniversalTaskUpdate, db: AsyncSession = Depends(get_async_session)):
    """
    Оновлення завдання за його ID
    """
    task = await db.get(UniversalTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for key, value in updated_task.model_dump(exclude_unset=True).items():
        setattr(task, key, value)

    await db.commit()
    await db.refresh(task)

    cache_key = f"task:{task_id}"
    await set_cache(cache_key, UniversalTaskResponse.model_validate(task).model_dump(), ttl=3600)

    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_async_session)):
    """
    Видалення завдання за його ID
    """
    task = await db.get(UniversalTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.delete(task)
    await db.commit()
    
    cache_key = f"task:{task_id}"
    await delete_cache(cache_key)

    return {"message": "Task deleted successfully"}
