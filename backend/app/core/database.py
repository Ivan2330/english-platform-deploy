from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator
from app.core.config import settings

Base = declarative_base()

# Ініціалізація двигуна бази даних
engine = create_async_engine(
    settings.database_url,
    echo=True
)

# Налаштування фабрики сесій
async_session_maker = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)


# Функція для створення таблиць
async def get_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Загальний генератор для отримання сесії
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


# Універсальний генератор для роботи з моделями бази даних
async def get_user_db(model_class):
    async with async_session_maker() as session:
        # Ви можете використовувати model_class для додаткової логіки, якщо потрібно
        yield session