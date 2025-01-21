from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AIFeedbackBase(BaseModel):
    task_result_id: int
    feedback_text: str
    detailed_feedback: Optional[str] = None


class AIFeedbackCreate(AIFeedbackBase):
    pass


class AIFeedbackResponse(AIFeedbackBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
