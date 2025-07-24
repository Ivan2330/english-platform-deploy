from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase  # ✅ Правильний імпорт
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext

from app.core.database import get_user_db
from app.models.users.users import User
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession

# 🔑 Конфігурація паролів
SECRET = settings.secret_key
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 🎟️ Функція створення JWT-токена
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.expire_token_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET, algorithm=settings.algorithm)


# 👤 Менеджер користувачів
class UserManager(BaseUserManager[User, int]):  # ✅ Використовуємо int замість UUID
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(self, user: User, token: str, request: Optional[Request] = None):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(self, user: User, token: str, request: Optional[Request] = None):
        print(f"Verification requested for user {user.id}. Verification token: {token}")
    
    def parse_id(self, user_id: str) -> int:  
        return int(user_id)

# 🛠️ Функція для отримання UserManager
async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)



# 🔒 JWT Аутентифікація
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

# 🔹 FastAPI Users (без реєстрації)
fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [auth_backend],
)

# 📌 Депенденсі для отримання активного користувача
current_active_user = fastapi_users.current_user(active=True)
