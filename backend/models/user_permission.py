# Direct User Permission model for granular access control  
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

# Import Base from the main module to ensure consistency
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# We need to use the same Base as main.py - will be injected by main.py
Base = None  # Will be set by main.py

class UserPermission:
    __tablename__ = "user_permissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    permission_id = Column(Integer, ForeignKey("permissions.id"))
    module_name = Column(String)  # e.g., 'users', 'kpis', 'evaluations'
    action_name = Column(String)  # e.g., 'read', 'write', 'delete', 'approve'
    is_active = Column(Boolean, default=True)
    granted_by = Column(Integer, ForeignKey("users.id"))
    granted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # For temporary permissions

    user = relationship("User", foreign_keys=[user_id])
    permission = relationship("Permission")
    granted_by_user = relationship("User", foreign_keys=[granted_by])