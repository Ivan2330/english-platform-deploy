from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_async_session
from app.models.users.students import Student
from app.schemas.users.students import StudentBase, StudentCreate, StudentResponse
from app.api.users.auth import current_active_staff
from app.models.users.staff import Staff, Status

router = APIRouter(prefix="/students", tags=["Students"])

def is_admin(current_user: Staff):
    if current_user.status != Status.ADMIN:
        raise HTTPException(status_code=403, detail="User is not authorized as admin")

def is_teacher_or_admin(current_user: Staff):
    if current_user.status not in [Status.ADMIN, Status.TEACHER]:
        raise HTTPException(status_code=403, detail="User doesn't have access")

# Get all students
@router.get("/", response_model=List[StudentResponse])
async def students_list(
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff), 
):
    is_admin(current_user)

    result = await session.execute(select(Student))
    students = result.scalars().all()
    return students

# Create a student (admin only)
@router.post("/", response_model=StudentResponse)
async def create_student(
    student: StudentCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_admin(current_user)

    new_student = Student(**student.model_dump())
    session.add(new_student)
    await session.commit()
    await session.refresh(new_student)
    return new_student

# Get a specific student by ID
@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_teacher_or_admin(current_user)

    result = await session.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return student

# Update student details
@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    student: StudentBase,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_teacher_or_admin(current_user)

    result = await session.execute(select(Student).where(Student.id == student_id))
    existing_student = result.scalar_one_or_none()
    if not existing_student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.status == Status.ADMIN:
        # Admin can update all fields
        for key, value in student.model_dump().items():
            setattr(existing_student, key, value)
    elif current_user.status == Status.TEACHER:
        # Teacher can only update the level field
        if "level" in student.model_dump():
            existing_student.level = student.level
        else:
            raise HTTPException(status_code=403, detail="Teacher can only update level field.")

    session.add(existing_student)
    await session.commit()
    await session.refresh(existing_student)
    return existing_student

# Delete a student (admin only)
@router.delete("/{student_id}")
async def delete_student(
    student_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: Staff = Depends(current_active_staff),
):
    is_admin(current_user)

    result = await session.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    await session.delete(student)
    await session.commit()
    return {"detail": "Student deleted successfully."}
