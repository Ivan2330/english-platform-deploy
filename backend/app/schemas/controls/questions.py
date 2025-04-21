from pydantic import BaseModel
from typing import Dict


class QuestionCreate(BaseModel):
    task_id: int
    question_text: str
    options: Dict[str, str] | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    order: int

class QuestionUpdate(BaseModel):
    question_text: str | None = None
    options: Dict[str, str] | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    order: int | None = None


class QuestionResponse(BaseModel):
    id: int
    task_id: int
    question_text: str
    options: Dict[str, str] | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    order: int
    
    class Config:
        from_attributes = True
