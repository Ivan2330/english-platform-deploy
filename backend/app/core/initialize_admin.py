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

STUDENT_USERNAME = "student_user"
STUDENT_EMAIL = "student@example.com"
STUDENT_PHONE = "+380991234567"
STUDENT_PLAIN_PW = "Student#1234"
STUDENT_SUBSCRIPTION = "individual"        # або Subscription.INDIVIDUAL.value
STUDENT_LEVEL = "B1"                       # або EnglishLevel.A1.value

async def ensure_student() -> None:
    async for session in get_async_session():
        async with session.begin():
            # перевіряємо, чи є такий користувач за email чи username
            stmt_sel = select(User).where(
                (User.username == STUDENT_USERNAME) | (User.email == STUDENT_EMAIL)
            )
            exists = await session.scalar(stmt_sel)
            if exists:
                print("✅ Студент уже існує, пропускаємо створення.")
                return

            print("🚀 Створюємо нового студента…")
            ph = PasswordHelper()
            hashed_pw = ph.hash(STUDENT_PLAIN_PW)

            stmt_ins = (
                insert(User)
                .values(
                    username=STUDENT_USERNAME,
                    email=STUDENT_EMAIL,
                    phone_number=STUDENT_PHONE,
                    hashed_password=hashed_pw,
                    role=UserRole.STUDENT.value,
                    subscription_type=STUDENT_SUBSCRIPTION,
                    level=STUDENT_LEVEL,
                    is_active=True,
                    is_verified=False,   # можна змінити на True, якщо треба
                    is_admin=False,
                )
                .on_conflict_do_nothing(index_elements=[User.email])
            )
            await session.execute(stmt_ins)
            print("🎉 Новий студент успішно створений!")


async def initialize_admin() -> None:
    await ensure_admin()
    await ensure_student()
