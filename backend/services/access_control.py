"""
Service layer for granular access control system
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime

from ..models.user import User
from ..models.permission import Permission
from ..models.user_permission import UserPermission
from ..models.granular_permission import GranularPermission
from ..schemas.access_control import (
    GranularPermissionCreate, GranularPermissionUpdate,
    UserPermissionCreate, UserPermissionUpdate,
    AccessControlSummary, UserGranularPermissions
)

class AccessControlService:
    @staticmethod
    def get_granular_permissions(db: Session) -> List[GranularPermission]:
        """Get all granular permissions"""
        return db.query(GranularPermission).filter(GranularPermission.is_active == True).all()
    
    @staticmethod
    def create_granular_permission(db: Session, permission_data: GranularPermissionCreate) -> GranularPermission:
        """Create a new granular permission"""
        permission_key = f"{permission_data.module_name}.{permission_data.action_name}"
        
        db_permission = GranularPermission(
            module_name=permission_data.module_name,
            action_name=permission_data.action_name,
            permission_key=permission_key,
            display_name=permission_data.display_name,
            description=permission_data.description
        )
        
        db.add(db_permission)
        db.commit()
        db.refresh(db_permission)
        return db_permission
    
    @staticmethod
    def update_granular_permission(db: Session, permission_id: int, permission_data: GranularPermissionUpdate) -> Optional[GranularPermission]:
        """Update a granular permission"""
        db_permission = db.query(GranularPermission).filter(GranularPermission.id == permission_id).first()
        if not db_permission:
            return None
        
        for field, value in permission_data.dict(exclude_unset=True).items():
            setattr(db_permission, field, value)
        
        # Update permission key if module or action changed
        if permission_data.module_name or permission_data.action_name:
            db_permission.permission_key = f"{db_permission.module_name}.{db_permission.action_name}"
        
        db.commit()
        db.refresh(db_permission)
        return db_permission
    
    @staticmethod
    def get_user_granular_permissions(db: Session, user_id: int) -> List[UserPermission]:
        """Get all granular permissions for a user"""
        return db.query(UserPermission).filter(
            and_(
                UserPermission.user_id == user_id,
                UserPermission.is_active == True,
                or_(UserPermission.expires_at.is_(None), UserPermission.expires_at > datetime.utcnow())
            )
        ).all()
    
    @staticmethod
    def assign_permission_to_user(db: Session, permission_data: UserPermissionCreate, granted_by_id: int) -> UserPermission:
        """Assign a granular permission to a user"""
        db_user_permission = UserPermission(
            user_id=permission_data.user_id,
            permission_id=permission_data.permission_id,
            module_name=permission_data.module_name,
            action_name=permission_data.action_name,
            granted_by=granted_by_id,
            expires_at=permission_data.expires_at
        )
        
        db.add(db_user_permission)
        db.commit()
        db.refresh(db_user_permission)
        return db_user_permission
    
    @staticmethod
    def revoke_user_permission(db: Session, user_permission_id: int) -> bool:
        """Revoke a user's granular permission"""
        db_user_permission = db.query(UserPermission).filter(UserPermission.id == user_permission_id).first()
        if not db_user_permission:
            return False
        
        db_user_permission.is_active = False
        db.commit()
        return True
    
    @staticmethod
    def check_user_granular_permission(db: Session, user_id: int, module_name: str, action_name: str) -> bool:
        """Check if user has a specific granular permission"""
        user_permission = db.query(UserPermission).filter(
            and_(
                UserPermission.user_id == user_id,
                UserPermission.module_name == module_name,
                UserPermission.action_name == action_name,
                UserPermission.is_active == True,
                or_(UserPermission.expires_at.is_(None), UserPermission.expires_at > datetime.utcnow())
            )
        ).first()
        
        return user_permission is not None
    
    @staticmethod
    def get_all_users_with_granular_permissions(db: Session) -> List[UserGranularPermissions]:
        """Get all users who have granular permissions assigned"""
        users_with_permissions = db.query(User).join(UserPermission).filter(
            and_(
                UserPermission.is_active == True,
                or_(UserPermission.expires_at.is_(None), UserPermission.expires_at > datetime.utcnow())
            )
        ).distinct().all()
        
        result = []
        for user in users_with_permissions:
            permissions = AccessControlService.get_user_granular_permissions(db, user.id)
            result.append(UserGranularPermissions(
                user_id=user.id,
                user_name=user.name,
                user_email=user.email,
                permissions=[UserPermission(**p.__dict__) for p in permissions]
            ))
        
        return result
    
    @staticmethod
    def get_access_control_summary(db: Session) -> AccessControlSummary:
        """Get summary statistics for access control"""
        total_users = db.query(User).count()
        total_granular_permissions = db.query(GranularPermission).filter(GranularPermission.is_active == True).count()
        active_user_permissions = db.query(UserPermission).filter(
            and_(
                UserPermission.is_active == True,
                or_(UserPermission.expires_at.is_(None), UserPermission.expires_at > datetime.utcnow())
            )
        ).count()
        
        modules = db.query(GranularPermission.module_name).filter(GranularPermission.is_active == True).distinct().all()
        modules_with_permissions = [module[0] for module in modules]
        
        return AccessControlSummary(
            total_users=total_users,
            total_granular_permissions=total_granular_permissions,
            active_user_permissions=active_user_permissions,
            modules_with_permissions=modules_with_permissions
        )