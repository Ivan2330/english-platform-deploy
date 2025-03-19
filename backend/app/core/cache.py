import json
import redis.asyncio as redis
from typing import Optional
from app.core.config import settings
from datetime import datetime
from enum import Enum


redis_client = redis.from_url(
    settings.redis_url,
    decode_responses=True
)

def custom_serializer(obj):
    """
    Функція для серіалізації нестандартних типів:
    - Enum -> str
    - datetime -> ISO 8601 str
    """
    if isinstance(obj, datetime):
        return obj.isoformat()  # ✅ Перетворюємо datetime у str
    if isinstance(obj, Enum):
        return obj.value  # ✅ Перетворюємо Enum у str
    raise TypeError(f"Type {type(obj)} not serializable")

def custom_deserializer(dct):
    """
    Функція для десеріалізації значень:
    - Перетворює рядки у datetime, якщо вони мають правильний формат.
    """
    for key, value in dct.items():
        if isinstance(value, str) and (value.endswith("Z") or "T" in value):
            try:
                dct[key] = datetime.fromisoformat(value)  # ✅ Конвертуємо назад у datetime
            except ValueError:
                pass
    return dct

async def set_cache(key: str, value: dict, ttl: Optional[int] = 3600):
    """
    Зберігає дані у Redis із TTL (часом життя у секундах).
    """
    serialized_value = json.dumps(value, default=custom_serializer)  # ✅ Використовуємо кастомний серіалізатор
    await redis_client.set(key, serialized_value, ex=ttl)

async def get_cache(key: str) -> Optional[dict]:
    """
    Отримує дані з Redis і десеріалізує їх.
    """
    value = await redis_client.get(key)
    return json.loads(value, object_hook=custom_deserializer) if value else None

# 📊 Видалення значення з Redis
async def delete_cache(key: str):
    """
    Видаляє дані з Redis.
    """
    await redis_client.delete(key)


