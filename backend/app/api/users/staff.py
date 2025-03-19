from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.users.users import User
from app.schemas.users.staff import StaffCreate, StaffUpdate, StaffResponse
from app.api.users.auth import current_active_user
from app.core.cache import get_cache, set_cache, delete_cache
from app.api.users.auth import get_user_manager, UserManager
import logging


router = APIRouter(prefix="/staff", tags=["Staff"])


def is_admin(current_user: User):
    if str(current_user.role) != "staff" or str(current_user.status) != "admin":
        raise HTTPException(status_code=403, detail="User is not authorized as admin")


def is_teacher_or_admin(current_user: User):
    if str(current_user.role) != "staff" or str(current_user.status) not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="User doesn't have access")


# only for admins
@router.get("/", response_model=List[StaffResponse])
async def staff_list(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(User).where(User.role == "staff"))
    staff = result.scalars().all()
    return staff


# only for admins
@router.post("/", response_model=StaffResponse)
async def create_staff(
    staff: StaffCreate,
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    # Перевіряємо, чи користувач з таким email або username вже існує
    result = await session.execute(
        select(User).where(
            (User.email == staff.email) | (User.username == staff.username)
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400, detail="User with this email or username already exists."
        )

    try:
        # ✅ Створюємо користувача через FastAPI Users (автоматично хешується пароль)
        new_staff = await user_manager.create(StaffCreate(**staff.model_dump()))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"User creation failed: {str(e)}")

    # ✅ Конвертуємо SQLAlchemy `User` у Pydantic `StaffResponse`
    staff_response = StaffResponse.model_validate(new_staff.__dict__)

    cache_key = f"users:{new_staff.id}"
    
    try:
        await set_cache(cache_key, staff_response.model_dump(), ttl=3600)
    except Exception as e:
        print(f"⚠️ Cache error: {e}")  # Лише лог, без відкату транзакції

    return staff_response  # ✅ Повертаємо Pydantic-модель


@router.get("/me", response_model=StaffResponse)
async def get_current_staff(
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    return StaffResponse.model_validate(current_user.__dict__)


# teachers and admins
@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    staff_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    cache_key = f"users:{staff_id}"
    cached_staff = await get_cache(cache_key)
    if cached_staff:
        return cached_staff

    result = await session.execute(select(User).where(User.id == staff_id, User.role == "staff"))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found.")

    staff_response = StaffResponse.model_validate(staff.__dict__)

    await set_cache(cache_key, staff_response.model_dump(), ttl=1800)
    return staff_response


# only for admins
@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: int,
    staff: StaffUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(User).where(User.id == staff_id, User.role == "staff"))
    existing_staff = result.scalar_one_or_none()
    if not existing_staff:
        raise HTTPException(status_code=404, detail="Staff not found.")

    for key, value in staff.model_dump(exclude_unset=True).items():
        setattr(existing_staff, key, value)

    await session.commit()
    await session.refresh(existing_staff)

    staff_response = StaffResponse.model_validate(existing_staff.__dict__)

    cache_key = f"users:{staff_id}"
    await set_cache(cache_key, staff_response.model_dump(), ttl=1800)

    return staff_response


# only for admins               
@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(User).where(User.id == staff_id, User.role == "staff"))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found.")

    await session.delete(staff)
    await session.commit()

    cache_key = f"users:{staff_id}"
    await delete_cache(cache_key)

    return {"detail": "Staff deleted successfully."}
