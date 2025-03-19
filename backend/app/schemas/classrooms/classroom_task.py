from pydantic import BaseModel
from datetime import datetime


class ClassroomTaskBase(BaseModel):
    classroom_id: int
    task_id: int
    user_id: int  # ✅ Використовуємо user_id замість assigned_by


class ClassroomTaskUpdate(BaseModel):
    classroom_id: int | None = None
    task_id: int | None = None
    user_id: int | None = None  # ✅ Використовуємо user_id замість assigned_by
    is_active: bool | None = None
    
    
class ClassroomTaskCreate(ClassroomTaskBase):
    pass


class ClassroomTaskResponse(ClassroomTaskBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True  # ✅ Оновлено для Pydantic 2


class ClassroomTaskAssign(BaseModel):
    classroom_id: int  # ID класу
    user_id: int | None = None
    task_id: int       # ID завдання
    due_date: datetime | None = None  # Дата завершення (необов’язково)

    class Config:
        from_attributes = True  # ✅ Оновлено для Pydantic 2
