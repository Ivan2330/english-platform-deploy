from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TaskResultBase(BaseModel):
    task_id: int
    student_id: int
    student_answer: str
    is_correct: Optional[bool] = None
    score: Optional[float] = 0.0


class TaskResultCreate(TaskResultBase):
    pass


class TaskResultUpdate(BaseModel):
    is_correct: Optional[bool] = None
    score: Optional[float] = None


class TaskResultResponse(TaskResultBase):
    id: int
    submitted_at: datetime

    class Config:
        orm_mode = True
