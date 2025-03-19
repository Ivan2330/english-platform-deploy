from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.core.cache import get_cache, set_cache, delete_cache
from app.models.controls.universal_task import UniversalTask
from app.schemas.controls.universal_task import UniversalTaskCreate, UniversalTaskUpdate, UniversalTaskResponse
from app.api.users.auth import current_active_user
from app.models.users.users import User, Status
import json

router = APIRouter(prefix="/tasks", tags=["Universal_Tasks"])

# ✅ Оновлена функція перевірки доступу
def is_admin_or_teacher(current_user: User):
    """Дозволяє доступ лише адміністраторам та викладачам"""
    if str(current_user.role) != "staff" or str(current_user.status) not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="User is not authorized")

# 🔹 Створення завдання
@router.post("/", response_model=UniversalTaskResponse, status_code=201)
async def create_task(
    task: UniversalTaskCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin_or_teacher(current_user)

    new_task = UniversalTask(
        control_type=task.control_type,  # ✅ Додаємо обов'язкове поле
        task_type=task.task_type,  # ✅ Додаємо обов'язкове поле
        title=task.title,
        description=task.description,
        correct_answer=task.correct_answer,
        created_by=current_user.id
    )
    new_task.set_options(task.options)  # ✅ Перетворення `dict` у JSON перед збереженням
    
    session.add(new_task)
    await session.commit()
    await session.refresh(new_task)

    task_response = UniversalTaskResponse.model_validate({
        **new_task.__dict__,
        "options": new_task.get_options()
    })
    
    cache_key = f"task:{new_task.id}"
    await set_cache(cache_key, task_response.model_dump(), ttl=3600)

    return task_response

# 🔹 Отримання списку всіх завдань
@router.get("/", response_model=List[UniversalTaskResponse])
async def get_task_list(session: AsyncSession = Depends(get_async_session)):
    """
    Отримання списку всіх завдань
    """
    result = await session.execute(select(UniversalTask))
    task_list = result.scalars().all()
    return [
        UniversalTaskResponse.model_validate({
            **task.__dict__,
            "options": task.get_options()
        }) for task in task_list
    ]

@router.get("/{task_id}", response_model=UniversalTaskResponse)
async def get_task(task_id: int, session: AsyncSession = Depends(get_async_session)):
    """
    Отримання завдання за його ID
    """
    cache_key = f"task:{task_id}"
    
    # ✅ Спочатку перевіряємо кеш
    cached_task = await get_cache(cache_key)
    if cached_task:
        return UniversalTaskResponse(**cached_task)

    result = await session.execute(select(UniversalTask).where(UniversalTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task_data = {
        "id": task.id,
        "control_type": task.control_type,
        "task_type": task.task_type,
        "title": task.title,
        "description": task.description,
        "content": task.content,
        "media_url": task.media_url,
        "topic": task.topic,
        "word_list": task.word_list,
        "correct_answer": task.correct_answer,
        "explanation": task.explanation,
        "options": task.get_options(),
        "visibility": task.visibility,
        "level": task.level,
        "created_by": task.created_by,
        "classroom_id": task.classroom_id,
        "is_active": task.is_active,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat()
    }
    
    try:
        await set_cache(cache_key, task_data, ttl=3600)  # ✅ Обгорнуто в try-except
    except Exception as e:
        print(f"⚠️ Cache error: {e}")  # Лог, без аварійного завершення

    return UniversalTaskResponse(**task_data)


# 🔹 Оновлення завдання за його ID
@router.put("/{task_id}", response_model=UniversalTaskResponse)
async def update_task(
    task_id: int, 
    updated_task: UniversalTaskUpdate, 
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Оновлення завдання за його ID (тільки для адміністратора або викладача)
    """
    is_admin_or_teacher(current_user)

    result = await session.execute(select(UniversalTask).where(UniversalTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for key, value in updated_task.model_dump(exclude_unset=True).items():
        if key == "options":
            task.set_options(value)  # ✅ Оновлюємо `options`, щоб він зберігався у JSON
        else:
            setattr(task, key, value)

    await session.commit()
    await session.refresh(task)

    cache_key = f"task:{task_id}"
    await set_cache(cache_key, UniversalTaskResponse.model_validate({
        **task.__dict__,
        "options": task.get_options()
    }).model_dump(), ttl=3600)

    return UniversalTaskResponse.model_validate({
        **task.__dict__,
        "options": task.get_options()
    })

# 🔹 Видалення завдання за його ID
@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int, 
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Видалення завдання за його ID (тільки для адміністратора)
    """
    if str(current_user.role) != "staff" or str(current_user.status) != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete tasks")

    result = await session.execute(select(UniversalTask).where(UniversalTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await session.delete(task)
    await session.commit()
    
    cache_key = f"task:{task_id}"
    await delete_cache(cache_key)

    return {"message": "Task deleted successfully"}
