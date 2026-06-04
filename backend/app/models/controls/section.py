from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Section(Base):
    """Секція уроку — пункт лівої рейки (Warm-up, Vocabulary, Grammar, …).

    Урок складається з кількох секцій; кожна секція — впорядкована стрічка блоків.
    """
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    # warmup / vocabulary / grammar / reading / listening / speaking / writing / review / homework
    kind = Column(String, nullable=False, default="general")
    icon = Column(String, nullable=True)
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    lesson = relationship("Lesson", back_populates="lesson_sections")
    blocks = relationship(
        "Block",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="Block.order",
    )