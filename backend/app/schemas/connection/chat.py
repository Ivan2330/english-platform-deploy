from pydantic import BaseModel
from datetime import datetime
from typing import List
from app.models.users.users import UserRole


class ChatBase(BaseModel):
    classroom_id: int


class ChatCreate(ChatBase):
    pass


class ChatUpdate(BaseModel):
    pass


class ChatResponse(ChatBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    chat_id: int
    message: str


class ChatMessageCreate(ChatMessageBase):
    user_id: int


class ChatMessageUpdate(BaseModel):
    is_read: bool | None = None


class ChatMessageResponse(ChatMessageBase):
    id: int
    user_id: int
    role: str
    sent_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


class ChatWithMessages(ChatResponse):
    messages: List[ChatMessageResponse]
