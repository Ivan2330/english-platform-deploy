from pydantic import BaseModel
from datetime import datetime
from typing import List


class AttemptStart(BaseModel):
    lesson_id: int


class AnswerSubmit(BaseModel):
    block_id: int
    question_id: int | None = None
    student_answer: str | None = None


class AnswerResponse(BaseModel):
    id: int
    block_id: int
    question_id: int | None = None
    student_answer: str | None = None
    is_correct: bool | None = None
    bot_score: float | None = None
    teacher_grade: float | None = None
    teacher_feedback: str | None = None

    class Config:
        from_attributes = True


class AnswerGrade(BaseModel):
    teacher_grade: float | None = None
    teacher_feedback: str | None = None


class AttemptGrade(BaseModel):
    overall_grade: float | None = None
    teacher_comment: str | None = None


class AttemptResponse(BaseModel):
    id: int
    lesson_id: int
    student_id: int
    status: str
    overall_grade: float | None = None
    teacher_comment: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None

    class Config:
        from_attributes = True


class AttemptFullResponse(AttemptResponse):
    answers: List[AnswerResponse] = []