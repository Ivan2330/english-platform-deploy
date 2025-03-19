from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models.connection.chat import ChatMessage
from app.api.users.auth import current_active_user
from app.core.cache import get_cache, set_cache
import logging

router = APIRouter(prefix="/ws/chats", tags=["Chat WebSocket"])

active_chats: Dict[int, List[WebSocket]] = {}
logger = logging.getLogger("chat_ws")

CACHE_MESSAGE_LIMIT = 100


class ChatMessageSchema(BaseModel):
    content: str


async def cache_chat_message(chat_id: int, message: Dict[str, Any]):
    cache_key = f"chat:{chat_id}:messages"
    messages = await get_cache(cache_key) or []
    messages.append(message)
    if len(messages) > CACHE_MESSAGE_LIMIT:
        messages.pop(0)
    await set_cache(cache_key, messages, ttl=1800)


async def get_cached_chat_messages(chat_id: int) -> List[Dict[str, Any]]:
    cache_key = f"chat:{chat_id}:messages"
    return await get_cache(cache_key) or []


@router.websocket("/{chat_id}")
async def chat_websocket(
    websocket: WebSocket,
    chat_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),  # ✅ Використовуємо User замість Staff/Student
):
    await websocket.accept()

    if chat_id not in active_chats:
        active_chats[chat_id] = []
    active_chats[chat_id].append(websocket)

    logger.info(f"User {current_user.id} connected to chat {chat_id}")

    # 🔹 Завантаження історії чату
    cached_messages = await get_cached_chat_messages(chat_id)
    for message in cached_messages:
        await websocket.send_json(message)

    try:
        while True:
            data = await websocket.receive_json()
            message = ChatMessageSchema.parse_obj(data)

            # 🔹 Зберігаємо повідомлення в базі даних
            new_message = ChatMessage(
                chat_id=chat_id,
                user_id=current_user.id,  # ✅ Використовуємо user_id
                role=current_user.role,  # ✅ Додаємо роль ("staff" або "student")
                message=message.content,
            )
            db.add(new_message)
            await db.commit()

            chat_message = {
                "content": message.content,
                "user_id": current_user.id,
                "role": current_user.role,  # ✅ Передаємо роль користувача
                "sent_at": new_message.sent_at.isoformat(),
                "is_read": False,
            }
            await cache_chat_message(chat_id, chat_message)

            # 🔹 Розсилаємо повідомлення всім учасникам
            for connection in active_chats[chat_id]:
                try:
                    await connection.send_json(chat_message)
                except Exception as e:
                    logger.error(f"Error sending message: {e}")
                    active_chats[chat_id].remove(connection)

    except WebSocketDisconnect:
        logger.info(f"User {current_user.id} disconnected from chat {chat_id}")
        active_chats[chat_id].remove(websocket)
        if not active_chats[chat_id]:
            del active_chats[chat_id]

    finally:
        await websocket.close()
