# User service
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate
from ..utils.password import hash_password

class UserService:
    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
        """
        Get all users
        """
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    def get_user(db: Session, user_id: int) -> User:
        """
        Get a user by ID
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
        return user

    @staticmethod
    def create_user(db: Session, user_data: UserCreate, current_user: User) -> User:
        """
        Create a new user
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
    def update_user(db: Session, user_id: int, user_data: UserUpdate, current_user: User) -> User:
        """
        Update a user
        """
        # Get the user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")

        # Update user fields
        if user_data.email is not None:
            # Check if email already exists
            existing_user = db.query(User).filter(User.email == user_data.email).first()
            if existing_user and existing_user.id != user_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
            user.email = user_data.email

        if user_data.name is not None:
            user.name = user_data.name

        if user_data.role_id is not None:
            user.role_id = user_data.role_id

        if user_data.manager_id is not None:
            user.manager_id = user_data.manager_id

        if user_data.is_active is not None:
            user.is_active = user_data.is_active

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: int, current_user: User) -> User:
        """
        Delete a user
        """
        # Get the user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")

        # Check if user is trying to delete themselves
        if user_id == current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself")

        # Delete the user
        db.delete(user)
        db.commit()
        return user