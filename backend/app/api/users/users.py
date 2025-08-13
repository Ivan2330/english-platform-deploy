# app/api/users/users.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
from uuid import uuid4
import imghdr

from app.core.database import get_async_session
from app.models.users.users import User
from app.api.users.auth import current_active_user

router = APIRouter(tags=["Users"])  # префікс /users додається у main.py через include_router(..., prefix="/users")

# === збереження ===
UPLOAD_DIR = Path("static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB

def _ext_from_bytes(data: bytes) -> str:
    kind = imghdr.what(None, h=data)
    if kind == "jpeg":
        return ".jpg"
    if kind in ("png", "webp"):
        return f".{kind}"
    return ".png"

def _public_path(filename: str) -> str:
    # завжди зі слешем, щоб віддавалось через /static
    return f"/static/uploads/{filename}"

def _absolute_base(request: Request) -> str:
    # коректна схема/хост за проксі
    scheme = (request.headers.get("x-forwarded-proto") or request.url.scheme).split(",")[0].strip()
    host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc).split(",")[0].strip()
    if not host:
        host = request.url.netloc
    return f"{scheme}://{host}"

@router.patch("/me/photo")
async def update_user_photo(
    request: Request,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    # валідації
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG/JPEG/WEBP allowed")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    # унікальне імʼя за фактичним форматом
    ext = _ext_from_bytes(raw)
    filename = f"{current_user.id}_{uuid4().hex}{ext}"
    disk_path = UPLOAD_DIR / filename
    with open(disk_path, "wb") as f:
        f.write(raw)

    # прибираємо попередній файл, якщо був
    try:
        old = (current_user.profile_image or "").lstrip("/")
        if old.startswith("static/"):
            old_path = Path(old)
            old_path.unlink(missing_ok=True)
    except Exception:
        pass

    # публічний шлях + збереження в БД
    public_path = _public_path(filename)
    current_user.profile_image = public_path
    await session.commit()
    await session.refresh(current_user)

    # абсолютний https‑URL
    absolute = f"{_absolute_base(request)}{public_path}"
    return {"photo_url": absolute}

@router.delete("/me/photo")
async def delete_user_photo(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    if not current_user.profile_image:
        raise HTTPException(status_code=404, detail="No profile image found")

    try:
        path = Path(current_user.profile_image.lstrip("/"))
        path.unlink(missing_ok=True)
    except FileNotFoundError:
        pass

    current_user.profile_image = None
    await session.commit()
    await session.refresh(current_user)
    return {"detail": "Profile image deleted successfully"}
