"""Реєстрація всіх моделей на Base.metadata.

Потрібно, щоб Alembic (autogenerate) бачив усі таблиці.
Імпортуємо модулі — самі визначення класів реєструють таблиці.
"""

from app.models.users import users  # noqa: F401
from app.models.classrooms import (  # noqa: F401
    classroom,
    classroom_progress,
    classroom_task,
)
from app.models.connection import call, chat  # noqa: F401
from app.models.controls import (  # noqa: F401
    lessons,
    universal_task,
    questions,
    task_result,
    ai_feedback,
)