from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.controls.task_result import TaskResult
from app.models.controls.universal_task import UniversalTask, TaskType
from app.schemas.controls.task_result import TaskResultCreate, TaskResultResponse
from app.api.users.auth import current_active_staff
from app.models.users.staff import Staff, Status
from app.models.users.students import Student

router = APIRouter(prefix="/task-results", tags=["Task Results"])

def is_admin(current_user: Staff):
    if current_user.status != Status.ADMIN:
        raise HTTPException(status_code=403, detail="User is not authorized as admin")

def is_teacher_or_admin(current_user: Staff):
    if current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="User doesn't have access")

# Automated task checking logic
def check_answer(task: UniversalTask, student_answer: str) -> (bool, float):
    if task.task_type == TaskType.TRUE_FALSE:
        return student_answer.lower() == task.correct_answer.lower(), 1.0
    elif task.task_type == TaskType.MULTIPLE_CHOICE:
        return student_answer in task.correct_answer.split(","), 1.0
    elif task.task_type == TaskType.GAP_FILL:
        return student_answer.strip() == task.correct_answer.strip(), 1.0
    else:
        # For OPEN_TEXT and other manual checks
        return None, 0.0

# Check task and save result
@router.post("/check", response_model=TaskResultResponse)
async def check_task_result(
    task_result: TaskResultCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    # Fetch the task
    task = await session.execute(select(UniversalTask).where(UniversalTask.id == task_result.task_id))
    task = task.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    # Perform automated checking if applicable
    is_correct, score = check_answer(task, task_result.student_answer)

    new_task_result = TaskResult(
        task_id=task_result.task_id,
        student_id=task_result.student_id,
        student_answer=task_result.student_answer,
        is_correct=is_correct,
        score=score if is_correct is not None else 0.0,
    )
    session.add(new_task_result)
    await session.commit()
    await session.refresh(new_task_result)
    return new_task_result

# Manually update a task result (manual grading)
@router.put("/{task_result_id}/manual", response_model=TaskResultResponse)
async def manual_update_task_result(
    task_result_id: int,
    manual_score: float,
    is_correct: bool,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_teacher_or_admin(current_user)

    result = await session.execute(select(TaskResult).where(TaskResult.id == task_result_id))
    existing_task_result = result.scalar_one_or_none()
    if not existing_task_result:
        raise HTTPException(status_code=404, detail="Task result not found.")

    # Update score and correctness
    existing_task_result.score = manual_score
    existing_task_result.is_correct = is_correct

    session.add(existing_task_result)
    await session.commit()
    await session.refresh(existing_task_result)
    return existing_task_result
