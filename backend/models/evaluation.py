# Evaluation model
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from config.database import Base

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"))
    manager_id = Column(Integer, ForeignKey("users.id"))
    cycle_id = Column(Integer, ForeignKey("evaluation_cycles.id"), nullable=True)  # Reference to evaluation cycle
    period = Column(String)
    raw_score = Column(Float)
    normalized_score = Column(Float)
    performance_label = Column(String)
    increment_percentage = Column(Float)
    status = Column(String, default="draft")  # draft, submitted, approved, rejected
    comments = Column(Text)
    manager_comments = Column(Text)  # Manager-only comments
    admin_comments = Column(Text)  # Admin-only comments
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime)  # When the evaluation was submitted
    approved_at = Column(DateTime)  # When the evaluation was approved
    rejected_at = Column(DateTime)  # When the evaluation was rejected
    created_by = Column(Integer, ForeignKey("users.id"))  # Who created the evaluation
    submitted_by = Column(Integer, ForeignKey("users.id"), default=None)  # Who submitted the evaluation
    drafted_by = Column(Integer, ForeignKey("users.id"), default=None)  # Who saved the draft
    
    def __init__(self, **kwargs):
        # Explicitly handle all columns including submitted_by and drafted_by
        for key, value in kwargs.items():
            setattr(self, key, value)

    employee = relationship("User", foreign_keys=[employee_id], back_populates="evaluations")
    manager = relationship("User", foreign_keys=[manager_id], back_populates="managed_evaluations")
    creator = relationship("User", foreign_keys=[created_by])
    submitter = relationship("User", foreign_keys=[submitted_by])
    drafter = relationship("User", foreign_keys=[drafted_by])
    cycle = relationship("EvaluationCycle", back_populates="evaluations")
    kpi_evaluations = relationship("KPIEvaluation", back_populates="evaluation")
