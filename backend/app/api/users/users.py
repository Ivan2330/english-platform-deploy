from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_async_session
from app.models.users.users import User
from app.api.users.auth import current_active_user
import os

router = APIRouter(tags=["Users"])


@router.patch("/me/photo")
async def update_staff_photo(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Завантажує нове фото профілю для User."""

    upload_dir = "static/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = f"{upload_dir}/{current_user.id}_{file.filename}"

    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())

    current_user.profile_image = file_location
    await session.commit()
    await session.refresh(current_user)
    
    print("📸 Saved photo to:", file_location)
    print("📸 User profile_image:", current_user.profile_image)

    return {"photo_url": file_location}


@router.delete("/me/photo")
async def delete_staff_photo(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Видаляє фото профілю User."""

    if not current_user.profile_image:
        raise HTTPException(status_code=404, detail="No profile image found")

    try:
        os.remove(current_user.profile_image)
    except FileNotFoundError:
        pass

    current_user.profile_image = None
    await session.commit()
    await session.refresh(current_user)

    return {"detail": "Profile image deleted successfully"}