from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
import json


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    # Стара прив'язка до UniversalTask (лишаємо для наявних даних, тепер nullable)
    task_id = Column(Integer, ForeignKey("universal_tasks.id"), nullable=True)
    # Нова прив'язка до Block
    block_id = Column(Integer, ForeignKey("blocks.id", ondelete="CASCADE"), nullable=True)

    question_text = Column(Text, nullable=False)
    options = Column(Text, nullable=True)  # JSON
    correct_answer = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    order = Column(Integer, nullable=False)  # порядок у завданні

    task = relationship("UniversalTask", back_populates="questions")
    block = relationship("Block", back_populates="questions")

    def set_options(self, options_dict):
        """Зберігаємо у форматі JSON."""
        self.options = json.dumps(options_dict)

    def get_options(self):
        """Дістаємо з JSON у dict."""
        return json.loads(self.options) if self.options else {}