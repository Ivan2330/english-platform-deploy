from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Block(Base):
    """Блок усередині секції. Або теорія (markdown + стиль callout),
    або завдання певного типу (multiple_choice, gap_fill, listening, video, …).
    """
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    order = Column(Integer, nullable=False, default=0)
    block_type = Column(String, nullable=False)  # "theory" | "task"

    # --- Теорія ---
    content = Column(Text, nullable=True)          # markdown
    callout_style = Column(String, nullable=True)  # tip / note / warning / example / none

    # --- Завдання ---
    task_type = Column(String, nullable=True)      # multiple_choice / gap_fill / listening / video / …
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)
    word_list = Column(Text, nullable=True)
    config = Column(Text, nullable=True)           # JSON: налаштування під конкретний тип завдання

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    section = relationship("Section", back_populates="blocks")
    questions = relationship(
        "Question",
        back_populates="block",
        cascade="all, delete-orphan",
        order_by="Question.order",
    )
    answers = relationship("Answer", back_populates="block")