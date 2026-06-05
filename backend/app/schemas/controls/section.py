from pydantic import BaseModel


class SectionCreate(BaseModel):
    lesson_id: int
    title: str
    kind: str = "general"  # warmup/vocabulary/grammar/reading/listening/speaking/writing/review/homework
    icon: str | None = None
    order: int = 0


class SectionUpdate(BaseModel):
    title: str | None = None
    kind: str | None = None
    icon: str | None = None
    order: int | None = None


class SectionResponse(BaseModel):
    id: int
    lesson_id: int
    title: str
    kind: str
    icon: str | None = None
    order: int

    class Config:
        from_attributes = True