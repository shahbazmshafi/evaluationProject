"""
API routes for granular access control system
Only accessible to super admin (sgul@trafix.com)
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config.database import get_db
from ..config.security import get_current_user
from ..models.user import User
from ..schemas.access_control import (
    GranularPermissionCreate, GranularPermissionUpdate, GranularPermissionResponse,
    UserPermissionCreate, UserPermissionUpdate, UserPermissionResponse,
    AccessControlSummary, UserGranularPermissions
)
from ..services.access_control import AccessControlService

router = APIRouter()

SUPER_ADMIN_EMAIL = "sgul@trafix.com"

def verify_super_admin(current_user: User = Depends(get_current_user)):
    """Verify that the current user is the super admin"""
    if current_user.email != SUPER_ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Only super admin can access granular access control."
        )
    return current_user

@router.get("/summary", response_model=AccessControlSummary)
def get_access_control_summary(
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Get access control summary statistics"""
    return AccessControlService.get_access_control_summary(db)

@router.get("/granular-permissions", response_model=List[GranularPermissionResponse])
def get_granular_permissions(
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Get all granular permissions"""
    return AccessControlService.get_granular_permissions(db)

@router.post("/granular-permissions", response_model=GranularPermissionResponse)
def create_granular_permission(
    permission_data: GranularPermissionCreate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Create a new granular permission"""
    return AccessControlService.create_granular_permission(db, permission_data)

@router.put("/granular-permissions/{permission_id}", response_model=GranularPermissionResponse)
def update_granular_permission(
    permission_id: int,
    permission_data: GranularPermissionUpdate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Update a granular permission"""
    updated_permission = AccessControlService.update_granular_permission(db, permission_id, permission_data)
    if not updated_permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Granular permission not found"
        )
    return updated_permission

@router.get("/users-with-permissions", response_model=List[UserGranularPermissions])
def get_users_with_granular_permissions(
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Get all users who have granular permissions assigned"""
    return AccessControlService.get_all_users_with_granular_permissions(db)

@router.get("/users/{user_id}/permissions", response_model=List[UserPermissionResponse])
def get_user_granular_permissions(
    user_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Get granular permissions for a specific user"""
    permissions = AccessControlService.get_user_granular_permissions(db, user_id)
    return [UserPermissionResponse(**p.__dict__) for p in permissions]

@router.post("/users/{user_id}/permissions", response_model=UserPermissionResponse)
def assign_permission_to_user(
    user_id: int,
    permission_data: UserPermissionCreate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Assign a granular permission to a user"""
    permission_data.user_id = user_id  # Ensure user_id matches URL
    user_permission = AccessControlService.assign_permission_to_user(db, permission_data, current_user.id)
    return UserPermissionResponse(**user_permission.__dict__)

@router.delete("/user-permissions/{user_permission_id}")
def revoke_user_permission(
    user_permission_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Revoke a user's granular permission"""
    success = AccessControlService.revoke_user_permission(db, user_permission_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User permission not found"
        )
    return {"message": "Permission revoked successfully"}

@router.get("/users/{user_id}/check-permission/{module_name}/{action_name}")
def check_user_granular_permission(
    user_id: int,
    module_name: str,
    action_name: str,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Check if a user has a specific granular permission"""
    has_permission = AccessControlService.check_user_granular_permission(db, user_id, module_name, action_name)
    return {"has_permission": has_permission}