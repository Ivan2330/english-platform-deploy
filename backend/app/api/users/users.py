# app/api/users/users.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
from uuid import uuid4
import imghdr
import os

from app.core.database import get_async_session
from app.models.users.users import User
from app.api.users.auth import current_active_user

router = APIRouter(tags=["Users"])  # префікс /users додається в main.py через include_router(..., prefix="/users")

# === Налаштування збереження ===
UPLOAD_DIR = Path("static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

def _ext_from_bytes(b: bytes) -> str:
    """Визначити розширення за вмістом."""
    kind = imghdr.what(None, h=b)
    if kind == "jpeg":
        return ".jpg"
    if kind in ("png", "webp"):
        return f".{kind}"
    return ".png"

@router.patch("/me/photo")
async def update_user_photo(
    request: Request,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Завантажує нове фото профілю для поточного користувача.
    Повертає absolute URL (http(s)://.../static/uploads/filename.ext)
    """
    # 1) базові валідації
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG/JPEG/WEBP allowed")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    # 2) генеруємо унікальне імʼя та розширення за фактичним типом
    ext = _ext_from_bytes(raw)
    filename = f"{current_user.id}_{uuid4().hex}{ext}"
    disk_path = UPLOAD_DIR / filename

    # 3) зберігаємо файл на диск
    with open(disk_path, "wb") as f:
        f.write(raw)

    # 4) видаляємо попередній файл (якщо був і це /static/uploads/...)
    try:
        if current_user.profile_image and current_user.profile_image.startswith("/static/"):
            old = Path(current_user.profile_image.lstrip("/"))
            if old.exists():
                old.unlink(missing_ok=True)
    except Exception:
        # не валимо запит, якщо видалення не вдалось
        pass

    # 5) зберігаємо у БД ПУБЛІЧНИЙ шлях (з початковим слешем)
    public_path = f"/static/uploads/{filename}"
    current_user.profile_image = public_path
    await session.commit()
    await session.refresh(current_user)

    # 6) повертаємо абсолютний URL
    base = str(request.base_url).rstrip("/")
    absolute_url = f"{base}{public_path}"
    return {"photo_url": absolute_url}

@router.delete("/me/photo")
async def delete_user_photo(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Видаляє фото профілю поточного користувача та чистить поле profile_image.
    """
    if not current_user.profile_image:
        raise HTTPException(status_code=404, detail="No profile image found")

    try:
        path = Path(current_user.profile_image.lstrip("/"))
        if path.exists():
            path.unlink(missing_ok=True)
    except FileNotFoundError:
        pass

    current_user.profile_image = None
    await session.commit()
    await session.refresh(current_user)

    return {"detail": "Profile image deleted successfully"}
