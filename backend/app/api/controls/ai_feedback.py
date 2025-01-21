from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models.controls.task_result import TaskResult
from app.models.controls.ai_feedback import AIFeedback
from app.schemas.controls.ai_feedback import AIFeedbackResponse
from app.utils.openai import generate_feedback
from app.core.cache import get_cache, set_cache

router = APIRouter(prefix="/tasks/feedback", tags=["Task Feedback"])


@router.post("/results/{task_result_id}", response_model=AIFeedbackResponse)
async def create_feedback(
    task_result_id: int,
    db: AsyncSession = Depends(get_async_session),
):
    """
    Генерація фідбеку для TaskResult із використанням OpenAI.
    """
    # Перевірка TaskResult
    task_result = await db.get(TaskResult, task_result_id)
    if not task_result:
        raise HTTPException(status_code=404, detail="TaskResult not found")

    # Перевірка кешу
    cache_key = f"feedback:{task_result_id}"
    cached_feedback = await get_cache(cache_key)
    if cached_feedback:
        return cached_feedback

    # Генерація фідбеку через OpenAI
    feedback_data = await generate_feedback(
        task_type=task_result.task.task_type.name,
        student_answer=task_result.student_answer,
        correct_answer=task_result.task.correct_answer,
        all_options=task_result.task.options
    )

    # Збереження фідбеку в базу даних
    new_feedback = AIFeedback(
        task_result_id=task_result_id,
        feedback_text=feedback_data["feedback_text"],
        detailed_feedback=feedback_data.get("detailed_feedback"),
    )
    db.add(new_feedback)
    await db.commit()
    await db.refresh(new_feedback)

    # Формування відповіді
    feedback_response = {
        "id": new_feedback.id,
        "task_result_id": task_result_id,
        "feedback_text": new_feedback.feedback_text,
        "detailed_feedback": new_feedback.detailed_feedback,
        "created_at": new_feedback.created_at.isoformat(),
        "updated_at": new_feedback.updated_at.isoformat(),
    }

    # Збереження в кеш
    await set_cache(cache_key, feedback_response, ttl=3600)

    return feedback_response
