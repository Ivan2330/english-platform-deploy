from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.users.staff import Staff, Status
from app.schemas.users.staff import StaffCreate, StaffUpdate, StaffResponse
from app.api.users.auth import current_active_staff
from app.core.cache import get_cache, set_cache, delete_cache

router = APIRouter(prefix="/staff", tags=["Staff"])


def is_admin(current_user: Staff):
    if current_user.status != Status.ADMIN:
        raise HTTPException(status_code=403, detail="User is not authorized as admin")


def is_teacher_or_admin(current_user: Staff):
    if current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="User doesn't have access")


@router.post("/", response_model=StaffResponse, status_code=201)
async def create_staff(
    staff: StaffCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    
    if current_user.status != Status.ADMIN:
        raise HTTPException(status_code=403, detail="not access")

    existing_staff = await db.execute(
        select(Staff).filter((Staff.email == staff.email) | (Staff.username == staff.username))
    )
    if existing_staff.scalar():
        raise HTTPException(status_code=400, detail="Email or username already exists")

    new_staff = Staff(**staff.model_dump())
    db.add(new_staff)
    await db.commit()
    await db.refresh(new_staff)

    cache_key = f"staff:{new_staff.id}"
    await set_cache(cache_key, StaffResponse.model_validate(new_staff).model_dump(), ttl=3600)

    return new_staff


@router.get("/", response_model=List[StaffResponse])
async def list_users(
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    
    is_teacher_or_admin(current_user)

    query = await db.execute(select(Staff))
    staff_list = query.scalars().all()
    return staff_list


@router.get("/{staff_id}", response_model=StaffResponse)
async def read_staff(
    staff_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    
    is_teacher_or_admin(current_user)

    cache_key = f"staff:{staff_id}"
    cached_staff = await get_cache(cache_key)
    if cached_staff:
        return cached_staff

    staff = await db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="User not found")

    return staff


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: int,
    updated_staff: StaffUpdate,
    current_user: Staff = Depends(current_active_staff),
    db: AsyncSession = Depends(get_async_session),
):
    
    is_admin(current_user)

    staff = await db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    for key, value in updated_staff.model_dump(exclude_unset=True).items():
        setattr(staff, key, value)

    await db.commit()
    await db.refresh(staff)

    cache_key = f"staff:{staff_id}"
    await set_cache(cache_key, StaffResponse.model_validate(staff).model_dump(), ttl=3600)

    return staff


@router.delete("/{staff_id}", status_code=204)
async def delete_staff(
    staff_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    
    is_admin(current_user)

    staff = await db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    await db.delete(staff)
    await db.commit()

    cache_key = f"staff:{staff_id}"
    await delete_cache(cache_key)

    return {"message": "Staff member deleted"}
