# Role model
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship

from config.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    is_custom = Column(Boolean, default=False)

    users = relationship("User", back_populates="role")
    permissions = relationship("RolePermission", back_populates="role")
