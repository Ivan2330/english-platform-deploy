from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from typing import List
from app.core.database import get_async_session
from app.schemas.connection.call import (
    CallCreate, CallResponse, CallUpdate,
    CallParticipantResponse, CallParticipantUpdate
)
from app.models.connection.call import Call, CallParticipant
from app.core.cache import get_cache, set_cache, delete_cache
from app.api.users.auth import current_active_user
from app.models.users.users import User, Status

router = APIRouter(prefix="/calls", tags=["Calls"])


def check_active(call: Call):
    """Перевіряє, чи дзвінок активний."""
    if not call or call.status != "active":
        raise HTTPException(status_code=400, detail="Call is not active")


def is_teacher_or_admin(current_user: User):
    if str(current_user.role) != "staff" or str(current_user.status) not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="User doesn't have access")


# 🔹 Створення дзвінка (тільки для викладачів)
@router.post("/", response_model=CallResponse, status_code=201)
async def create_call(
    call: CallCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    new_call = Call(**call.model_dump())
    db.add(new_call)
    await db.commit()
    await db.refresh(new_call)

    cache_key = f"call:{new_call.id}"
    await set_cache(cache_key, CallResponse.model_validate(new_call).model_dump(), ttl=1800)

    return new_call


# 🔹 Отримання списку дзвінків (без кешування)
@router.get("/", response_model=List[CallResponse])
async def list_calls(
    classroom_id: int | None = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    query = select(Call).order_by(Call.created_at.desc())
    if classroom_id:
        query = query.filter(Call.classroom_id == classroom_id)

    result = await db.execute(query)
    calls = result.scalars().all()
    return calls


# 🔹 Отримання інформації про дзвінок (кешується)
@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    cache_key = f"call:{call_id}"
    cached_call = await get_cache(cache_key)
    if cached_call:
        return cached_call

    call = await db.get(Call, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    await set_cache(cache_key, CallResponse.model_validate(call).model_dump(), ttl=3600)
    return call


# 🔹 Оновлення дзвінка (тільки для викладачів)
@router.put("/{call_id}", response_model=CallResponse)
async def update_call(
    call_id: int,
    call_update: CallUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    call = await db.get(Call, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    for key, value in call_update.model_dump(exclude_unset=True).items():
        setattr(call, key, value)

    await db.commit()
    await db.refresh(call)

    cache_key = f"call:{call_id}"
    await set_cache(cache_key, CallResponse.model_validate(call).model_dump(), ttl=1800)

    return call


# 🔹 Додавання учасника у дзвінок
@router.post("/{call_id}/join", response_model=CallParticipantResponse, status_code=201)
async def join_call(
    call_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    call = await db.get(Call, call_id)
    check_active(call)

    existing_participant = await db.execute(
        select(CallParticipant).where(CallParticipant.call_id == call_id, CallParticipant.user_id == current_user.id)
    )
    existing = existing_participant.scalars().first()
    if existing:
        if existing.left_at is None:
            raise HTTPException(status_code=400, detail="You are already in this call")
        else:
            existing.joined_at = func.now()
            existing.left_at = None
            await db.commit()
            await db.refresh(existing)
            return existing


    role = "teacher" if current_user.role == "staff" else "student"
    new_participant = CallParticipant(
        call_id=call_id,
        user_id=current_user.id,
        role=role,
        joined_at=func.now(),
    )
    
    db.add(new_participant)
    await db.commit()
    await db.refresh(new_participant)

    return new_participant

@router.get("/{call_id}/participants", response_model=List[CallParticipantResponse])
async def get_call_participants(
    call_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    call = await db.get(Call, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    result = await db.execute(select(CallParticipant).where(CallParticipant.call_id == call_id))
    participants = result.scalars().all()
    return participants


# 🔹 Отримання конкретного учасника дзвінка
@router.get("/{call_id}/participants/{participant_id}", response_model=CallParticipantResponse)
async def get_call_participant(
    call_id: int,
    participant_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    participant = await db.get(CallParticipant, participant_id)
    if not participant or participant.call_id != call_id:
        raise HTTPException(status_code=404, detail="Participant not found in this call")

    return participant
# 🔹 Оновлення статусу учасника
@router.put("/{call_id}/participants/{participant_id}", response_model=CallParticipantResponse)
async def update_participant(
    call_id: int,
    participant_id: int,
    participant_update: CallParticipantUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    participant = await db.get(CallParticipant, participant_id)
    if not participant or participant.call_id != call_id:
        raise HTTPException(status_code=404, detail="Participant not found")

    for key, value in participant_update.model_dump(exclude_unset=True).items():
        setattr(participant, key, value)

    await db.commit()
    await db.refresh(participant)

    return participant


# 🔹 Видалення учасника з дзвінка
@router.delete("/{call_id}/participants/{user_id}", status_code=204)
async def remove_participant(
    call_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    participant = await db.execute(select(CallParticipant).where(
        CallParticipant.call_id == call_id, CallParticipant.user_id == user_id
    ))
    participant = participant.scalars().first()

    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found in this call")

    await db.delete(participant)
    await db.commit()

    return {"message": "Participant removed from call"}


from datetime import datetime, timezone

@router.delete("/{call_id}/leave", status_code=204)
async def leave_call(
    call_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    participant_query = select(CallParticipant).filter(
        CallParticipant.call_id == call_id,
        CallParticipant.user_id == current_user.id
    )
    participant = (await db.execute(participant_query)).scalars().first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="You are not in this call")

    # ✅ Автоматично встановлюємо `left_at` перед видаленням
    participant.left_at = datetime.now(timezone.utc).replace(tzinfo=None)

    await db.commit()
    await db.delete(participant)
    await db.commit()

    # ✅ Перевіряємо, чи є ще учасники у дзвінку
    remaining_participants_query = select(CallParticipant).filter(CallParticipant.call_id == call_id)
    remaining_participants = (await db.execute(remaining_participants_query)).scalars().all()
    
    if not remaining_participants:
        call = await db.get(Call, call_id)
        if call:
            call.status = "ended"
            await db.commit()

    return {"message": "You have left the call"}



# 🔹 Видалення дзвінка (тільки для викладачів)
@router.delete("/{call_id}", status_code=204)
async def delete_call(
    call_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    call = await db.get(Call, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    await db.delete(call)
    await db.commit()

    cache_key = f"call:{call_id}"
    await delete_cache(cache_key)

    return {"message": "Call deleted"}