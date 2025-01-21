from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ChatBase(BaseModel):
    name: Optional[str]  # Назва для групових чатів
    classroom_id: int


class ChatCreate(ChatBase):
    pass


class ChatUpdate(BaseModel):
    name: Optional[str]


class ChatResponse(ChatBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    chat_id: int
    message: str


class ChatMessageCreate(ChatMessageBase):
    sender_id: Optional[int]
    sender_student_id: Optional[int]


class ChatMessageUpdate(BaseModel):
    is_read: Optional[bool]


class ChatMessageResponse(ChatMessageBase):
    id: int
    sender_id: Optional[int]
    sender_student_id: Optional[int]
    sent_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


class ChatWithMessages(ChatResponse):
    messages: List[ChatMessageResponse]
