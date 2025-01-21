from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.cache import set_cache, get_cache
from app.api.classrooms.classroom import router as classroom_router
from app.api.classrooms.classroom_progress import router as classroom_progress_router
from app.api.classrooms.classroom_task import router as classroom_task_router
from app.api.connection.call import router as call_router
from app.api.connection.call_ws import router as call_ws_router
from app.api.connection.chat import router as chat_router
from app.api.connection.chat_ws import router as chat_ws_router
from app.api.controls.task_result import router as task_result_router
from app.api.controls.universal_task import router as universal_task_router
from app.api.controls.ai_feedback import router as ai_feedback_router
from app.api.users.auth import (
    fastapi_staff_users,  # Staff authentication
    fastapi_student_users,  # Student authentication
    auth_backend,  # JWT backend
)
from app.schemas.users.staff import StaffResponse, StaffCreate
from dotenv import load_dotenv
import os
from app.core.database import get_db_and_tables


app = FastAPI()

# Load environment variables
load_dotenv()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


import asyncio
from app.core.initialize_admin import initialize_admin
from app.core.database import engine, Base

@app.on_event("startup")
async def startup_event():
    # Створення таблиць у базі даних
    await get_db_and_tables()
    await initialize_admin(),  
    
# Redis connection check
@app.get("/redis-ping")
async def redis_ping():
    await set_cache("test_key", "Redis is working", ttl=60)
    data = await get_cache("test_key")
    return {"message": data}

# Include routers
app.include_router(classroom_router, tags=["Classrooms"])
app.include_router(classroom_progress_router, tags=["Classroom Progress"])
app.include_router(classroom_task_router, tags=["Classroom Tasks"])
app.include_router(task_result_router, tags=["Task Results"])
app.include_router(universal_task_router, tags=["Universal Tasks"])
app.include_router(ai_feedback_router, tags=["AI Feedback"])
app.include_router(call_router, tags=["Calls"])
app.include_router(call_ws_router, tags=["Calls WebSocket"])
app.include_router(chat_router, tags=["Chats"])
app.include_router(chat_ws_router, tags=["Chats WebSocket"])

# Staff authentication routes
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

# Student authentication routes
app.include_router(
    fastapi_student_users.get_auth_router(auth_backend),
    prefix="/auth/student",
    tags=["Auth Student"],
)
app.include_router(
    fastapi_student_users.get_register_router(StaffResponse, StaffCreate),
    prefix="/auth/student",
    tags=["Auth Student"],
)
app.include_router(
    fastapi_student_users.get_reset_password_router(),
    prefix="/auth/student",
    tags=["Auth Student"],
)

# Logging loaded environment variables
print("SECRET_KEY:", os.getenv("SECRET_KEY"))
print("DB_URL:", os.getenv("DB_URL"))
print("REDIS_URL:", os.getenv("REDIS_URL"))
print("OPENAI_API_KEY:", os.getenv("OPENAI_API_KEY"))
print("OPENAI_API_URL:", os.getenv("OPENAI_API_URL"))