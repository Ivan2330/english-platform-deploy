from pydantic import BaseModel


class AIChatBase(BaseModel):
    user_id: int
    message: str
    context: str | None


class AIChatCreate(AIChatBase):
    pass


class AIChatUpdate(BaseModel):
    message: str | None
    response: str | None
    context: str | None


class AIChatResponse(AIChatBase):
    id: int
    response: str
    created_at: str

    class Config:
        orm_mode = True
