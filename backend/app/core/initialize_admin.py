from sqlalchemy import insert
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models.users.users import User, UserRole, Status
from fastapi_users.password import PasswordHelper


ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "my.primeacademy19@gmail.com"
ADMIN_PHONE = "0991797047"
ADMIN_PLAIN_PW = "prime#1910"


async def ensure_admin() -> None:
    async for session in get_async_session():          # ← ваш AsyncSession generator
        async with session.begin():
            # 1️⃣ чи існує вже такий username АБО email?
            q = select(User).where(
                (User.username == ADMIN_USERNAME) | (User.email == ADMIN_EMAIL)
            )
            if await session.scalar(q):
                print("✅ Адміністратор уже є – пропускаємо створення.")
                return

            print("🚀 Створюємо нового адміністратора…")
            ph = PasswordHelper()
            hashed_pw = ph.hash(ADMIN_PLAIN_PW)

            stmt = (
                insert(User)
                .values(
                    username=ADMIN_USERNAME,
                    email=ADMIN_EMAIL,
                    phone_number=ADMIN_PHONE,
                    hashed_password=hashed_pw,
                    role=UserRole.STAFF.value,
                    status=Status.ADMIN.value,
                    is_admin=True,
                    is_verified=True,
                    is_active=True,
                )
                # 2️⃣ запасна сітка: якщо хтось-таки вставив admin між SELECT і INSERT
                .on_conflict_do_nothing(index_elements=[User.email])
            )
            await session.execute(stmt)
            print("🎉 Новий адміністратор успішно створений!")


async def initialize_admin() -> None:
    await ensure_admin()
