from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from typing import List
from app.core.database import get_async_session
from app.schemas.connection.call import(
    CallCreate, CallResponse, CallUpdate,
    CallParticipantResponse, CallParticipantUpdate, CallParticipantCreate
)
from app.models.connection.call import Call, CallParticipant
from app.core.cache import get_cache, set_cache, delete_cache
from app.api.users.auth import current_active_staff, current_active_student
from app.models.users.staff import Staff
from app.models.users.students import Student
from app.models.users.staff import Status


router = APIRouter(prefix="/calls", tags=["Calls"])


def check_active(call: Call):
    if not call or call.status != "active":
        raise HTTPException(status_code=400, detail="Call is not active")

# Перевірка доступу для викладачів та адміністраторів
def is_teacher_or_admin(current_user: Staff):
    if current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="User doesn't have access")

# Універсальна залежність для доступу (викладач або студент)
def current_active_user(
    current_staff: Staff = Depends(current_active_staff),
    current_student: Student = Depends(current_active_student)
):
    return current_staff or current_student


# Створення дзвінка (тільки для викладачів)
@router.post("/", response_model=CallResponse, status_code=201)
async def create_call(
    call: CallCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    
    is_teacher_or_admin(current_user)

    new_call = Call(**call.model_dump())
    db.add(new_call)
    await db.commit()
    await db.refresh(new_call)

    cache_key = f"call:{new_call.id}"
    await set_cache(cache_key, CallResponse.model_validate(new_call).model_dump(), ttl=3600)

    return new_call

# Список дзвінків (для викладачів і студентів)
@router.get("/", response_model=List[CallResponse])
async def list_calls(
    classroom_id: int | None = None,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    
    query = select(Call)
    if classroom_id:
        query = query.filter(Call.classroom_id == classroom_id)

    result = await db.execute(query)
    calls = result.scalars().all()
    return calls

# Інформація про дзвінок (для викладачів і студентів)
@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    
    cache_key = f"call:{call_id}"
    cached_call = await get_cache(cache_key)
    if cached_call:
        return cached_call

    call = await db.get(Call, call_id)
    check_active(call)

    await set_cache(cache_key, CallResponse.model_validate(call).model_dump(), ttl=3600)
    return call


@router.put("/{call_id}", response_model=CallResponse)
async def update_call(
    call_id: int,
    call_update: CallUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_teacher_or_admin(current_user)
    
    call = await db.get(Call, call_id)
    check_active(call)

    for key, value in call_update.model_dump(exclude_unset=True).items():
        setattr(call, key, value)

    await db.commit()
    await db.refresh(call)

    cache_key = f"call:{call_id}"
    await set_cache(cache_key, CallResponse.model_validate(call).model_dump(), ttl=3600)

    return call

# Додавання учасника (викладач або студент)
@router.post("/{call_id}/join", response_model=CallParticipantResponse, status_code=201)
async def join_call(
    call_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    
    call = await db.get(Call, call_id)
    check_active(call)

    query = select(CallParticipant).filter(
        CallParticipant.call_id == call_id,
        (CallParticipant.leader_id == current_user.id if isinstance(current_user, Staff) else False) |
        (CallParticipant.user_id == current_user.id if isinstance(current_user, Student) else False)
    )
    
    existing_participant = (await db.execute(query)).scalars().first()
    if existing_participant:
        raise HTTPException(status_code=400, detail="You are already in this call")

    new_participant = CallParticipant(
        call_id=call_id,
        leader_id=current_user.id if isinstance(current_user, Staff) else None,
        user_id=current_user.id if isinstance(current_user, Student) else None,
        joined_at=func.now(),
    )
    
    db.add(new_participant)
    await db.commit()
    await db.refresh(new_participant)

    return new_participant

# Оновлення статусу учасника дзвінка (доступ для викладачів)
@router.put("/{call_id}/participants/{participant_id}", response_model=CallParticipantResponse)
async def update_participant(
    call_id: int,
    participant_id: int,
    participant_update: CallParticipantUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
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


@router.delete("/{call_id}/leave", status_code=204)
async def leave_call(
    call_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(current_active_user),
):
    query = select(CallParticipant).filter(
        CallParticipant.call_id == call_id,
        (CallParticipant.leader_id == current_user.id if isinstance(current_user, Staff) else False) |
        (CallParticipant.user_id == current_user.id if isinstance(current_user, Student) else False)
    )
    participant = (await db.execute(query)).scalars().first()
    if not participant:
        raise HTTPException(status_code=404, detail="You are not in this call")

    await db.delete(participant)
    await db.commit()

    remaining_participants = await db.execute(
        select(CallParticipant).filter(CallParticipant.call_id == call_id)
    )
    if not remaining_participants.scalars().first():
        call = await db.get(Call, call_id)
        if call:
            call.status = "ended"
            call.ended_at = func.now()
            await db.commit()

    return {"message": "You have left the call"}


# Видалення дзвінка (тільки для викладачів)
@router.delete("/{call_id}", status_code=204)
async def delete_call(
    call_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_teacher_or_admin(current_user)

    call = await db.get(Call, call_id)
    check_active(call)

    await db.delete(call)
    await db.commit()

    cache_key = f"call:{call_id}"
    await delete_cache(cache_key)

    return {"message": "Call deleted"}
