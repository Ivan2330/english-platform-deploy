from sqlalchemy.future import select
from app.models.users.staff import Staff
from app.core.database import get_async_session

async def initialize_admin():
    async for session in get_async_session():  # Використовуємо асинхронний генератор
        async with session.begin():  # Використовуємо транзакцію
            # Перевіряємо, чи існує адміністратор
            result = await session.execute(select(Staff).where(Staff.username == "admin"))
            existing_admin = result.scalar_one_or_none()
            
            # Якщо адміністратора немає, створюємо нового
            if not existing_admin:
                admin = Staff(
                    username="admin",
                    email="admin@example.com",
                    phone_number="1234567890",  # Обов'язкове поле
                    password="securepassword",  # Хешуйте пароль перед збереженням
                    status="ADMIN",
                    is_admin=True,
                    is_verified=True
                )
                session.add(admin)
