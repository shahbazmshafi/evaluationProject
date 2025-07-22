# Permission schemas
from pydantic import BaseModel

class PermissionResponse(BaseModel):
    id: int
    name: str
    description: str

    class Config:
        from_attributes = True

class RolePermissionCreate(BaseModel):
    role_id: int
    permission_id: int

class RolePermissionResponse(BaseModel):
    id: int
    role_id: int
    permission_id: int
    permission: PermissionResponse

    class Config:
        from_attributes = True