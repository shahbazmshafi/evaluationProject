# User routes
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..config.database import get_db
from ..config.security import get_current_user
from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate, UserResponse
from ..services.user import UserService
from ..services.auth import AuthService

router = APIRouter()

@router.get("", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all users
    """
    return UserService.get_users(db)

@router.post("", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a new user
    """
    # Check if user has permission to create users
    if current_user.role.name != "Admin" and current_user.role.name != "Manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create users")
    
    return UserService.create_user(db, user, current_user)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update a user
    """
    # Check if user has permission to update users
    if current_user.role.name != "Admin" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this user")
    
    return UserService.update_user(db, user_id, user, current_user)

@router.delete("/{user_id}", response_model=UserResponse)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete a user
    """
    # Check if user has permission to delete users
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete users")
    
    return UserService.delete_user(db, user_id, current_user)

@router.post("/admin", response_model=UserResponse)
def create_first_admin(user_data: dict, db: Session = Depends(get_db)):
    """
    Create the first admin user (only works if no users exist)
    """
    # Check if any users exist
    if db.query(User).count() > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin user already exists")
    
    # Create admin user
    user_create = UserCreate(
        email=user_data.get("email"),
        name=user_data.get("name"),
        password=user_data.get("password"),
        role_id=1  # Admin role
    )
    
    return AuthService.register_user(db, user_create)