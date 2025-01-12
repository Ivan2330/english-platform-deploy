from pydantic import BaseModel, Field
from typing import Optional


# 📝 Схема для надсилання повідомлення в чат класу
class ClassroomChatMessage(BaseModel):
    classroom_id: int = Field(..., example=1)
    sender_id: int = Field(..., example=3)
    message: str = Field(..., example="Hello everyone!")


# 🔄 Схема для отримання історії чату
class ClassroomChatHistory(BaseModel):
    classroom_id: int = Field(..., example=1)
    limit: Optional[int] = Field(50, example=50)


# 🗂️ Схема відповіді для повідомлення у чаті
class ClassroomChatResponse(BaseModel):
    id: int = Field(..., example=301)
    classroom_id: int = Field(..., example=1)
    sender_id: int = Field(..., example=3)
    sender_name: str = Field(..., example="John Doe")
    message: str = Field(..., example="Welcome to the class!")
    sent_at: str = Field(..., example="2024-01-15T16:00:00")

    class Config:
        orm_mode = True
