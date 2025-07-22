# User model
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from config.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String)
    role_id = Column(Integer, ForeignKey("roles.id"))
    manager_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="users")
    manager = relationship("User", remote_side=[id])
    evaluations = relationship("Evaluation", foreign_keys="Evaluation.employee_id", back_populates="employee")
    managed_evaluations = relationship("Evaluation", foreign_keys="Evaluation.manager_id", back_populates="manager")
