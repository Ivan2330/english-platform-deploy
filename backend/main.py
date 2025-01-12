from asyncio import Task
from fastapi import FastAPI, Depends
from app.core.cache import set_cache, get_cache
from app.api.classroom.universal_task import router as universal_task_router
from app.api.users.staff import router as staff_router
from app.api.users.auth import (
    fastapi_staff_users,  # Авторизація для Staff
    fastapi_student_users,  # Авторизація для Student
    auth_backend,  # Бекенд авторизації (JWT)
)
from app.schemas.users.staff import StaffResponse, StaffCreate
app = FastAPI()


@app.get("/redis-ping")
async def redis_ping():
    await set_cache("test_key", "Redis is working", ttl=60)
    data = await get_cache("test_key")
    return {"message": data}

app.include_router(universal_task_router, tags=["Universal_Tasks"])
app.include_router(staff_router, tags=["Staff"])

app.include_router(
    fastapi_staff_users.get_auth_router(auth_backend),
    prefix="/auth/staff",
    tags=["Auth Staff"],
)
app.include_router(
    fastapi_staff_users.get_register_router(StaffResponse, StaffCreate),
    prefix="/auth/staff",
    tags=["Auth Staff"],
)
app.include_router(
    fastapi_staff_users.get_reset_password_router(),
    prefix="/auth/staff",
    tags=["Auth Staff"],
)

