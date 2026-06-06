import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_async_session
from app.api.users.auth import current_active_user
from app.models.users.users import User
from app.models.controls.section import Section
from app.models.controls.block import Block
from app.models.controls.questions import Question
from app.schemas.controls.block import (
    BlockCreate,
    BlockUpdate,
    BlockResponse,
    BlockQuestionResponse,
)

router = APIRouter(prefix="/blocks", tags=["Blocks"])


# ---------- серіалізація (config/options у БД лежать як JSON-текст) ----------
def parse_json(value):
    if not value:
        return None
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return None


def question_to_response(q: Question) -> BlockQuestionResponse:
    return BlockQuestionResponse(
        id=q.id,
        question_text=q.question_text,
        options=parse_json(q.options),
        correct_answer=q.correct_answer,
        explanation=q.explanation,
        order=q.order,
    )


def block_to_response(b: Block) -> BlockResponse:
    questions = sorted(b.questions, key=lambda x: x.order) if b.questions else []
    return BlockResponse(
        id=b.id,
        section_id=b.section_id,
        order=b.order,
        block_type=b.block_type,
        content=b.content,
        callout_style=b.callout_style,
        task_type=b.task_type,
        title=b.title,
        description=b.description,
        media_url=b.media_url,
        word_list=b.word_list,
        config=parse_json(b.config),
        questions=[question_to_response(q) for q in questions],
    )


async def _load_block(session: AsyncSession, block_id: int) -> Block | None:
    result = await session.execute(
        select(Block).where(Block.id == block_id).options(selectinload(Block.questions))
    )
    return result.scalar_one_or_none()


# ---------- endpoints ----------
@router.post("/", response_model=BlockResponse)
async def create_block(
    data: BlockCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    section = (
        await session.execute(select(Section).where(Section.id == data.section_id))
    ).scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    block = Block(
        section_id=data.section_id,
        order=data.order,
        block_type=data.block_type,
        content=data.content,
        callout_style=data.callout_style,
        task_type=data.task_type,
        title=data.title,
        description=data.description,
        media_url=data.media_url,
        word_list=data.word_list,
        config=json.dumps(data.config) if data.config is not None else None,
    )
    session.add(block)
    await session.flush()  # отримуємо block.id до коміту

    for q in data.questions:
        session.add(
            Question(
                block_id=block.id,
                question_text=q.question_text,
                options=json.dumps(q.options) if q.options is not None else None,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                order=q.order,
            )
        )

    await session.commit()
    block = await _load_block(session, block.id)
    return block_to_response(block)


@router.get("/section/{section_id}", response_model=List[BlockResponse])
async def list_blocks(
    section_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Block)
        .where(Block.section_id == section_id)
        .options(selectinload(Block.questions))
        .order_by(Block.order)
    )
    blocks = result.scalars().all()
    return [block_to_response(b) for b in blocks]


@router.put("/{block_id}", response_model=BlockResponse)
async def update_block(
    block_id: int,
    data: BlockUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    block = await _load_block(session, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    payload = data.model_dump(exclude_unset=True)
    new_questions = payload.pop("questions", None)

    if "config" in payload:
        payload["config"] = (
            json.dumps(payload["config"]) if payload["config"] is not None else None
        )
    for key, value in payload.items():
        setattr(block, key, value)

    # Якщо передали питання — повністю замінюємо набір
    if new_questions is not None:
        for q in list(block.questions):
            await session.delete(q)
        await session.flush()
        for q in new_questions:
            session.add(
                Question(
                    block_id=block.id,
                    question_text=q.get("question_text"),
                    options=json.dumps(q["options"]) if q.get("options") is not None else None,
                    correct_answer=q.get("correct_answer"),
                    explanation=q.get("explanation"),
                    order=q.get("order", 0),
                )
            )

    await session.commit()
    block = await _load_block(session, block_id)
    return block_to_response(block)


@router.delete("/{block_id}", status_code=204)
async def delete_block(
    block_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    block = (
        await session.execute(select(Block).where(Block.id == block_id))
    ).scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    await session.delete(block)
    await session.commit()