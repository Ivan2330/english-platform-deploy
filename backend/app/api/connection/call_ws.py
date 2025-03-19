from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from app.core.database import get_async_session
from app.models.connection.call import Call, CallParticipant
from app.api.users.auth import current_active_user
from app.models.users.users import User, Status
from app.core.cache import get_cache, set_cache, delete_cache
import logging

router = APIRouter(prefix="/ws/calls", tags=["WebSocket Calls"])

active_connections: Dict[int, List[WebSocket]] = {}
logger = logging.getLogger("websocket_calls")

class WebSocketAction(BaseModel):
    action: str
    status: bool | None = None
    quality: str | None = None

def create_message(action: str, user_id: int, **kwargs) -> Dict[str, Any]:
    message = {"action": action, "user": user_id}
    message.update(kwargs)
    return message

async def get_cached_participant_status(call_id: int, user_id: int, db: AsyncSession):
    cache_key = f"call:{call_id}:participant:{user_id}"
    status = await get_cache(cache_key)
    if not status:
        participant = await db.execute(
            select(CallParticipant).filter(
                CallParticipant.call_id == call_id,
                CallParticipant.user_id == user_id
            )
        )
        participant = participant.scalars().first()
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
        await set_cache(cache_key, status, ttl=3600)

async def notify_participants(call_id: int, message: Dict[str, Any]):
    """Відправка повідомлення всім учасникам дзвінка."""
    connections = active_connections.get(call_id, [])
    for connection in connections[:]:
        try:
            await connection.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message to participant: {e}")
            connections.remove(connection)

@router.websocket("/{call_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    call_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),  # ✅ Використовуємо User замість Staff/Student
):
    await websocket.accept()

    try:
        call = await db.get(Call, call_id)
        if not call:
            await websocket.close(code=1008, reason="Call not found")
            return

        if call.status != "active":
            await websocket.close(code=1008, reason="Call is not active")
            return

        if call_id not in active_connections:
            active_connections[call_id] = []
        active_connections[call_id].append(websocket)

        participant_status = await get_cached_participant_status(call_id, current_user.id, db)

        await notify_participants(call_id, create_message("join", current_user.id, **participant_status))

        logger.info(f"User {current_user.id} joined call {call_id}")

        while True:
            data = WebSocketAction.model_validate(await websocket.receive_json())
            action = data.action

            if action == "toggle_mic":
                updates = {"mic_status": data.status}
                await update_cached_participant_status(call_id, current_user.id, updates)
                await notify_participants(call_id, create_message("mic_status", current_user.id, status=data.status))

            elif action == "toggle_camera":
                updates = {"camera_status": data.status}
                await update_cached_participant_status(call_id, current_user.id, updates)
                await notify_participants(call_id, create_message("camera_status", current_user.id, status=data.status))

            elif action == "share_screen":
                updates = {"screen_sharing": data.status}
                await update_cached_participant_status(call_id, current_user.id, updates)
                await notify_participants(call_id, create_message("screen_sharing", current_user.id, status=data.status))

            elif action == "set_quality":
                updates = {"video_quality": data.quality}
                await update_cached_participant_status(call_id, current_user.id, updates)
                await notify_participants(call_id, create_message("quality_change", current_user.id, quality=data.quality))

            elif action == "end_call":
                if current_user.role == "staff" and current_user.status in [Status.ADMIN, Status.TEACHER]:
                    call.status = "ended"
                    call.ended_at = func.now()
                    await db.commit()
                    await notify_participants(call_id, create_message("call_ended", current_user.id))
                    break

    except WebSocketDisconnect:
        await notify_participants(call_id, create_message("leave", current_user.id))
        if websocket in active_connections.get(call_id, []):
            active_connections[call_id].remove(websocket)
        remaining_participants = await db.execute(
            select(CallParticipant).filter(CallParticipant.call_id == call_id)
        )
        if not remaining_participants.scalars().first():
            call.status = "ended"
            call.ended_at = func.now()
            await db.commit()

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        await websocket.close(code=1011, reason="Internal server error")

    finally:
        if websocket in active_connections.get(call_id, []):
            active_connections[call_id].remove(websocket)
        if not active_connections.get(call_id):
            active_connections.pop(call_id, None)

    logger.info(f"User {current_user.id} disconnected from call {call_id}")
    await websocket.close()
