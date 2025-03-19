from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_async_session
from app.models.controls.task_result import TaskResult
from app.models.controls.ai_feedback import AIFeedback
from app.schemas.controls.ai_feedback import AIFeedbackResponse
from app.utils.openai import generate_feedback
from app.core.cache import get_cache, set_cache
from app.api.users.auth import current_active_user
from app.models.users.users import User

router = APIRouter(prefix="/tasks/feedback", tags=["Task Feedback"])

@router.post("/results/{task_result_id}", response_model=AIFeedbackResponse)
async def create_feedback(
    task_result_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Генерація фідбеку для TaskResult із використанням OpenAI.
    """
    # Перевірка TaskResult
    result = await session.execute(select(TaskResult).where(TaskResult.id == task_result_id))
    task_result = result.scalar_one_or_none()
    if not task_result:
        raise HTTPException(status_code=404, detail="TaskResult not found")

    # Перевірка кешу
    cache_key = f"feedback:{task_result_id}"
    cached_feedback = await get_cache(cache_key)
    if cached_feedback:
        return cached_feedback

    # Генерація фідбеку через OpenAI
    try:
        feedback_data = await generate_feedback(
            task_type=task_result.task.task_type,
            student_answer=task_result.student_answer,
            correct_answer=task_result.task.correct_answer,
            all_options=task_result.task.options
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI feedback generation failed: {str(e)}")

    # Створення об'єкта AIFeedback
    new_feedback = AIFeedback(
        task_result_id=task_result_id,
        feedback_text=feedback_data["feedback_text"],
        detailed_feedback=feedback_data.get("detailed_feedback"),
    )

    session.add(new_feedback)
    await session.commit()
    await session.refresh(new_feedback)

    # Формування відповіді
    feedback_response = AIFeedbackResponse.model_validate(new_feedback.__dict__)

    # Збереження в кеш
    try:
        await set_cache(cache_key, feedback_response.model_dump(), ttl=1800)
    except Exception as e:
        print(f"⚠️ Cache error: {e}")  # Лише логування, без аварійного завершення

    return feedback_response
