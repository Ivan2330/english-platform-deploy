from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends, HTTPException, Query
from fastapi.websockets import WebSocketState
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Dict, Any
from app.core.config import settings
from app.core.database import get_async_session
from app.models.connection.call import Call, CallParticipant
from app.models.users.users import User, Status
from app.core.cache import get_cache, set_cache
import logging

router = APIRouter(prefix="/ws/calls", tags=["WebSocket Calls"])
logger = logging.getLogger("websocket_calls")


class WebSocketAction(BaseModel):
    action: str
    status: bool | None = None
    quality: str | None = None
    candidate: dict | None = None
    offer: dict | None = None
    answer: dict | None = None


def create_message(action: str, user_id: int, **kwargs) -> Dict[str, Any]:
    return {"action": action, "user": user_id, **kwargs}


async def get_user_from_token(token: str, db: AsyncSession) -> User:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            options={"verify_aud": False},
        )
        user_id = int(payload.get("sub"))
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")


async def get_cached_participant_status(call_id: int, user_id: int, db: AsyncSession):
    cache_key = f"call:{call_id}:participant:{user_id}"
    status = await get_cache(cache_key)
    if not status:
        result = await db.execute(
            select(CallParticipant).filter(
                CallParticipant.call_id == call_id,
                CallParticipant.user_id == user_id
            )
        )
        participant = result.scalars().first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        status = {
            "mic_status": participant.mic_status,
            "camera_status": participant.camera_status,
            "screen_sharing": participant.screen_sharing,
            "video_quality": participant.video_quality,
        }
        await set_cache(cache_key, status, ttl=1800)
    return status


async def update_cached_participant_status(call_id: int, user_id: int, updates: Dict[str, Any]):
    cache_key = f"call:{call_id}:participant:{user_id}"
    status = await get_cache(cache_key)
    if status:
        status.update(updates)
        await set_cache(cache_key, status, ttl=1800)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Dict[int, WebSocket]] = {}

    async def connect(self, call_id: int, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if call_id not in self.active_connections:
            self.active_connections[call_id] = {}

        if user_id in self.active_connections[call_id]:
            try:
                await self.active_connections[call_id][user_id].close()
            except Exception as e:
                logger.warning(f"[WS ERROR] closing previous WS of user {user_id}: {e}")

        self.active_connections[call_id][user_id] = websocket
        logger.info(f"[WS CONNECT] User {user_id} joined call {call_id}")

    def disconnect(self, call_id: int, user_id: int):
        if call_id in self.active_connections:
            self.active_connections[call_id].pop(user_id, None)
            if not self.active_connections[call_id]:
                self.active_connections.pop(call_id)
            logger.info(f"[WS DISCONNECT] User {user_id} disconnected from call {call_id}")

    async def send_personal_message(self, message: dict, call_id: int, user_id: int):
        ws = self.active_connections.get(call_id, {}).get(user_id)
        if ws and ws.client_state == WebSocketState.CONNECTED:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"[WS ERROR] send to {user_id}: {e}")

    async def broadcast(self, call_id: int, message: dict, exclude_user_id: int | None = None):
        if call_id in self.active_connections:
            for uid, ws in list(self.active_connections[call_id].items()):
                if exclude_user_id is None or uid != exclude_user_id:
                    if ws.client_state == WebSocketState.CONNECTED:
                        try:
                            await ws.send_json(message)
                        except Exception as e:
                            logger.warning(f"[WS ERROR] broadcast to {uid}: {e}")

    def is_connected(self, call_id: int, user_id: int) -> bool:
        return user_id in self.active_connections.get(call_id, {})


connection_manager = ConnectionManager()


@router.websocket("/{call_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    call_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_async_session),
):
    try:
        user = await get_user_from_token(token, db)
    except HTTPException:
        await websocket.close(code=1008)
        return

    call = await db.get(Call, call_id)
    if not call or call.status != "active":
        await websocket.close(code=1008, reason="Invalid or inactive call")
        return

    await connection_manager.connect(call_id, user.id, websocket)

    try:
        participant_status = await get_cached_participant_status(call_id, user.id, db)
        await connection_manager.broadcast(
            call_id,
            create_message("join", user.id, **participant_status),
            exclude_user_id=user.id
        )

        while True:
            message = await websocket.receive_json()
            data = WebSocketAction.model_validate(message)
            logger.debug(f"[WS DATA] {data}")

            if data.action == "toggle_mic":
                await update_cached_participant_status(call_id, user.id, {"mic_status": data.status})
                await connection_manager.broadcast(call_id, create_message("mic_status", user.id, status=data.status))

            elif data.action == "toggle_camera":
                await update_cached_participant_status(call_id, user.id, {"camera_status": data.status})
                await connection_manager.broadcast(call_id, create_message("camera_status", user.id, status=data.status))

            elif data.action == "share_screen":
                await update_cached_participant_status(call_id, user.id, {"screen_sharing": data.status})
                await connection_manager.broadcast(call_id, create_message("screen_sharing", user.id, status=data.status))

            elif data.action == "set_quality":
                await update_cached_participant_status(call_id, user.id, {"video_quality": data.quality})
                await connection_manager.broadcast(call_id, create_message("quality_change", user.id, quality=data.quality))

            elif data.action == "end_call":
                if user.role == "staff" and user.status in [Status.ADMIN, Status.TEACHER]:
                    call.status = "ended"
                    call.ended_at = func.now()
                    await db.commit()
                    await connection_manager.broadcast(call_id, create_message("call_ended", user.id))
                    break

            elif data.action in ["offer", "answer", "ice_candidate"]:
                relay = {
                    "action": data.action,
                    "user": user.id,
                    "candidate": data.candidate,
                    "offer": data.offer,
                    "answer": data.answer,
                }
                await connection_manager.broadcast(call_id, relay, exclude_user_id=user.id)

    except WebSocketDisconnect:
        logger.info(f"[DISCONNECT] User {user.id} left call {call_id}")
        await connection_manager.broadcast(call_id, create_message("leave", user.id), exclude_user_id=user.id)
    except Exception as e:
        logger.error(f"[WS FATAL ERROR] {e}")
        await websocket.close(code=1011, reason="Internal error")
    finally:
        connection_manager.disconnect(call_id, user.id)
