# Role schemas
from pydantic import BaseModel
from typing import List, Optional

from .permission import RolePermissionResponse

class RoleCreate(BaseModel):
    name: str
    is_custom: bool = True

class RoleUpdate(BaseModel):
    name: str
    is_custom: Optional[bool] = None

class RoleResponse(BaseModel):
    id: int
    name: str
    is_custom: bool
    permissions: List[RolePermissionResponse] = []

    class Config:
        from_attributes = True