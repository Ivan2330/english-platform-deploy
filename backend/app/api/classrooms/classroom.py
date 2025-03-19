from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from typing import List

from app.core.database import get_async_session
from app.models.classrooms.classroom import Classroom
from app.models.users.users import User
from app.schemas.classrooms.classroom import ClassroomCreate, ClassroomResponse, ClassroomUpdate
from app.api.users.auth import current_active_user
from app.core.cache import set_cache, get_cache, delete_cache

router = APIRouter(prefix="/classrooms", tags=["Classrooms"])

# ✅ Оновлена перевірка доступу
def is_admin(current_user: User):
    if str(current_user.role) != "staff" or str(current_user.status) != "admin":
        raise HTTPException(status_code=403, detail="User is not authorized as admin")

def is_teacher_or_admin(current_user: User):
    if str(current_user.role) != "staff" or str(current_user.status) not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="User doesn't have access")

# 🔹 Створення класу (з урахуванням студентів)
@router.post("/", response_model=ClassroomResponse)
async def create_classroom(
    classroom: ClassroomCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)
    
    new_classroom = Classroom(
        name=classroom.name,
        type=classroom.type,
        description=classroom.description,
        teacher_id=classroom.teacher_id,
        is_active=True
    )
    session.add(new_classroom)
    await session.commit()
    await session.refresh(new_classroom)

    # ✅ Додаємо студентів у клас
    if classroom.student_ids:
        students = await session.execute(select(User).where(User.id.in_(classroom.student_ids)))
        new_classroom.students = students.scalars().all()
        await session.commit()

    # ✅ Збереження класу в кеш
    cache_key = f"classroom_{new_classroom.id}_details"
    await set_cache(cache_key, {
        "id": new_classroom.id,
        "name": new_classroom.name,
        "type": new_classroom.type,
        "description": new_classroom.description,
        "teacher_id": new_classroom.teacher_id,
        "student_ids": [s.id for s in new_classroom.students],
        "is_active": new_classroom.is_active
    }, ttl=600)

    return new_classroom

# 🔹 Отримання всіх класів
@router.get("/", response_model=List[ClassroomResponse])
async def classrooms_list(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)
    
    cache_key = "classrooms_list"
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    result = await session.execute(select(Classroom).options(joinedload(Classroom.students)))
    classrooms = result.scalars().all()

    response_data = [
        {
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "description": c.description,
            "teacher_id": c.teacher_id,
            "student_ids": [s.id for s in c.students],
            "is_active": c.is_active
        } for c in classrooms
    ]
    
    await set_cache(cache_key, response_data, ttl=600)
    
    return response_data

# 🔹 Оновлення класу (з оновленням списку студентів)
@router.put("/{classroom_id}", response_model=ClassroomResponse)
async def update_classroom(
    classroom_id: int,
    classroom: ClassroomUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(Classroom).options(joinedload(Classroom.students)).where(Classroom.id == classroom_id))
    existing_classroom = result.scalar_one_or_none()
    if not existing_classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    for key, value in classroom.model_dump(exclude_unset=True).items():
        if key == "student_ids":
            students = await session.execute(select(User).where(User.id.in_(value)))
            existing_classroom.students = students.scalars().all()
        else:
            setattr(existing_classroom, key, value)

    session.add(existing_classroom)
    await session.commit()
    await session.refresh(existing_classroom)
    
    # ✅ Оновлення кешу після оновлення класу
    cache_key = f"classroom_{classroom_id}_details"
    await set_cache(cache_key, {
        "id": existing_classroom.id,
        "name": existing_classroom.name,
        "type": existing_classroom.type,
        "description": existing_classroom.description,
        "teacher_id": existing_classroom.teacher_id,
        "student_ids": [s.id for s in existing_classroom.students],
        "is_active": existing_classroom.is_active
    }, ttl=600)

    return existing_classroom

# 🔹 Видалення класу (включаючи студентів)
@router.delete("/{classroom_id}")
async def delete_classroom(
    classroom_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(Classroom).options(joinedload(Classroom.students)).where(Classroom.id == classroom_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    # ✅ Видаляємо зв’язки студентів перед видаленням класу
    classroom.students = []
    await session.commit()

    await session.delete(classroom)
    await session.commit()
    
    # ✅ Видаляємо всі пов'язані кешовані записи
    await delete_cache(f"classroom_{classroom_id}_details")
    await delete_cache("classrooms_list")
    
    return {"detail": "Classroom deleted successfully."}
