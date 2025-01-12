from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_async_session
from app.core.cache import get_cache, set_cache, delete_cache
from app.models.controls.universal_task import UniversalTask
from app.schemas.controls.universal_task import UniversalTaskCreate, UniversalTaskUpdate, UniversalTaskResponse

router = APIRouter(prefix="/tasks", tags=["Universal_Tasks"])


@router.post("/", response_model=UniversalTaskResponse, status_code=201)
async def create_task(task: UniversalTaskCreate ,db: AsyncSession = Depends(get_async_session)):
    
    new_task = UniversalTask(**task.model_dump())
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    
    cache_key = f"task:{new_task.id}"
    await set_cache(cache_key, UniversalTaskResponse.model_validate(new_task).model_dump(), ttl=3600)

    return new_task


@router.get("/{task_id}", response_model=UniversalTaskResponse)
async def get_task(task_id: int, db: AsyncSession = Depends(get_async_session)):
    
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
    
    task = await db.get(UniversalTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.delete(task)
    await db.commit()
    
    cache_key = f"task:{task_id}"
    await delete_cache(cache_key)

    return {"message": "Task deleted"}