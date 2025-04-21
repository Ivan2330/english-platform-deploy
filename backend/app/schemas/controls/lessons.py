from pydantic import BaseModel
from app.models.users.users import EnglishLevel

class LessonCreate(BaseModel):
    title: str
    level: str = EnglishLevel.A1.value
    
class LessonUpdate(BaseModel):
    title: str | None = None
    level: str | None = None
    
class LessonResponse(BaseModel):
    id: int
    title: str
    level: str
    
    class Config:
        from_attributes = True
    