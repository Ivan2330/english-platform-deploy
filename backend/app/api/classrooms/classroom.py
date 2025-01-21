from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.classrooms.classroom import Classroom
from app.models.connection.call import Call
from app.models.connection.chat import Chat
from app.schemas.classrooms.classroom import ClassroomCreate, ClassroomResponse, ClassroomUpdate
from app.api.users.auth import current_active_staff
from app.models.users.staff import Staff, Status
from app.core.cache import set_cache, get_cache

router = APIRouter(prefix="/classrooms", tags=["Classrooms"])

def is_admin(current_user: Staff):
    if current_user.status != Status.ADMIN:
        raise HTTPException(status_code=403, detail="User is not authorized as admin")

# Create a classroom (admin only)
@router.post("/", response_model=ClassroomResponse)
async def create_classroom(
    classroom: ClassroomCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_admin(current_user)

    new_classroom = Classroom(**classroom.model_dump())
    session.add(new_classroom)
    await session.commit()
    await session.refresh(new_classroom)
    return new_classroom

# Get all classrooms
@router.get("/", response_model=List[ClassroomResponse])
async def classrooms_list(
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    cached_data = await get_cache("classrooms_list")
    if cached_data:
        return cached_data

    result = await session.execute(select(Classroom))
    classrooms = result.scalars().all()
    await set_cache("classrooms_list", classrooms, ttl=300)
    return classrooms

# Get classroom details with calls and chats
@router.get("/{classroom_id}/details", response_model=ClassroomResponse)
async def get_classroom_details(
    classroom_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    cache_key = f"classroom_{classroom_id}_details"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    result = await session.execute(select(Classroom).where(Classroom.id == classroom_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    calls_result = await session.execute(select(Call).where(Call.classroom_id == classroom_id))
    classroom.calls = calls_result.scalars().all()

    chats_result = await session.execute(select(Chat).where(Chat.classroom_id == classroom_id))
    classroom.chats = chats_result.scalars().all()

    await set_cache(cache_key, classroom, ttl=300)
    return classroom

# Update a classroom (admin only)
@router.put("/{classroom_id}", response_model=ClassroomResponse)
async def update_classroom(
    classroom_id: int,
    classroom: ClassroomUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_admin(current_user)

    result = await session.execute(select(Classroom).where(Classroom.id == classroom_id))
    existing_classroom = result.scalar_one_or_none()
    if not existing_classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    for key, value in classroom.model_dump(exclude_unset=True).items():
        setattr(existing_classroom, key, value)

    session.add(existing_classroom)
    await session.commit()
    await session.refresh(existing_classroom)
    return existing_classroom

# Delete a classroom (admin only)
@router.delete("/{classroom_id}")
async def delete_classroom(
    classroom_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_admin(current_user)

    result = await session.execute(select(Classroom).where(Classroom.id == classroom_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    await session.delete(classroom)
    await session.commit()
    return {"detail": "Classroom deleted successfully."}
