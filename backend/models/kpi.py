# KPI model
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from config.database import Base

class KPI(Base):
    __tablename__ = "kpis"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    weightage = Column(Float)
    type = Column(String)  # global, role-based, employee-specific
    target_role_id = Column(Integer, ForeignKey("roles.id"))
    target_employee_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="active")  # draft, active, archived
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    manager_id = Column(Integer, ForeignKey("users.id"))
    is_technical = Column(Boolean, default=True)

    creator = relationship("User", foreign_keys=[created_by])
    target_role = relationship("Role", foreign_keys=[target_role_id])
    target_employee = relationship("User", foreign_keys=[target_employee_id])
    manager = relationship("User", foreign_keys=[manager_id])
