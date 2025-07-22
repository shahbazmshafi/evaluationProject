# Granular Permission model for module and action level access control
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime

from config.database import Base

class GranularPermission(Base):
    __tablename__ = "granular_permissions"

    id = Column(Integer, primary_key=True, index=True)
    module_name = Column(String, index=True)  # e.g., 'users', 'kpis', 'evaluations', 'roles'
    action_name = Column(String, index=True)  # e.g., 'read', 'write', 'delete', 'approve', 'export'
    permission_key = Column(String, unique=True, index=True)  # e.g., 'users.read', 'kpis.write'
    display_name = Column(String)  # Human readable name
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)