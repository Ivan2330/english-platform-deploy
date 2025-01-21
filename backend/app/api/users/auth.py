from fastapi import Depends
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.users.staff import Staff
from app.models.users.students import Student
from app.core.config import settings
from app.core.database import get_async_session


secret_key = settings.secret_key

class StaffManager(BaseUserManager[Staff, int]):
    reset_password_token_secret = secret_key
    verification_token_secret = secret_key
    
    async def on_after_register(self, user: Staff, request=None):
        print(f"Staff member {user.id} has registered")
        
    async def on_after_forgot_password(self, user: Staff, token: str, request=None):
        print(f"Staff member {user.id} requested password reset. Token: {token}")


class StudentManager(BaseUserManager[Student, int]):
    reset_password_token_secret = secret_key
    verification_token_secret = secret_key

    async def on_after_register(self, user: Student, request=None):
        print(f"Student {user.id} has registered.")

    async def on_after_forgot_password(self, user: Student, token: str, request=None):
        print(f"Student {user.id} requested password reset. Token: {token}")


async def get_staff_manager(user_db=Depends(get_async_session)):
    yield StaffManager(user_db)

async def get_student_manager(user_db=Depends(get_async_session)):
    yield StudentManager(user_db)


bearer_transport = BearerTransport(tokenUrl="/auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=secret_key, lifetime_seconds=3600)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_staff_users = FastAPIUsers[Staff, int](
    get_staff_manager,
    [auth_backend],
)

fastapi_student_users = FastAPIUsers[Student, int](
    get_student_manager,
    [auth_backend],
)

current_active_staff = fastapi_staff_users.current_user(active=True)

current_active_student = fastapi_student_users.current_user(active=True)

