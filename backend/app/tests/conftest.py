import pytest
from httpx import AsyncClient
from backend.main import app
from app.core.database import get_async_session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.models import Base

# Створення тестового двигуна
TEST_DATABASE_URL = f"{settings.database_url}_test"
engine = create_async_engine(TEST_DATABASE_URL, echo=True)
TestingSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

@pytest.fixture(scope="session", autouse=True)
async def setup_test_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client

@pytest.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session
