from fastapi import APIRouter, Depends, HTTPException
from livekit import api
import json

from app.core.config import settings
from app.api.users.auth import current_active_user
from app.models.users.users import User

router = APIRouter(prefix="/livekit", tags=["LiveKit"])


@router.get("/token")
async def get_token(
    classroom_id: int,
    current_user: User = Depends(current_active_user),
):
    """Видає JWT-токен для під'єднання до кімнати класу в LiveKit."""
    if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET or not settings.LIVEKIT_URL:
        raise HTTPException(status_code=503, detail="LiveKit is not configured")

    room = f"classroom-{classroom_id}"
    is_staff = getattr(current_user, "role", None) == "staff" or bool(getattr(current_user, "is_superuser", False))
    role_label = "teacher" if is_staff else "student"
    token = (
        api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
        .with_identity(str(current_user.id))
        .with_name(getattr(current_user, "username", None) or f"user-{current_user.id}")
        .with_metadata(json.dumps({"role": role_label}))
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room,
                can_publish=True,
                can_subscribe=True,
            )
        )
        .to_jwt()
    )
    return {"token": token, "url": settings.LIVEKIT_URL, "room": room}