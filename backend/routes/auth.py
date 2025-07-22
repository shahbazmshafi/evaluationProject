# Authentication routes
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from ..config.database import get_db
from ..config.security import get_current_user
from ..models.user import User
from ..schemas.user import LoginRequest, LoginResponse
from ..services.auth import AuthService

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user and return an access token
    """
    return AuthService.login(db, request)

@router.post("/validate-token")
def validate_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Validate a token and return the current user
    """
    return AuthService.validate_token(current_user)

@router.post("/logout")
def logout():
    """
    Logout a user (client-side only)
    """
    return {"message": "Logged out successfully"}