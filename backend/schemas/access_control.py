"""
Pydantic schemas for granular access control system
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class GranularPermissionBase(BaseModel):
    module_name: str = Field(..., description="Module name (e.g., 'users', 'kpis')")
    action_name: str = Field(..., description="Action name (e.g., 'read', 'write')")
    display_name: str = Field(..., description="Human readable name")
    description: str = Field(..., description="Permission description")

class GranularPermissionCreate(GranularPermissionBase):
    pass

class GranularPermissionUpdate(BaseModel):
    module_name: Optional[str] = None
    action_name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class GranularPermissionResponse(GranularPermissionBase):
    id: int
    permission_key: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserPermissionBase(BaseModel):
    user_id: int
    permission_id: int
    module_name: str
    action_name: str

class UserPermissionCreateRequest(BaseModel):
    permission_id: int
    module_name: str
    action_name: str
    expires_at: Optional[datetime] = None

class UserPermissionCreate(UserPermissionBase):
    expires_at: Optional[datetime] = None

class UserPermissionUpdate(BaseModel):
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None

class UserPermissionResponse(UserPermissionBase):
    id: int
    is_active: bool
    granted_by: int
    granted_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserGranularPermissions(BaseModel):
    user_id: int
    user_name: str
    user_email: str
    permissions: List[UserPermissionResponse]

class AccessControlSummary(BaseModel):
    total_users: int
    total_granular_permissions: int
    active_user_permissions: int
    modules_with_permissions: List[str]