from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends, Query, status, HTTPException
from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError

from app.core.database import get_async_session
from app.models.users.users import User
from app.core.config import settings
import logging
import json


router = APIRouter(tags=["Classroom WebSocket"])
logger = logging.getLogger("classroom_ws")

# classroom_id -> list of {"ws": WebSocket, "user_id": int, "role": str}
active_rooms: Dict[int, List[Dict[str, Any]]] = {}

# Події, які дозволено ретранслювати
ALLOWED_EVENTS = {"go_after_me", "call_started", "call_ended", "answer_update"}
# Події, які може ініціювати лише викладач/адмін
STAFF_ONLY_EVENTS = {"go_after_me"}


async def get_user_from_token_ws(token: str, db: AsyncSession) -> User:
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


def _is_staff(user: User) -> bool:
    return getattr(user, "role", None) == "staff" or bool(getattr(user, "is_superuser", False))


def _disconnect(classroom_id: int, websocket: WebSocket) -> None:
    room = active_rooms.get(classroom_id)
    if not room:
        return
    active_rooms[classroom_id] = [c for c in room if c["ws"] is not websocket]
    if not active_rooms[classroom_id]:
        active_rooms.pop(classroom_id, None)


@router.websocket("/{classroom_id}")
async def classroom_websocket(
    websocket: WebSocket,
    classroom_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_async_session),
):
    try:
        user = await get_user_from_token_ws(token, db)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()

    staff = _is_staff(user)
    conn = {"ws": websocket, "user_id": user.id, "role": "staff" if staff else "student"}
    active_rooms.setdefault(classroom_id, []).append(conn)
    logger.info(
        f"[CLASSROOM WS] user {user.id} ({conn['role']}) joined classroom {classroom_id}"
    )

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except Exception:
                continue

            etype = msg.get("type")
            if etype not in ALLOWED_EVENTS:
                continue
            if etype in STAFF_ONLY_EVENTS and not staff:
                continue

            payload: Dict[str, Any] = {
                "type": etype,
                "from_user_id": user.id,
                "from_role": conn["role"],
            }
            if etype == "go_after_me":
                payload["lesson_id"] = msg.get("lesson_id")
                payload["section_id"] = msg.get("section_id")
                payload["scroll_ratio"] = msg.get("scroll_ratio", 0)
            elif etype == "answer_update":
                payload["block_id"] = msg.get("block_id")
                payload["question_id"] = msg.get("question_id")
                payload["value"] = msg.get("value")

            # answer_update бачить лише викладач; решта подій — усім, крім відправника
            staff_only_target = etype == "answer_update"
            for c in list(active_rooms.get(classroom_id, [])):
                if c["ws"] is websocket:
                    continue
                if staff_only_target and c["role"] != "staff":
                    continue
                try:
                    await c["ws"].send_text(json.dumps(payload))
                except Exception as e:
                    logger.error(f"[CLASSROOM WS] send error: {e}")
                    try:
                        await c["ws"].close()
                    except Exception:
                        pass
                    _disconnect(classroom_id, c["ws"])

    except WebSocketDisconnect:
        _disconnect(classroom_id, websocket)
        logger.info(f"[CLASSROOM WS] user {user.id} left classroom {classroom_id}")
    except Exception as e:
        logger.error(f"[CLASSROOM WS] unexpected error: {e}")
        _disconnect(classroom_id, websocket)
        try:
            await websocket.close()
        except Exception:
            pass