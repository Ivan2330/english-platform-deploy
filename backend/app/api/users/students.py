from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_async_session
from app.models.users.users import User
from app.schemas.users.students import (
    StudentCreate, StudentResponse, StudentUpdate, 
    StudentSubscriptionUpdate, StudentLevelUpdate, StudentBalanceUpdate
)
from app.api.users.auth import current_active_user, get_user_manager, UserManager
from app.core.cache import get_cache, set_cache, delete_cache

router = APIRouter(prefix="/students", tags=["Students"])


# 🛡️ Перевірка прав доступу
def is_admin(current_user: User):
    if str(current_user.role) != "staff" or str(current_user.status) != "admin":
        raise HTTPException(status_code=403, detail="User is not authorized as admin")


def is_teacher_or_admin(current_user: User):
    if str(current_user.role) != "staff" or str(current_user.status) not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="User doesn't have access")


# 🔹 Отримання інформації про поточного студента
@router.get("/me", response_model=StudentResponse)
async def get_current_student(
    current_user: User = Depends(current_active_user),
):
    if str(current_user.role) != "student":
        raise HTTPException(status_code=403, detail="User is not a student")

    return StudentResponse.model_validate(current_user.__dict__)


# 🔹 Отримання всіх студентів (тільки для адмінів)
@router.get("/", response_model=list[StudentResponse])
async def students_list(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(User).where(User.role == "student"))
    students = result.scalars().all()
    return students


# 🔹 Створення студента (тільки для адмінів)
@router.post("/", response_model=StudentResponse)
async def create_student(
    student: StudentCreate,
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    # Перевірка унікальності email та username
    result = await session.execute(
        select(User).where(
            (User.email == student.email) | (User.username == student.username)
        )
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email or username already exists.")

    try:
        new_student = await user_manager.create(StudentCreate(**student.model_dump()))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"User creation failed: {str(e)}")

    student_response = StudentResponse.model_validate(new_student.__dict__)

    cache_key = f"users:{new_student.id}"
    await set_cache(cache_key, student_response.model_dump(), ttl=3600)

    return student_response


# 🔹 Отримання студента за ID
@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    cache_key = f"users:{student_id}"
    cached_student = await get_cache(cache_key)
    if cached_student:
        return cached_student

    result = await session.execute(select(User).where(User.id == student_id, User.role == "student"))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student_response = StudentResponse.model_validate(student.__dict__)

    await set_cache(cache_key, student_response.model_dump(), ttl=1800)
    return student_response


# 🔹 Оновлення студента (адмін може все, вчитель тільки рівень)
@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    student: StudentUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    result = await session.execute(select(User).where(User.id == student_id, User.role == "student"))
    existing_student = result.scalar_one_or_none()
    if not existing_student:
        raise HTTPException(status_code=404, detail="Student not found.")

    update_data = student.model_dump(exclude_unset=True)

    if str(current_user.status) == "admin":
        for key, value in update_data.items():
            setattr(existing_student, key, value)

    elif str(current_user.status) == "teacher":
        if "level" in update_data:
            existing_student.level = update_data["level"]
        else:
            raise HTTPException(status_code=403, detail="Teacher can only update level field.")

    await session.commit()
    await session.refresh(existing_student)

    student_response = StudentResponse.model_validate(existing_student.__dict__)

    cache_key = f"users:{student_id}"
    await set_cache(cache_key, student_response.model_dump(), ttl=1800)

    return student_response


# 🔹 Оновлення підписки студента (тільки для адмінів)
@router.patch("/{student_id}/subscription", response_model=StudentResponse)
async def update_student_subscription(
    student_id: int,
    subscription: StudentSubscriptionUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(User).where(User.id == student_id, User.role == "student"))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.subscription_type = subscription.subscription_type

    await session.commit()
    await session.refresh(student)

    cache_key = f"users:{student_id}"
    await set_cache(cache_key, StudentResponse.model_validate(student.__dict__).model_dump(), ttl=1800)

    return student


# 🔹 Оновлення рівня студента (адмін і вчитель)
@router.patch("/{student_id}/level", response_model=StudentResponse)
async def update_student_level(
    student_id: int,
    level_update: StudentLevelUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_teacher_or_admin(current_user)

    result = await session.execute(select(User).where(User.id == student_id, User.role == "student"))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.level = level_update.level

    await session.commit()
    await session.refresh(student)

    cache_key = f"users:{student_id}"
    await set_cache(cache_key, StudentResponse.model_validate(student.__dict__).model_dump(), ttl=1800)

    return student


# 🔹 Оновлення балансу студента (тільки адміни)
@router.patch("/{student_id}/balance", response_model=StudentResponse)
async def update_student_balance(
    student_id: int,
    balance_update: StudentBalanceUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(User).where(User.id == student_id, User.role == "student"))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.lesson_balance = balance_update.lesson_balance

    await session.commit()
    await session.refresh(student)

    cache_key = f"users:{student_id}"
    await set_cache(cache_key, StudentResponse.model_validate(student.__dict__).model_dump(), ttl=1800)

    return student


@router.delete("/{student_id}")
async def delete_student(
    student_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    is_admin(current_user)

    result = await session.execute(select(User).where(User.id == student_id, User.role == "student"))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    await session.delete(student)
    await session.commit()

    cache_key = f"users:{student_id}"
    await delete_cache(cache_key)

    return {"detail": "Student deleted successfully."}