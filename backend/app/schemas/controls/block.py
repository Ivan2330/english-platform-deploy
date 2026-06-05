from pydantic import BaseModel
from typing import List, Dict, Any


# --- Питання всередині блоку-завдання ---
class BlockQuestionCreate(BaseModel):
    question_text: str
    options: Dict[str, str] | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    order: int = 0


class BlockQuestionResponse(BaseModel):
    id: int
    question_text: str
    options: Dict[str, str] | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    order: int

    class Config:
        from_attributes = True


# --- Блок ---
class BlockBase(BaseModel):
    section_id: int
    order: int = 0
    block_type: str  # "theory" | "task"

    # Теорія
    content: str | None = None          # markdown
    callout_style: str | None = None    # tip / note / warning / example / none

    # Завдання
    task_type: str | None = None        # multiple_choice / gap_fill / listening / video / ...
    title: str | None = None
    description: str | None = None
    media_url: str | None = None
    word_list: str | None = None
    config: Dict[str, Any] | None = None  # налаштування під конкретний тип завдання


class BlockCreate(BlockBase):
    questions: List[BlockQuestionCreate] = []


class BlockUpdate(BaseModel):
    order: int | None = None
    block_type: str | None = None
    content: str | None = None
    callout_style: str | None = None
    task_type: str | None = None
    title: str | None = None
    description: str | None = None
    media_url: str | None = None
    word_list: str | None = None
    config: Dict[str, Any] | None = None


class BlockResponse(BaseModel):
    id: int
    section_id: int
    order: int
    block_type: str
    content: str | None = None
    callout_style: str | None = None
    task_type: str | None = None
    title: str | None = None
    description: str | None = None
    media_url: str | None = None
    word_list: str | None = None
    config: Dict[str, Any] | None = None
    questions: List[BlockQuestionResponse] = []

    class Config:
        from_attributes = True