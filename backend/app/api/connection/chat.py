from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from typing import List
from app.core.database import get_async_session
from app.schemas.connection.chat import (
    ChatCreate, ChatResponse, ChatUpdate,
    ChatMessageCreate, ChatMessageResponse, ChatMessageUpdate
)
from app.models.connection.chat import Chat, ChatMessage
from app.api.users.auth import current_active_staff, current_active_student
from app.models.users.staff import Staff
from app.models.users.students import Student
from app.models.users.staff import Status


router = APIRouter(prefix="/chats", tags=["Chats"])

# Універсальна залежність для доступу (викладач або студент)
def current_active_user(
    current_staff: Staff = Depends(current_active_staff),
    current_student: Student = Depends(current_active_student)
):
    return current_staff or current_student

# Створення чату (доступ для викладачів і студентів)
@router.post("/", response_model=ChatResponse, status_code=201)
async def create_chat(
    chat: ChatCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    new_chat = Chat(**chat.dict())
    db.add(new_chat)
    await db.commit()
    await db.refresh(new_chat)
    return new_chat

# Отримання списку чатів (для викладачів і студентів)
@router.get("/", response_model=List[ChatResponse])
async def list_chats(
    classroom_id: int | None = None,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    query = select(Chat)
    if classroom_id:
        query = query.filter(Chat.classroom_id == classroom_id)
    result = await db.execute(query)
    chats = result.scalars().all()
    return chats

# Отримання деталей чату (для викладачів і студентів)
@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    chat = await db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

# Оновлення чату (тільки для викладачів)
@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: int,
    chat_update: ChatUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    chat = await db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    for key, value in chat_update.dict(exclude_unset=True).items():
        setattr(chat, key, value)
    await db.commit()
    await db.refresh(chat)
    return chat

# Видалення чату (тільки для викладачів)
@router.delete("/{chat_id}", status_code=204)
async def delete_chat(
    chat_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    chat = await db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    await db.delete(chat)
    await db.commit()
    return {"message": "Chat deleted"}

# Додавання повідомлення до чату (для викладачів і студентів)
@router.post("/{chat_id}/messages", response_model=ChatMessageResponse, status_code=201)
async def add_message(
    chat_id: int,
    message: ChatMessageCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    chat = await db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    new_message = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id if isinstance(current_user, Staff) else None,
        sender_student_id=current_user.id if isinstance(current_user, Student) else None,
        message=message.message,
        sent_at=func.now(),
    )
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    return new_message

# Оновлення статусу повідомлення (для викладачів або автора)
@router.patch("/{chat_id}/messages/{message_id}", response_model=ChatMessageResponse)
async def update_message_status(
    chat_id: int,
    message_id: int,
    message_update: ChatMessageUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    message = await db.get(ChatMessage, message_id)
    if not message or message.chat_id != chat_id:
        raise HTTPException(status_code=404, detail="Message not found")
    if isinstance(current_user, Student) and message.sender_student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    if isinstance(current_user, Staff) and message.sender_id != current_user.id and current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    for key, value in message_update.dict(exclude_unset=True).items():
        setattr(message, key, value)
    await db.commit()
    await db.refresh(message)
    return message

# Отримання повідомлень чату (для викладачів і студентів)
@router.get("/{chat_id}/messages", response_model=List[ChatMessageResponse])
async def list_messages(
    chat_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    query = select(ChatMessage).filter(ChatMessage.chat_id == chat_id).order_by(ChatMessage.sent_at)
    result = await db.execute(query)
    messages = result.scalars().all()
    return messages

# Видалення повідомлення (для викладачів або автора повідомлення)
@router.delete("/{chat_id}/messages/{message_id}", status_code=204)
async def delete_message(
    chat_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    message = await db.get(ChatMessage, message_id)
    if not message or message.chat_id != chat_id:
        raise HTTPException(status_code=404, detail="Message not found")
    if isinstance(current_user, Student) and message.sender_student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    if isinstance(current_user, Staff) and message.sender_id != current_user.id and current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    await db.delete(message)
    await db.commit()
    return {"message": "Message deleted"}
