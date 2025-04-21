from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends, Query, status, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
from jose import jwt, JWTError

from app.core.database import get_async_session
from app.models.connection.chat import ChatMessage, Chat
from app.models.users.users import User
from app.core.cache import get_cache, set_cache
from app.core.config import settings
import logging
import json
from datetime import datetime


router = APIRouter(tags=["Chat WebSocket"])
logger = logging.getLogger("chat_ws")

active_chats: Dict[int, List[WebSocket]] = {}
CACHE_MESSAGE_LIMIT = 100


class ChatMessageSchema(BaseModel):
    content: str


async def get_user_from_token_ws(token: str, db: AsyncSession) -> User:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            options={"verify_aud": False}
        )
        user_id = int(payload.get("sub"))
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")


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
    token: str = Query(...),
    db: AsyncSession = Depends(get_async_session)
):
    try:
        current_user = await get_user_from_token_ws(token, db)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    chat = await db.get(Chat, chat_id)
    if not chat:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()

    if chat_id not in active_chats:
        active_chats[chat_id] = []
    active_chats[chat_id].append(websocket)
    logger.info(f"[CHAT WS] User {current_user.id} connected to chat {chat_id}")

    cached_messages = await get_cached_chat_messages(chat_id)
    for message in cached_messages:
        await websocket.send_text(json.dumps(message, default=str))

    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                message = ChatMessageSchema.model_validate(parsed)
            except Exception as e:
                logger.warning(f"[CHAT WS] Invalid JSON message: {e}")
                await websocket.close(code=1003)
                return

            new_message = ChatMessage(
                chat_id=chat_id,
                user_id=current_user.id,
                role=current_user.role,
                message=message.content,
                sent_at=func.now()
            )
            db.add(new_message)
            await db.commit()
            await db.refresh(new_message)

            chat_message = {
                "chat_id": chat_id,
                "message": message.content,
                "user_id": current_user.id,
                "role": current_user.role,
                "sent_at": datetime.utcnow().isoformat(),
                "is_read": False,
            }
            
            await cache_chat_message(chat_id, chat_message)

            for connection in list(active_chats[chat_id]):
                try:
                    await connection.send_text(json.dumps(chat_message))
                except Exception as e:
                    logger.error(f"Error sending message: {e}")
                    try:
                        await connection.close()
                    except:
                        pass
                    active_chats[chat_id].remove(connection)

    except WebSocketDisconnect:
        logger.info(f"[CHAT WS] User {current_user.id} disconnected from chat {chat_id}")
        active_chats[chat_id].remove(websocket)
        if not active_chats[chat_id]:
            del active_chats[chat_id]
