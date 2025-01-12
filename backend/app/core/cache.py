import redis.asyncio as redis
from typing import Optional
from app.core.config import settings


redis_client = redis.from_url(
    settings.redis_url,
    decode_responses=True
)


async def set_cache(key: str, value: str, ttl: Optional[int] = 3600):
    """
    TTL (час життя у секундах).
    """
    await redis_client.set(key, value, ex=ttl)


# 📊 Отримання значення з Redis
async def get_cache(key: str) -> Optional[str]:
    """
    Отримує дані з Redis, якщо вони існують.
    """
    return await redis_client.get(key)


# 📊 Видалення значення з Redis
async def delete_cache(key: str):
    """
    Видаляє дані з Redis.
    """
    await redis_client.delete(key)


