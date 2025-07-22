# Role service
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..models.role import Role
from ..models.role_permission import RolePermission
from ..schemas.role import RoleCreate, RoleUpdate
from ..schemas.permission import RolePermissionCreate

class RoleService:
    @staticmethod
    def get_roles(db: Session, skip: int = 0, limit: int = 100) -> list[Role]:
        """
        Get all roles
        """
        return db.query(Role).offset(skip).limit(limit).all()

    @staticmethod
    def get_role(db: Session, role_id: int) -> Role:
        """
        Get a role by ID
        """
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role with ID {role_id} not found")
        return role

    @staticmethod
    def create_role(db: Session, role_data: RoleCreate) -> Role:
        """
        Create a new role
        """
        # Check if role name already exists
        existing_role = db.query(Role).filter(Role.name == role_data.name).first()
        if existing_role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role name already exists")

        # Create new role
        new_role = Role(
            name=role_data.name,
            is_custom=role_data.is_custom
        )

        db.add(new_role)
        db.commit()
        db.refresh(new_role)
        return new_role

    @staticmethod
    def update_role(db: Session, role_id: int, role_data: RoleUpdate) -> Role:
        """
        Update a role
        """
        # Get the role
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role with ID {role_id} not found")

        # Check if role is a system role
        if not role.is_custom:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update system roles")

        # Check if role name already exists
        if role_data.name != role.name:
            existing_role = db.query(Role).filter(Role.name == role_data.name).first()
            if existing_role:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role name already exists")

        # Update role fields
        role.name = role_data.name
        if role_data.is_custom is not None:
            role.is_custom = role_data.is_custom

        db.commit()
        db.refresh(role)
        return role

    @staticmethod
    def delete_role(db: Session, role_id: int) -> Role:
        """
        Delete a role
        """
        # Get the role
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role with ID {role_id} not found")

        # Check if role is a system role
        if not role.is_custom:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete system roles")

        # Delete the role
        db.delete(role)
        db.commit()
        return role

    @staticmethod
    def add_permission_to_role(db: Session, role_permission_data: RolePermissionCreate) -> RolePermission:
        """
        Add a permission to a role
        """
        # Check if role exists
        role = db.query(Role).filter(Role.id == role_permission_data.role_id).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role with ID {role_permission_data.role_id} not found")

        # Check if permission already exists for this role
        existing_permission = db.query(RolePermission).filter(
            RolePermission.role_id == role_permission_data.role_id,
            RolePermission.permission_id == role_permission_data.permission_id
        ).first()
        if existing_permission:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Permission already assigned to this role")

        # Create new role permission
        new_role_permission = RolePermission(
            role_id=role_permission_data.role_id,
            permission_id=role_permission_data.permission_id
        )

        db.add(new_role_permission)
        db.commit()
        db.refresh(new_role_permission)
        return new_role_permission

    @staticmethod
    def remove_permission_from_role(db: Session, role_permission_id: int) -> RolePermission:
        """
        Remove a permission from a role
        """
        # Get the role permission
        role_permission = db.query(RolePermission).filter(RolePermission.id == role_permission_id).first()
        if not role_permission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role permission with ID {role_permission_id} not found")

        # Delete the role permission
        db.delete(role_permission)
        db.commit()
        return role_permission