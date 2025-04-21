from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.api.users.auth import current_active_user
from app.core.database import get_async_session
from app.models.controls.task_result import TaskResult
from app.models.controls.questions import Question
from app.models.controls.universal_task import UniversalTask
from app.schemas.controls.task_result import TaskResultCreate, TaskResultUpdate, TaskResultResponse
from app.models.users.users import User
from datetime import datetime

router = APIRouter(prefix="/results", tags=["Task Results"])

# 🎯 Автоматична перевірка завдання
def check_answer(task_type: str, student_answer: str, correct_answer: str | None) -> (bool | None, float):
    if task_type == "true_false":
        return student_answer.lower() == correct_answer.lower(), 1.0
    elif task_type == "multiple_choice":
        return student_answer in correct_answer.split(","), 1.0
    elif task_type == "gap_fill":
        return student_answer.strip() == correct_answer.strip(), 1.0
    elif task_type == "open_text":
        return None, 0.0  # not manual check
    return None, 0.0


# 📊 Перевірити тест і зберегти результат
@router.post("/tasks/{task_id}/check/", response_model=List[TaskResultResponse])
async def check_task_results(
    task_id: int,
    answers: dict[int, str],
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(select(UniversalTask).where(UniversalTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task_results = []
    for question_id, student_answer in answers.items():
        result_question = await session.execute(select(Question).where(Question.id == question_id))
        question = result_question.scalar_one_or_none()

        if not question:
            raise HTTPException(status_code=404, detail=f"Question {question_id} not found")

        # Перевіряємо відповідь
        is_correct, score = check_answer(task.task_type, student_answer, question.correct_answer)

        new_result = TaskResult(
            task_id=task_id,
            student_id=current_user.id,
            question_id=question_id,
            student_answer=student_answer,
            is_correct=is_correct,
            score=score,
            completed_at=datetime.utcnow()
        )
        session.add(new_result)
        await session.commit()
        await session.refresh(new_result)
        task_results.append(new_result)

    return task_results


# 📊 Оновити результат вручну
@router.put("/{result_id}/manual/", response_model=TaskResultResponse)
async def update_result_manually(
    result_id: int,
    result_data: TaskResultUpdate,
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(select(TaskResult).where(TaskResult.id == result_id))
    task_result = result.scalar_one_or_none()
    if not task_result:
        raise HTTPException(status_code=404, detail="Task result not found")

    for key, value in result_data.model_dump(exclude_unset=True).items():
        setattr(task_result, key, value)

    await session.commit()
    await session.refresh(task_result)
    return task_result


# 📊 Отримати всі результати для тесту
@router.get("/tasks/{task_id}/results/", response_model=List[TaskResultResponse])
async def get_all_task_results(task_id: int, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(TaskResult).where(TaskResult.task_id == task_id))
    task_results = result.scalars().all()
    return task_results


# 📊 Отримати результати студента
@router.get("/tasks/{task_id}/results/{user_id}", response_model=List[TaskResultResponse])
async def get_student_task_results(
    task_id: int,
    user_id: int,
    session: AsyncSession = Depends(get_async_session)
):

    result = await session.execute(select(TaskResult).where(TaskResult.task_id == task_id, TaskResult.student_id == user_id))
    task_results = result.scalars().all()
    return task_results


# 📊 Отримати конкретний результат
@router.get("/{result_id}/", response_model=TaskResultResponse)
async def get_task_result(result_id: int, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(TaskResult).where(TaskResult.id == result_id))
    task_result = result.scalar_one_or_none()
    if not task_result:
        raise HTTPException(status_code=404, detail="Task result not found")
    return task_result


# 📊 Видалити результат
@router.delete("/{result_id}/", status_code=204)
async def delete_task_result(result_id: int, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(TaskResult).where(TaskResult.id == result_id))
    task_result = result.scalar_one_or_none()
    if not task_result:
        raise HTTPException(status_code=404, detail="Task result not found")

    await session.delete(task_result)
    await session.commit()
    return {"message": "Task result deleted successfully"}
