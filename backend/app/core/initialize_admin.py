import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_async_session
from app.models.users.users import User, UserRole, Status
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
            hashed_password = password_helper.hash("prime#1910")

            new_admin = User(
                username="Ivan Kozhevnyk",
                email="my.primeacademy19@gmail.com",
                phone_number="0991797047",
                hashed_password=hashed_password,
                role=UserRole.STAFF.value,
                status=Status.ADMIN.value,
                is_admin=True,
                is_verified=True,
                is_active=True
            )

            session.add(new_admin)
            await session.commit()  # Фіксуємо нового адміністратора

        print("🎉 Новий адміністратор успішно створений!")

async def initialize_admin():
    await ensure_admin()
