from pydantic import BaseModel
from typing import List

from app.schemas.controls.section import SectionResponse
from app.schemas.controls.block import BlockResponse


class SectionFullResponse(SectionResponse):
    """Секція разом із її блоками (по порядку)."""
    blocks: List[BlockResponse] = []


class LessonFullResponse(BaseModel):
    """Повний урок для сторінки заняття: урок -> секції -> блоки -> питання."""
    id: int
    title: str
    level: str | None = None
    lesson_type: str | None = None
    sections: List[SectionFullResponse] = []

    class Config:
        from_attributes = True