from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.controls.questions import Question
from app.schemas.controls.questions import QuestionCreate, QuestionUpdate, QuestionResponse
from app.models.controls.universal_task import UniversalTask

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.post("/tasks/{task_id}/questions/", response_model=QuestionResponse, status_code=201)
async def create_question(
    task_id: int,
    question_data: QuestionCreate,
    session: AsyncSession = Depends(get_async_session)
):

    result = await session.execute(select(UniversalTask).where(UniversalTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Створюємо нове питання
    new_question = Question(
        task_id=task_id,
        question_text=question_data.question_text,
        correct_answer=question_data.correct_answer,
        explanation=question_data.explanation,
        order=question_data.order,
    )


    if question_data.options:
        new_question.set_options(question_data.options)

    session.add(new_question)
    await session.commit()
    await session.refresh(new_question)


    return QuestionResponse(
        id=new_question.id,
        task_id=new_question.task_id,
        question_text=new_question.question_text,
        options=new_question.get_options(),
        correct_answer=new_question.correct_answer,
        explanation=new_question.explanation,
        order=new_question.order,
    )




@router.get("/tasks/{task_id}/questions/", response_model=List[QuestionResponse])
async def get_task_questions(task_id: int, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(UniversalTask).where(UniversalTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    result_questions = await session.execute(select(Question).where(Question.task_id == task_id))
    questions = result_questions.scalars().all()


    return [
        QuestionResponse(
            id=q.id,
            task_id=q.task_id,
            question_text=q.question_text,
            options=q.get_options(),
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            order=q.order,
        )
        for q in questions
    ]



@router.get("/{question_id}/", response_model=QuestionResponse)
async def get_question(question_id: int, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    
    return QuestionResponse(
        id=question.id,
        task_id=question.task_id,
        question_text=question.question_text,
        options=question.get_options(),
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        order=question.order,
    )


@router.put("/{question_id}/", response_model=QuestionResponse)
async def update_question(
    question_id: int,
    question_data: QuestionUpdate,
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    for key, value in question_data.model_dump(exclude_unset=True).items():
        if key == "options" and value is not None:
            question.set_options(value)
        else:
            setattr(question, key, value)

    await session.commit()
    await session.refresh(question)

    return QuestionResponse(
        id=question.id,
        task_id=question.task_id,
        question_text=question.question_text,
        options=question.get_options(),
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        order=question.order,
    )


@router.delete("/{question_id}/", status_code=204)
async def delete_question(question_id: int, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    await session.delete(question)
    await session.commit()
    return {"message": "Question deleted successfully"}

