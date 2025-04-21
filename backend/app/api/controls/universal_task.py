from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.core.cache import get_cache, set_cache, delete_cache
from app.models.controls.universal_task import UniversalTask
from app.schemas.controls.universal_task import UniversalTaskCreate, UniversalTaskUpdate, UniversalTaskResponse
from app.api.users.auth import current_active_user
from app.models.users.users import User, Status

router = APIRouter(prefix="/tasks", tags=["Universal_Tasks"])

# ✅ Функція перевірки доступу
def is_admin_or_teacher(current_user: User):
    """Дозволяє доступ лише адміністраторам та викладачам"""
    if str(current_user.role) != "staff" or str(current_user.status) not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="User is not authorized")

# 🔹 Створення завдання з кешем
@router.post("/", response_model=UniversalTaskResponse, status_code=201)
async def create_task(
    task: UniversalTaskCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin_or_teacher(current_user)

    new_task = UniversalTask(
        lesson_id=task.lesson_id,
        control_type=task.control_type,
        task_type=task.task_type,
        title=task.title,
        description=task.description,
        content=task.content,
        media_url=task.media_url,
        topic=task.topic,
        word_list=task.word_list,
        visibility=task.visibility,
        created_by=current_user.id
    )
    
    session.add(new_task)
    await session.commit()
    await session.refresh(new_task)

    cache_key = f"task:{new_task.id}"
    task_response = UniversalTaskResponse.model_validate(new_task.__dict__)
    await set_cache(cache_key, task_response.model_dump(), ttl=3600)

    return task_response


# 🔹 Отримання списку всіх завдань
@router.get("/", response_model=List[UniversalTaskResponse])
async def get_task_list(session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(UniversalTask))
    task_list = result.scalars().all()
    return [UniversalTaskResponse.model_validate(task.__dict__) for task in task_list]


# 🔹 Отримання завдання за ID з кешем
@router.get("/{task_id}", response_model=UniversalTaskResponse)
async def get_task(task_id: int, session: AsyncSession = Depends(get_async_session)):
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
        "lesson_id": task.lesson_id,
        "control_type": task.control_type,
        "task_type": task.task_type,
        "title": task.title,
        "description": task.description,
        "content": task.content,
        "media_url": task.media_url,
        "topic": task.topic,
        "word_list": task.word_list,
        "visibility": task.visibility,
        "created_by": task.created_by,
        "classroom_id": task.classroom_id,
        "is_active": task.is_active,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }
    
    # ✅ Кешуємо отримані дані
    try:
        await set_cache(cache_key, task_data, ttl=3600)
    except Exception as e:
        print(f"⚠️ Cache error: {e}")

    return UniversalTaskResponse(**task_data)


# 🔹 Оновлення завдання за ID з кешем
@router.put("/{task_id}", response_model=UniversalTaskResponse)
async def update_task(
    task_id: int,
    updated_task: UniversalTaskUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin_or_teacher(current_user)

    result = await session.execute(select(UniversalTask).where(UniversalTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for key, value in updated_task.dict(exclude_unset=True).items():
        setattr(task, key, value)

    await session.commit()
    await session.refresh(task)

    cache_key = f"task:{task_id}"
    task_response = UniversalTaskResponse.model_validate(task.__dict__)
    await set_cache(cache_key, task_response.model_dump(), ttl=3600)

    return task_response


# 🔹 Видалення завдання за ID з кешем
@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin_or_teacher(current_user)

    result = await session.execute(select(UniversalTask).where(UniversalTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await session.delete(task)
    await session.commit()

    # ✅ Видаляємо кеш
    cache_key = f"task:{task_id}"
    await delete_cache(cache_key)

    return {"message": "Task deleted successfully"}


# 🔹 Отримати вільні завдання (lesson_id == None)
@router.get("/free/", response_model=List[UniversalTaskResponse])
async def get_free_tasks(session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(UniversalTask).where(UniversalTask.lesson_id == None))
    free_tasks = result.scalars().all()
    return [UniversalTaskResponse.model_validate(task.__dict__) for task in free_tasks]


# 🔹 Фільтрувати вільні завдання за темою
@router.get("/free/filter/", response_model=List[UniversalTaskResponse])
async def get_filtered_free_tasks(topic: str, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(UniversalTask).where(UniversalTask.lesson_id == None, UniversalTask.topic == topic))
    free_tasks = result.scalars().all()
    return [UniversalTaskResponse.model_validate(task.__dict__) for task in free_tasks]
