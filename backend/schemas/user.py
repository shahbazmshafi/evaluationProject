# User schemas
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

from .role import RoleResponse

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role_id: int
    manager_id: Optional[int] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: RoleResponse
    manager_id: Optional[int]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    user: UserResponse

    class Config:
        from_attributes = True

class CurrentUserData(BaseModel):
    user: Optional[dict] = None