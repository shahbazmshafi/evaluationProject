# Permission model
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from config.database import Base

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String)

    roles = relationship("RolePermission", back_populates="permission")
