from fastapi import Depends, HTTPException
from app.api.users.auth import current_active_user
from app.models.users.users import User


def is_staff(user: User) -> bool:
    """Вчитель/адмін (role == 'staff') або суперюзер."""
    return getattr(user, "is_superuser", False) or getattr(user, "role", None) == "staff"


def require_staff(user: User = Depends(current_active_user)) -> User:
    """Залежність: пускає лише персонал, інакше 403."""
    if not is_staff(user):
        raise HTTPException(status_code=403, detail="Staff only")
    return user