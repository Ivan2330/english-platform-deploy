from pydantic import BaseModel
from datetime import datetime

class AIFeedbackBase(BaseModel):
    task_result_id: int
    feedback_text: str
    detailed_feedback: str | None = None


class AIFeedbackResponse(AIFeedbackBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
