# Evaluation cycle model
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from config.database import Base

class EvaluationCycle(Base):
    __tablename__ = "evaluation_cycles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    evaluation_start_date = Column(Date, nullable=False)
    evaluation_end_date = Column(Date, nullable=False)
    execution_start_date = Column(Date, nullable=False)
    execution_end_date = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="draft")  # draft, active, completed, cancelled
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    evaluations = relationship("Evaluation", back_populates="cycle")
