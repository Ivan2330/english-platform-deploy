from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from typing import List
from app.core.database import get_async_session
from app.core.cache import get_cache, set_cache, delete_cache
from app.schemas.connection.chat import (
    ChatCreate, ChatResponse, ChatUpdate,
    ChatMessageCreate, ChatMessageResponse, ChatMessageUpdate
)
from app.models.connection.chat import Chat, ChatMessage
from app.api.users.auth import current_active_user
from app.models.users.users import User, Status

router = APIRouter(prefix="/chats", tags=["Chats"])


def is_teacher_or_admin(current_user: User):
    """Дозволяє доступ лише адміністраторам та викладачам"""
    if current_user.role != "staff" or current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="User doesn't have permission")


# 🔹 Створення чату (доступ для викладачів і студентів)
@router.post("/", response_model=ChatResponse, status_code=201)
async def create_chat(
    chat: ChatCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    new_chat = Chat(**chat.model_dump())
    db.add(new_chat)
    await db.commit()
    await db.refresh(new_chat)
    return new_chat


# 🔹 Отримання списку чатів (для викладачів і студентів)
@router.get("/", response_model=List[ChatResponse])
async def list_chats(
    classroom_id: int | None = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    query = select(Chat)
    if classroom_id:
        query = query.filter(Chat.classroom_id == classroom_id)
    result = await db.execute(query)
    chats = result.scalars().all()
    return chats


# 🔹 Отримання деталей чату (для викладачів і студентів)
@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    chat = await db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


# 🔹 Оновлення чату (тільки для викладачів)
@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: int,
    chat_update: ChatUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)
    
    chat = await db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    for key, value in chat_update.model_dump(exclude_unset=True).items():
        setattr(chat, key, value)
    await db.commit()
    await db.refresh(chat)
    return chat


# 🔹 Видалення чату (тільки для викладачів)
@router.delete("/{chat_id}", status_code=204)
async def delete_chat(
    chat_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)
    
    chat = await db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    await db.delete(chat)
    await db.commit()
    return {"message": "Chat deleted"}


# 🔹 Додавання повідомлення до чату (для викладачів і студентів)
@router.post("/{chat_id}/messages", response_model=ChatMessageResponse, status_code=201)
async def add_message(
    chat_id: int,
    message: ChatMessageCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    chat = await db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    new_message = ChatMessage(
        chat_id=chat_id,
        user_id=current_user.id,  # ✅ Використовуємо user_id замість sender_id і sender_student_id
        role=current_user.role,  # ✅ Додаємо роль ("staff" або "student")
        message=message.message,
        sent_at=func.now(),
    )
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    return new_message


# 🔹 Оновлення статусу повідомлення (для викладачів або автора)
@router.patch("/{chat_id}/messages/{message_id}", response_model=ChatMessageResponse)
async def update_message_status(
    chat_id: int,
    message_id: int,
    message_update: ChatMessageUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    message = await db.get(ChatMessage, message_id)
    if not message or message.chat_id != chat_id:
        raise HTTPException(status_code=404, detail="Message not found")
    if current_user.id != message.user_id and current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="Permission denied")

    for key, value in message_update.model_dump(exclude_unset=True).items():
        setattr(message, key, value)
    await db.commit()
    await db.refresh(message)
    return message


# 🔹 Видалення повідомлення (для викладачів або автора повідомлення)
@router.delete("/{chat_id}/messages/{message_id}", status_code=204)
async def delete_message(
    chat_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    message = await db.get(ChatMessage, message_id)
    if not message or message.chat_id != chat_id:
        raise HTTPException(status_code=404, detail="Message not found")
    if current_user.id != message.user_id and current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="Permission denied")

    await db.delete(message)
    await db.commit()
    return {"message": "Message deleted"}
