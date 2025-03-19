from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from app.models.users.users import UserRole


class CallStatus(str, Enum):
    ACTIVE = "active"
    ENDED = "ended"


class CallBase(BaseModel):
    classroom_id: int


class CallCreate(CallBase):
    status: CallStatus  # ✅ Використовуємо Enum


class CallUpdate(BaseModel):
    status: CallStatus | None = None


class CallResponse(CallBase):
    id: int
    status: CallStatus
    created_at: datetime

    class Config:
        from_attributes = True  # ✅ Оновлено для Pydantic 2


class CallParticipantBase(BaseModel):
    call_id: int


class CallParticipantCreate(CallParticipantBase):
    user_id: int  # ✅ Замінено staff_id і student_id на user_id
    role: UserRole
    mic_status: bool | None = True
    camera_status: bool | None = True
    screen_sharing: bool | None = False
    video_quality: str | None = "medium"


class CallParticipantUpdate(BaseModel):
    mic_status: bool | None = None
    camera_status: bool | None = None
    screen_sharing: bool | None = None
    video_quality: str | None = None
    left_at: datetime | None = None


class CallParticipantResponse(CallParticipantBase):
    id: int
    user_id: int  # ✅ Використовуємо user_id замість staff_id і student_id
    role: UserRole
    joined_at: datetime
    left_at: datetime | None = None
    mic_status: bool
    camera_status: bool
    screen_sharing: bool
    video_quality: str

    class Config:
        from_attributes = True  # ✅ Оновлено для Pydantic 2
