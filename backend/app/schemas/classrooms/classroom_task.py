from pydantic import BaseModel
from typing import Optional


class ClassroomTaskBase(BaseModel):
    classroom_id: int
    task_id: int
    assigned_by: int


class ClassroomTaskUpdate(BaseModel):
    classroom_id: int | None
    task_id: int | None
    assigned_by: int | None
    is_active: bool | None
    
    
class ClassroomTaskCreate(ClassroomTaskBase):
    pass


class ClassroomTaskResponse(ClassroomTaskBase):
    id: int
    is_active: bool

    class Config:
        orm_mode = True


class ClassroomTaskAssign(BaseModel):
    classroom_id: int  # ID класу
    task_id: int       # ID завдання
    due_date: Optional[str] = None  # Дата завершення (необов’язково)

    class Config:
        from_attributes = True