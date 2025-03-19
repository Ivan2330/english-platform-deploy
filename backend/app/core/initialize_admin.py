import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_async_session
from app.models.users.users import User, UserRole, Status  # ✅ Імпортуємо Enum
from fastapi_users.password import PasswordHelper

async def ensure_admin():
    async for session in get_async_session():
        async with session.begin():
            # Перевіряємо, чи існує адміністратор
            result = await session.execute(select(User).where(User.username == "admin"))
            existing_admin = result.scalar_one_or_none()

            if existing_admin:
                print("✅ Адміністратор вже існує, додавати не потрібно.")
                return

            # Створюємо нового адміністратора, якщо його немає
            print("🚀 Створюємо нового адміністратора...")

            password_helper = PasswordHelper()
            hashed_password = password_helper.hash("securepassword")

            new_admin = User(
                username="admin",
                email="admin@example.com",
                phone_number="1234567890",
                hashed_password=hashed_password,
                role=UserRole.STAFF.value,  # ✅ Використовуємо Enum як string
                status=Status.ADMIN.value,  # ✅ Використовуємо Enum як string
                is_admin=True,
                is_verified=True,
                is_active=True
            )

            session.add(new_admin)
            await session.commit()  # Фіксуємо нового адміністратора

        print("🎉 Новий адміністратор успішно створений!")

async def initialize_admin():
    await ensure_admin()
