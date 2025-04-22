from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.schemas.users.users import UserResponse, UserCreate, UserUpdate
# Імпорти бази даних та ініціалізації
from app.core.database import get_db_and_tables
from app.core.initialize_admin import initialize_admin

# Імпорти API-маршрутів
from app.api.classrooms.classroom import router as classroom_router
from app.api.classrooms.classroom_progress import router as classroom_progress_router
from app.api.classrooms.classroom_task import router as classroom_task_router
from app.api.connection.call import router as call_router
from app.api.connection.call_ws import router as call_ws_router  # ✅ WebSocket для дзвінків
from app.api.connection.chat import router as chat_router
from app.api.connection.chat_ws import router as chat_ws_router  # ✅ WebSocket для чату
from app.api.controls.task_result import router as task_result_router
from app.api.controls.lessons import router as lesson_router
from app.api.controls.questions import router as question_router
from app.api.controls.universal_task import router as universal_task_router
from app.api.controls.ai_feedback import router as ai_feedback_router
from app.api.users.auth import fastapi_users, auth_backend
from app.api.users.students import router as students_router
from app.api.users.staff import router as staff_router
from app.api.users.users import router as photo_router

# Завантажуємо змінні середовища
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Виконує ініціалізацію перед запуском серверу"""
    await get_db_and_tables()  # Створюємо таблиці в базі перед запуском
    await initialize_admin()  # Створюємо адміністратора, якщо його немає
    yield

app = FastAPI(lifespan=lifespan)

# Додаємо CORS для доступу з будь-яких джерел
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Включення маршрутів аутентифікації з правильними аргументами
app.include_router(
    fastapi_users.get_auth_router(auth_backend), 
    prefix="/auth/jwt", 
    tags=["Auth"]
)

app.include_router(
    fastapi_users.get_register_router(UserResponse, UserCreate),
    prefix="/auth", 
    tags=["Auth"]
)

app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth", 
    tags=["Auth"]
)

app.include_router(
    fastapi_users.get_verify_router(UserResponse),
    prefix="/auth", 
    tags=["Auth"]
)

app.include_router(
    fastapi_users.get_users_router(UserResponse, UserUpdate),
    prefix="/users", 
    tags=["Users"]
)
app.include_router(photo_router, prefix="/users", tags=["Users"])
# ✅ **Роутери користувачів**
app.include_router(students_router, prefix="/students", tags=["Students"])
app.include_router(staff_router, prefix="/staff", tags=["Staff"])

# ✅ **Роутери класів**
app.include_router(classroom_router, prefix="/classrooms", tags=["Classrooms"])
app.include_router(classroom_progress_router, prefix="/classroom-progress", tags=["Classroom Progress"])
app.include_router(classroom_task_router, prefix="/classroom-tasks", tags=["Classroom Tasks"])

# ✅ **Роутери дзвінків та чатів**
app.include_router(call_router, prefix="/calls", tags=["Calls"])
app.include_router(call_ws_router, prefix="/calls-ws", tags=["Calls WebSocket"])
app.include_router(chat_router, prefix="/chats", tags=["Chats"])
app.include_router(chat_ws_router, prefix="/chat-ws", tags=["Chats WebSocket"])

# ✅ **Роутери завдань та результатів**
app.include_router(task_result_router, prefix="/task-results", tags=["Task Results"])
app.include_router(universal_task_router, prefix="/universal-tasks", tags=["Universal Tasks"])
app.include_router(ai_feedback_router, prefix="/ai-feedback", tags=["AI Feedback"])
app.include_router(lesson_router, prefix="/lessons", tags=["Lessons"])
app.include_router(question_router, prefix="/questions", tags=["Questions"])


# ✅ **Перевірка підключення до Redis**
from app.core.cache import set_cache, get_cache
@app.get("/redis-ping")
async def redis_ping():
    await set_cache("test_key", "Redis is working", ttl=60)
    data = await get_cache("test_key")
    return {"message": data}

# ✅ **Тестовий захищений ендпоінт**
from app.models.users.users import User
@app.get("/authenticated-route")
async def authenticated_route(user: User = Depends(fastapi_users.current_user(active=True))):
    return {"message": f"Hello {user.email}!"}

# ✅ **Логування змінних середовища**
print("🔑 SECRET_KEY:", os.getenv("SECRET_KEY"))
print("🗄️ DATABASE_URL:", os.getenv("DATABASE_URL"))
print("🔗 REDIS_URL:", os.getenv("REDIS_URL"))
print("🤖 OPENAI_API_KEY:", os.getenv("OPENAI_API_KEY"))
print("🌐 OPENAI_API_URL:", os.getenv("OPENAI_API_URL"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
