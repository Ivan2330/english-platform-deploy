from pydantic import BaseModel
from datetime import datetime
from typing import List
from app.models.users.users import UserRole


class ChatBase(BaseModel):
    name: str | None = None  # Назва для групових чатів
    classroom_id: int


class ChatCreate(ChatBase):
    pass


class ChatUpdate(BaseModel):
    name: str | None = None


class ChatResponse(ChatBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # ✅ Оновлено для Pydantic 2


class ChatMessageBase(BaseModel):
    chat_id: int
    message: str


class ChatMessageCreate(ChatMessageBase):
    user_id: int  # ✅ Використовуємо user_id замість sender_id і sender_student_id
    role: UserRole


class ChatMessageUpdate(BaseModel):
    is_read: bool | None = None


class ChatMessageResponse(ChatMessageBase):
    id: int
    user_id: int  # ✅ Використовуємо user_id
    role: UserRole
    sent_at: datetime
    is_read: bool

    class Config:
        from_attributes = True  # ✅ Оновлено для Pydantic 2


class ChatWithMessages(ChatResponse):
    messages: List[ChatMessageResponse]
