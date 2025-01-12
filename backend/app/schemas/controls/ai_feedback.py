from pydantic import BaseModel


class AIFeedbackBase(BaseModel):
    task_id: int
    feedback_text: str
    score: int | None
    comments: str | None
    ai_model: str = "gpt-4"


class AIFeedbackCreate(AIFeedbackBase):
    pass


class AIFeedbackUpdate(BaseModel):
    feedback_text: str | None
    score: int | None
    comments: str | None


class AIFeedbackResponse(AIFeedbackBase):
    id: int
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
