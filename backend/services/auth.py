# Authentication service
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..models.user import User
from ..schemas.user import LoginRequest, UserCreate
from ..config.security import create_access_token
from ..utils.password import verify_password, hash_password, check_rate_limit, increment_failed_attempts, reset_failed_attempts

class AuthService:
    @staticmethod
    def login(db: Session, request: LoginRequest) -> dict:
        """
        Authenticate a user and return an access token
        """
        # Check if user exists
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        # Check if user is active
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive")

        # Check rate limiting
        if check_rate_limit(user.email):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many failed login attempts. Please try again later.")

        # Verify password
        if not verify_password(request.password, user.password_hash):
            # Increment failed attempts
            increment_failed_attempts(user.email)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        # Reset failed attempts on successful login
        reset_failed_attempts(user.email)

        # Create access token
        access_token = create_access_token(user.id)

        return {
            "access_token": access_token,
            "user": user
        }

    @staticmethod
    def register_user(db: Session, user_data: UserCreate, current_user: User = None) -> User:
        """
        Register a new user
        """
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        # Hash the password
        password_hash = hash_password(user_data.password)

        # Create new user
        new_user = User(
            email=user_data.email,
            name=user_data.name,
            password_hash=password_hash,
            role_id=user_data.role_id,
            manager_id=user_data.manager_id
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def validate_token(current_user: User) -> dict:
        """
        Validate a token and return the current user
        """
        return {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "role": current_user.role
        }