from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.controls.task_result import TaskResult
from app.models.controls.universal_task import UniversalTask, TaskType
from app.schemas.controls.task_result import TaskResultCreate, TaskResultResponse, TaskResultUpdate
from app.api.users.auth import current_active_user
from app.models.users.users import User, Status
from app.core.cache import get_cache, set_cache

router = APIRouter(prefix="/task-results", tags=["Task Results"])


def is_admin(current_user: User):
    if str(current_user.role) != "staff" or str(current_user.status) != "admin":
        raise HTTPException(status_code=403, detail="User is not authorized as admin")


def is_teacher_or_admin(current_user: User):
    if str(current_user.role) != "staff" or str(current_user.status) not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="User doesn't have access")


# 🔹 Автоматична перевірка завдань
def check_answer(task: UniversalTask, student_answer: str) -> (bool, float):
    if task.task_type == TaskType.TRUE_FALSE:
        return student_answer.lower() == task.correct_answer.lower(), 1.0
    elif task.task_type == TaskType.MULTIPLE_CHOICE:
        return student_answer in task.correct_answer.split(","), 1.0
    elif task.task_type == TaskType.GAP_FILL:
        return student_answer.strip() == task.correct_answer.strip(), 1.0
    else:
        # Для OPEN_TEXT і завдань, які оцінює викладач вручну
        return None, 0.0


# 🔹 Перевірка завдання та збереження результату
@router.post("/check", response_model=TaskResultResponse)
async def check_task_result(
    task_result: TaskResultCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Перевірка завдання (тільки для студентів).
    """
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit tasks.")

    result = await session.execute(select(UniversalTask).where(UniversalTask.id == task_result.task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    # Автоматична перевірка відповіді
    is_correct, score = check_answer(task, task_result.student_answer)

    new_task_result = TaskResult(
        task_id=task_result.task_id,
        student_id=current_user.id,  # ✅ Використовуємо `student_id`
        student_answer=task_result.student_answer,
        is_correct=is_correct,
        score=score if is_correct is not None else 0.0,
    )

    session.add(new_task_result)
    await session.commit()
    await session.refresh(new_task_result)

    return TaskResultResponse.model_validate(new_task_result.__dict__)


# 🔹 Отримання всіх результатів (тільки для викладачів)
@router.get("/", response_model=List[TaskResultResponse])
async def get_all_task_results(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)  # ✅ Використовуємо правильну функцію доступу

    result = await session.execute(select(TaskResult))
    task_results = result.scalars().all()
    return [TaskResultResponse.model_validate(t.__dict__) for t in task_results]


# 🔹 Отримання результатів студента
@router.get("/{student_id}", response_model=List[TaskResultResponse])
async def get_student_task_results(
    student_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Отримання всіх результатів конкретного студента (тільки для студента або викладачів).
    """
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="You can only view your own task results.")

    is_teacher_or_admin(current_user)  # ✅ Використовуємо правильну функцію доступу

    cache_key = f"task_results:{student_id}"
    cached_results = await get_cache(cache_key)
    if cached_results:
        return cached_results

    result = await session.execute(select(TaskResult).where(TaskResult.student_id == student_id))
    task_results = result.scalars().all()

    response = [TaskResultResponse.model_validate(t.__dict__) for t in task_results]

    try:
        await set_cache(cache_key, response, ttl=1800)
    except Exception as e:
        print(f"⚠️ Cache error: {e}")  # Логування, без аварійного завершення

    return response


# 🔹 Вручну оновити оцінку (тільки для викладачів або адмінів)
@router.put("/{task_result_id}/manual", response_model=TaskResultResponse)
async def manual_update_task_result(
    task_result_id: int,
    update_data: TaskResultUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Вручну оновити оцінку завдання (лише для викладачів або адмінів).
    """
    is_teacher_or_admin(current_user)  # ✅ Використовуємо правильну функцію доступу

    result = await session.execute(select(TaskResult).where(TaskResult.id == task_result_id))
    existing_task_result = result.scalar_one_or_none()
    if not existing_task_result:
        raise HTTPException(status_code=404, detail="Task result not found.")

    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(existing_task_result, key, value)

    await session.commit()
    await session.refresh(existing_task_result)

    return TaskResultResponse.model_validate(existing_task_result.__dict__)
