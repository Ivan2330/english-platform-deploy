from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
import json


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("universal_tasks.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(Text, nullable=True) #JSON
    correct_answer = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    order = Column(Integer, nullable=False)  #order in test

    task = relationship("UniversalTask", back_populates="questions")

    def set_options(self, options_dict):
        """Saving in JSON format"""
        self.options = json.dumps(options_dict)

    def get_options(self):
        """Getting from JSON to Dict"""
        return json.loads(self.options) if self.options else {}
