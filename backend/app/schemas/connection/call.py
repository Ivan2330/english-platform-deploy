from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal


class CallBase(BaseModel):
    classroom_id: int


class CallCreate(CallBase):
    status: Literal["active", "ended"] = "active"  # ✅ Валідація через Literal


class CallUpdate(BaseModel):
    status: Literal["active", "ended"] | None = None


class CallResponse(CallBase):
    id: int
    status: Literal["active", "ended"]
    created_at: datetime

    class Config:
        from_attributes = True


class CallParticipantBase(BaseModel):
    call_id: int


class CallParticipantCreate(CallParticipantBase):
    user_id: int  # ✅ Єдиний user_id для викладачів та студентів
    role: Literal["teacher", "student"]  # ✅ Валідація ролі без Enum
    mic_status: bool = True
    camera_status: bool = True
    screen_sharing: bool = False
    video_quality: Literal["low", "medium", "high"] = "medium"  # ✅ Додаємо обмеження для якості відео


class CallParticipantUpdate(BaseModel):
    mic_status: bool | None = None
    camera_status: bool | None = None
    screen_sharing: bool | None = None
    video_quality: Literal["low", "medium", "high"] | None = None


class CallParticipantResponse(CallParticipantBase):
    id: int
    user_id: int
    role: Literal["teacher", "student"]
    joined_at: datetime
    left_at: datetime | None = None
    mic_status: bool
    camera_status: bool
    screen_sharing: bool
    video_quality: Literal["low", "medium", "high"]

    class Config:
        from_attributes = True
