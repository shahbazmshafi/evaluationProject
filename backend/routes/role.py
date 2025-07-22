# Role routes
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..config.database import get_db
from ..config.security import get_current_user
from ..models.user import User
from ..schemas.role import RoleCreate, RoleUpdate, RoleResponse
from ..schemas.permission import RolePermissionCreate, RolePermissionResponse, PermissionResponse
from ..services.role import RoleService

router = APIRouter()

@router.get("", response_model=List[RoleResponse])
def get_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all roles
    """
    return RoleService.get_roles(db)

@router.get("/{role_id}", response_model=RoleResponse)
def get_role(role_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get a role by ID
    """
    return RoleService.get_role(db, role_id)

@router.post("", response_model=RoleResponse)
def create_role(role: RoleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a new role
    """
    # Check if user has permission to create roles
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create roles")
    
    return RoleService.create_role(db, role)

@router.put("/{role_id}", response_model=RoleResponse)
def update_role(role_id: int, role: RoleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update a role
    """
    # Check if user has permission to update roles
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update roles")
    
    return RoleService.update_role(db, role_id, role)

@router.delete("/{role_id}", response_model=RoleResponse)
def delete_role(role_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete a role
    """
    # Check if user has permission to delete roles
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete roles")
    
    return RoleService.delete_role(db, role_id)

@router.get("/permissions", response_model=List[PermissionResponse])
def get_permissions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all permissions
    """
    # Check if user has permission to view permissions
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view permissions")
    
    # Get all permissions from database
    from ..models.permission import Permission
    return db.query(Permission).all()

@router.post("/permissions", response_model=RolePermissionResponse)
def add_permission_to_role(role_permission: RolePermissionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Add a permission to a role
    """
    # Check if user has permission to add permissions to roles
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add permissions to roles")
    
    return RoleService.add_permission_to_role(db, role_permission)

@router.delete("/permissions/{role_permission_id}", response_model=RolePermissionResponse)
def remove_permission_from_role(role_permission_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Remove a permission from a role
    """
    # Check if user has permission to remove permissions from roles
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to remove permissions from roles")
    
    return RoleService.remove_permission_from_role(db, role_permission_id)