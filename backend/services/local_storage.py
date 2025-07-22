# Local storage service
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..models.local_storage import LocalStorageUsers, LocalStoragePasswords, LocalStorageKPIs, LocalStorageUserSessions
from ..models.user import User
from ..schemas.local_storage import LocalStorageUserData, LocalStoragePasswordData
from ..schemas.kpi import LocalStorageKPIData
from ..schemas.user import CurrentUserData

class LocalStorageService:
    @staticmethod
    def sync_users(db: Session, data: LocalStorageUserData, current_user: User) -> dict:
        """
        Sync users with local storage
        """
        # Check if there's an existing record
        existing = db.query(LocalStorageUsers).first()
        if existing:
            existing.data = str(data.users)
            db.commit()
            return {"message": "Users synced successfully"}
        else:
            # Create new record
            new_record = LocalStorageUsers(data=str(data.users))
            db.add(new_record)
            db.commit()
            return {"message": "Users synced successfully"}

    @staticmethod
    def get_synced_users(db: Session, current_user: User) -> dict:
        """
        Get synced users from local storage
        """
        record = db.query(LocalStorageUsers).first()
        if not record:
            return {"users": []}
        
        try:
            # Convert string representation to list
            import ast
            users = ast.literal_eval(record.data)
            return {"users": users}
        except:
            return {"users": []}

    @staticmethod
    def sync_passwords(db: Session, data: LocalStoragePasswordData, current_user: User) -> dict:
        """
        Sync passwords with local storage
        """
        # Check if there's an existing record
        existing = db.query(LocalStoragePasswords).first()
        if existing:
            existing.data = str(data.passwords)
            db.commit()
            return {"message": "Passwords synced successfully"}
        else:
            # Create new record
            new_record = LocalStoragePasswords(data=str(data.passwords))
            db.add(new_record)
            db.commit()
            return {"message": "Passwords synced successfully"}

    @staticmethod
    def get_synced_passwords(db: Session, current_user: User) -> dict:
        """
        Get synced passwords from local storage
        """
        record = db.query(LocalStoragePasswords).first()
        if not record:
            return {"passwords": {}}
        
        try:
            # Convert string representation to dict
            import ast
            passwords = ast.literal_eval(record.data)
            return {"passwords": passwords}
        except:
            return {"passwords": {}}

    @staticmethod
    def sync_kpis(db: Session, data: LocalStorageKPIData, current_user: User) -> dict:
        """
        Sync KPIs with local storage
        """
        # Check if there's an existing record
        existing = db.query(LocalStorageKPIs).first()
        if existing:
            existing.data = str(data.kpis)
            db.commit()
            return {"message": "KPIs synced successfully"}
        else:
            # Create new record
            new_record = LocalStorageKPIs(data=str(data.kpis))
            db.add(new_record)
            db.commit()
            return {"message": "KPIs synced successfully"}

    @staticmethod
    def get_synced_kpis(db: Session, current_user: User) -> dict:
        """
        Get synced KPIs from local storage
        """
        record = db.query(LocalStorageKPIs).first()
        if not record:
            return {"kpis": []}
        
        try:
            # Convert string representation to list
            import ast
            kpis = ast.literal_eval(record.data)
            return {"kpis": kpis}
        except:
            return {"kpis": []}

    @staticmethod
    def sync_current_user(db: Session, user_data: CurrentUserData, current_user: User) -> dict:
        """
        Sync current user session with local storage
        """
        # Check if there's an existing record
        existing = db.query(LocalStorageUserSessions).filter(LocalStorageUserSessions.user_id == current_user.id).first()
        if existing:
            existing.data = str(user_data.user)
            db.commit()
            return {"message": "User session synced successfully"}
        else:
            # Create new record
            new_record = LocalStorageUserSessions(user_id=current_user.id, data=str(user_data.user))
            db.add(new_record)
            db.commit()
            return {"message": "User session synced successfully"}

    @staticmethod
    def get_current_user_session(db: Session, current_user: User) -> dict:
        """
        Get current user session from local storage
        """
        record = db.query(LocalStorageUserSessions).filter(LocalStorageUserSessions.user_id == current_user.id).first()
        if not record:
            return {"user": None}
        
        try:
            # Convert string representation to dict
            import ast
            user_data = ast.literal_eval(record.data)
            return {"user": user_data}
        except:
            return {"user": None}