from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class CallBase(BaseModel):
    classroom_id: int

class CallCreate(CallBase):
    status: str  # active, ended

class CallUpdate(BaseModel):
    status: Optional[str]

class CallResponse(CallBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        orm_mode = True

class CallParticipantBase(BaseModel):
    call_id: int

class CallParticipantCreate(CallParticipantBase):
    staff_id: Optional[int]
    student_id: Optional[int]
    mic_status: Optional[bool] = True
    camera_status: Optional[bool] = True
    screen_sharing: Optional[bool] = False
    video_quality: Optional[str] = "medium"

class CallParticipantUpdate(BaseModel):
    mic_status: Optional[bool]
    camera_status: Optional[bool]
    screen_sharing: Optional[bool]
    video_quality: Optional[str]
    left_at: Optional[datetime]

class CallParticipantResponse(CallParticipantBase):
    id: int
    staff_id: Optional[int]
    student_id: Optional[int]
    joined_at: datetime
    left_at: Optional[datetime]
    mic_status: bool
    camera_status: bool
    screen_sharing: bool
    video_quality: str

    class Config:
        orm_mode = True
