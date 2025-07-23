from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, or_, and_, func, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
import jwt
import sqlite3
import os
import json
import logging
import sys

# Add utils directory to path if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.password import hash_password, verify_password, check_rate_limit, increment_failed_attempts, reset_failed_attempts

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/employee_eval.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# FastAPI app
app = FastAPI(title="Employee Evaluation Portal", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
SECRET_KEY = "project-bolt-secure-key-for-jwt-token-validation"

# Database Models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String)
    role_id = Column(Integer, ForeignKey("roles.id"))
    manager_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="users")
    manager = relationship("User", remote_side=[id])
    evaluations = relationship("Evaluation", foreign_keys="Evaluation.employee_id", back_populates="employee")
    managed_evaluations = relationship("Evaluation", foreign_keys="Evaluation.manager_id", back_populates="manager")

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    is_custom = Column(Boolean, default=False)

    users = relationship("User", back_populates="role")
    permissions = relationship("RolePermission", back_populates="role")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String)

    roles = relationship("RolePermission", back_populates="permission")

class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    permission_id = Column(Integer, ForeignKey("permissions.id"))

    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="roles")

class KPI(Base):
    __tablename__ = "kpis"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    weightage = Column(Float)
    type = Column(String)  # global, role-based, employee-specific
    target_role_id = Column(Integer, ForeignKey("roles.id"))
    target_employee_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="active")  # draft, active, archived
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    manager_id = Column(Integer, ForeignKey("users.id"))
    is_technical = Column(Boolean, default=True)

    creator = relationship("User", foreign_keys=[created_by])
    target_role = relationship("Role", foreign_keys=[target_role_id])
    target_employee = relationship("User", foreign_keys=[target_employee_id])
    manager = relationship("User", foreign_keys=[manager_id])

class EvaluationCycle(Base):
    __tablename__ = "evaluation_cycles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    evaluation_start_date = Column(DateTime, nullable=False)
    evaluation_end_date = Column(DateTime, nullable=False)
    execution_start_date = Column(DateTime, nullable=False)
    execution_end_date = Column(DateTime, nullable=False)
    status = Column(String, nullable=False, default="draft")  # draft, active, completed, cancelled
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    evaluations = relationship("Evaluation", back_populates="cycle")

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"))
    manager_id = Column(Integer, ForeignKey("users.id"))
    cycle_id = Column(Integer, ForeignKey("evaluation_cycles.id"), nullable=True)  # Reference to evaluation cycle
    period = Column(String)
    raw_score = Column(Float)
    normalized_score = Column(Float)
    performance_label = Column(String)
    increment_percentage = Column(Float)
    status = Column(String, default="draft")  # draft, submitted, approved, rejected
    comments = Column(Text)
    manager_comments = Column(Text)  # Manager-only comments
    admin_comments = Column(Text)  # Admin-only comments
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime)  # When the evaluation was submitted
    approved_at = Column(DateTime)  # When the evaluation was approved
    rejected_at = Column(DateTime)  # When the evaluation was rejected
    created_by = Column(Integer, ForeignKey("users.id"))  # Who created the evaluation
    drafted_by = Column(Integer, ForeignKey("users.id"))  # Who drafted the evaluation

    employee = relationship("User", foreign_keys=[employee_id], back_populates="evaluations")
    manager = relationship("User", foreign_keys=[manager_id], back_populates="managed_evaluations")
    creator = relationship("User", foreign_keys=[created_by])
    drafter = relationship("User", foreign_keys=[drafted_by])
    cycle = relationship("EvaluationCycle", back_populates="evaluations")
    kpi_evaluations = relationship("KPIEvaluation", back_populates="evaluation")

class KPIEvaluation(Base):
    __tablename__ = "kpi_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"))
    kpi_id = Column(Integer, ForeignKey("kpis.id"))

    # KPI snapshot data
    title = Column(String)
    description = Column(Text)
    category = Column(String)  # technical or admin
    weightage = Column(Float)

    # Rating data
    rating = Column(Integer)
    comment = Column(Text)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    evaluation = relationship("Evaluation", back_populates="kpi_evaluations")
    kpi = relationship("KPI")

# Keep the old KPIRating model for backward compatibility
class KPIRating(Base):
    __tablename__ = "kpi_ratings"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"))
    kpi_id = Column(Integer, ForeignKey("kpis.id"))
    rating = Column(Integer)
    comment = Column(Text)
    weightage = Column(Float)

    evaluation = relationship("Evaluation")
    kpi = relationship("KPI")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String)
    title = Column(String)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

class UserPermission(Base):
    __tablename__ = "user_permissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    permission_id = Column(Integer, ForeignKey("permissions.id"))
    module_name = Column(String)  # e.g., 'users', 'kpis', 'evaluations'
    action_name = Column(String)  # e.g., 'read', 'write', 'delete', 'approve'
    is_active = Column(Boolean, default=True)
    granted_by = Column(Integer, ForeignKey("users.id"))
    granted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # For temporary permissions

    user = relationship("User", foreign_keys=[user_id])
    permission = relationship("Permission")
    granted_by_user = relationship("User", foreign_keys=[granted_by])

class GranularPermission(Base):
    __tablename__ = "granular_permissions"

    id = Column(Integer, primary_key=True, index=True)
    module_name = Column(String, index=True)  # e.g., 'users', 'kpis', 'evaluations', 'roles'
    action_name = Column(String, index=True)  # e.g., 'read', 'write', 'delete', 'approve', 'export'
    permission_key = Column(String, unique=True, index=True)  # e.g., 'users.read', 'kpis.write'
    display_name = Column(String)  # Human readable name
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class LocalStorageUsers(Base):
    __tablename__ = "localStorage_users"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Text)

class LocalStoragePasswords(Base):
    __tablename__ = "localStorage_passwords"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Text)

class LocalStorageKPIs(Base):
    __tablename__ = "localStorage_kpis"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Text)

class LocalStorageUserSessions(Base):
    __tablename__ = "localStorage_user_sessions"

    user_id = Column(Integer, primary_key=True, index=True)
    data = Column(Text)

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role_id: int
    manager_id: Optional[int] = None

class PermissionResponse(BaseModel):
    id: int
    name: str
    description: str

    class Config:
        from_attributes = True

class RolePermissionResponse(BaseModel):
    id: int
    role_id: int
    permission_id: int
    permission: PermissionResponse

    class Config:
        from_attributes = True

class RoleResponse(BaseModel):
    id: int
    name: str
    is_custom: bool
    permissions: List[RolePermissionResponse] = []

    class Config:
        from_attributes = True

class RoleCreate(BaseModel):
    name: str
    is_custom: bool = True

class RoleUpdate(BaseModel):
    name: str
    is_custom: Optional[bool] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None

class RolePermissionCreate(BaseModel):
    role_id: int
    permission_id: int

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

class KPICreate(BaseModel):
    title: str
    description: str
    weightage: float
    type: str
    target_role_id: Optional[int] = None
    target_employee_id: Optional[int] = None
    status: str = "active"
    manager_id: Optional[int] = None
    is_technical: Optional[bool] = None

    class Config:
        from_attributes = True

class KPIResponse(BaseModel):
    id: int
    title: str
    description: str
    weightage: float
    type: str
    target_role_id: Optional[int]
    target_employee_id: Optional[int]
    status: str
    created_by: int
    created_at: datetime
    manager_id: Optional[int]
    is_technical: bool

    class Config:
        from_attributes = True

class KPIUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    weightage: Optional[float] = None
    type: Optional[str] = None
    target_role_id: Optional[int] = None
    target_employee_id: Optional[int] = None
    status: Optional[str] = None
    is_technical: Optional[bool] = None

    class Config:
        from_attributes = True

class KPIRatingCreate(BaseModel):
    kpi_id: int
    rating: int
    comment: Optional[str] = None
    weightage: float

class KPIEvaluationCreate(BaseModel):
    kpi_id: int
    title: str
    description: str
    category: str
    weightage: float
    rating: int
    comment: Optional[str] = None

class EvaluationCreate(BaseModel):
    employee_id: int
    manager_id: Optional[int] = None
    period: str
    cycle_id: Optional[int] = None
    kpi_evaluations: List[KPIEvaluationCreate]
    status: Optional[str] = "draft"
    comments: Optional[str] = None
    manager_comments: Optional[str] = None
    admin_comments: Optional[str] = None

class EvaluationStartRequest(BaseModel):
    employee_id: int
    period: str
    comments: Optional[str] = None

class EvaluationSubmitRequest(BaseModel):
    kpi_evaluations: List[KPIEvaluationCreate]
    comments: Optional[str] = None
    manager_comments: Optional[str] = None

class KPIEvaluationResponse(BaseModel):
    id: int
    kpi_id: int
    title: str
    description: str
    category: str
    weightage: float
    rating: int
    comment: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EvaluationPermissions(BaseModel):
    can_view_increment_percentage: bool = False
    can_view_admin_comments: bool = False
    can_edit: bool = False
    can_approve: bool = False

    class Config:
        from_attributes = True

class EvaluationResponse(BaseModel):
    id: int
    employee_id: int
    manager_id: int
    cycle_id: Optional[int] = None
    period: Optional[str] = None
    raw_score: Optional[float] = None
    normalized_score: Optional[float] = None
    performance_label: Optional[str] = None
    increment_percentage: Optional[float] = None
    status: str
    comments: Optional[str] = None
    manager_comments: Optional[str] = None
    admin_comments: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    created_by: Optional[int] = None
    kpi_evaluations: List[KPIEvaluationResponse] = []
    permissions: EvaluationPermissions = EvaluationPermissions()

    class Config:
        from_attributes = True

class PaginatedEvaluationResponse(BaseModel):
    items: List[EvaluationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class EvaluationCycleBase(BaseModel):
    name: str
    evaluation_start_date: datetime
    evaluation_end_date: datetime
    execution_start_date: datetime
    execution_end_date: datetime

class EvaluationCycleCreate(EvaluationCycleBase):
    pass

class EvaluationCycleUpdate(BaseModel):
    name: Optional[str] = None
    evaluation_start_date: Optional[datetime] = None
    evaluation_end_date: Optional[datetime] = None
    execution_start_date: Optional[datetime] = None
    execution_end_date: Optional[datetime] = None
    status: Optional[str] = None

class EvaluationCycleResponse(EvaluationCycleBase):
    id: int
    status: str
    created_by: int
    created_at: datetime

    # Statistics
    total_evaluations: Optional[int] = None
    completed_evaluations: Optional[int] = None
    progress_percentage: Optional[float] = None

    class Config:
        from_attributes = True

class PaginatedEvaluationCycleResponse(BaseModel):
    items: List[EvaluationCycleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    user: UserResponse

    class Config:
        from_attributes = True

class LocalStorageUserData(BaseModel):
    users: List[Dict[str, Any]]

class LocalStoragePasswordData(BaseModel):
    passwords: Dict[str, str]

class LocalStorageKPIData(BaseModel):
    kpis: List[Dict[str, Any]]

class CurrentUserData(BaseModel):
    user: Optional[Dict[str, Any]] = None

class NotificationCreate(BaseModel):
    user_id: int
    type: str
    title: str
    message: str

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Access Control Schemas (imported from separate file)
from schemas.access_control import (
    GranularPermissionCreate, GranularPermissionUpdate, GranularPermissionResponse,
    UserPermissionCreate, UserPermissionCreateRequest, UserPermissionUpdate, UserPermissionResponse,
    AccessControlSummary, UserGranularPermissions
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")

        # Convert string user_id to integer
        try:
            user_id = int(user_id_str)
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Utility Functions
# Password functions are now imported from utils.password

def create_access_token(user_id: int) -> str:
    payload = {"sub": str(user_id)}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def calculate_remaining_days(end_date: datetime) -> int:
    """
    Calculate the number of days remaining until the end date.
    Returns 0 if the end date has passed.
    """
    today = datetime.now().date()
    end_date_only = end_date.date()
    delta = end_date_only - today
    return max(0, delta.days)

def has_permission(db: Session, user_id: int, permission_name: str) -> bool:
    """Check if a user has a specific permission"""
    # Get the user's role
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False

    # Get the role permissions
    role_permissions = db.query(RolePermission).filter(RolePermission.role_id == user.role_id).all()

    # Check if the user has the required permission
    for rp in role_permissions:
        permission = db.query(Permission).filter(Permission.id == rp.permission_id).first()
        if permission and permission.name == permission_name:
            return True

    return False

def calculate_raw_score(kpi_evaluations: List[KPIEvaluationCreate]) -> float:
    """
    Calculate raw score as sum of (rating × weight)
    """
    if not kpi_evaluations:
        return 0.0

    return sum(e.rating * e.weightage for e in kpi_evaluations)

def calculate_normalized_score(raw_score: float) -> float:
    """
    Normalize score using the formula: 3.00 + ((raw - 1.00) / 4.00) × 2.00
    """
    return 3.00 + ((raw_score - 1.00) / 4.00) * 2.00

def get_performance_label(normalized_score: float) -> str:
    """
    Return performance label based on normalized score:
    3.50–3.99: "Meets Expectations"
    4.00–4.49: "Exceeds Expectations"
    4.50–5.00: "Outstanding"
    """
    if normalized_score >= 4.50:
        return "Outstanding"
    elif normalized_score >= 4.00:
        return "Exceeds Expectations"
    elif normalized_score >= 3.50:
        return "Meets Expectations"
    else:
        return "Below Expectations"

def calculate_increment_percentage(normalized_score: float) -> float:
    if normalized_score >= 4.50:
        return 22.5  # 20-25%
    elif normalized_score >= 4.00:
        return 17.5  # 15-19.99%
    elif normalized_score >= 3.50:
        return 12.5  # 10-14.99%
    elif normalized_score >= 3.00:
        return 7.5   # 5-9.99%
    else:
        return 2.5   # 0-4.99%

# API Endpoints
@app.post("/auth/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    try:
        # Check if user exists
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            logger.warning(f"Login attempt with non-existent email: {request.email}")
            raise HTTPException(status_code=401, detail="User not found. Please check your email address.")

        # Check rate limiting
        if not check_rate_limit(request.email):
            logger.warning(f"Rate limit exceeded for user: {request.email}")
            raise HTTPException(
                status_code=429, 
                detail="Too many failed login attempts. Please try again later."
            )

        # Check if password is correct
        if not verify_password(request.password, user.password_hash):
            # Increment failed attempts counter
            increment_failed_attempts(request.email)
            logger.warning(f"Failed login attempt for user: {request.email}")
            raise HTTPException(status_code=401, detail="Invalid password. Please check your password and try again.")

        # Reset failed attempts on successful login
        reset_failed_attempts(request.email)

        # Generate access token
        access_token = create_access_token(user.id)

        logger.info(f"Successful login for user: {request.email}")

        # Check if user has a role
        if not user.role:
            # Get the default Employee role
            role = db.query(Role).filter(Role.name == "Employee").first()
            if not role:
                # If Employee role doesn't exist, create it
                role = Role(name="Employee", is_custom=False)
                db.add(role)
                db.commit()
                db.refresh(role)
                logger.info(f"Created default Employee role for user {user.email}")

            # Update the user's role_id
            user.role_id = role.id
            db.commit()
            db.refresh(user)
            logger.info(f"Updated user {user.email} with default Employee role")

        # Get the role's permissions
        role_permissions = db.query(RolePermission).filter(RolePermission.role_id == user.role_id).all()
        user.role.permissions = role_permissions

        # Return login response
        return LoginResponse(access_token=access_token, user=UserResponse.from_orm(user))
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error
        logger.error(f"Login error: {e}", exc_info=True)
        # Return a generic error message
        raise HTTPException(status_code=500, detail="An error occurred during login. Please try again later.")

@app.get("/auth/validate")
def validate_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Validates the JWT token and returns the user information"""
    # Get the role's permissions
    role_permissions = db.query(RolePermission).filter(RolePermission.role_id == current_user.role_id).all()
    current_user.role.permissions = role_permissions

    user_response = UserResponse.from_orm(current_user).dict()

    # Transform the user data to match the frontend's expected structure
    # Convert is_custom to isCustom
    if "role" in user_response and "is_custom" in user_response["role"]:
        user_response["role"]["isCustom"] = user_response["role"]["is_custom"]
        user_response["role"].pop("is_custom")

    return {"valid": True, "user": user_response}

@app.post("/auth/logout")
def logout():
    """Logs out the user (client-side only, no server-side session)"""
    return {"message": "Logged out successfully"}

@app.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get the role of the current user
    role = db.query(Role).filter(Role.id == current_user.role_id).first()

    # Check if user has USER_READ or KPI_READ permission
    has_user_read = has_permission(db, current_user.id, "USER_READ")
    has_kpi_read = has_permission(db, current_user.id, "KPI_READ")

    # Check if the user is an admin, manager, or has USER_READ or KPI_READ permission
    if role and (role.name.lower() == "admin" or role.name.lower() == "manager" or has_user_read or has_kpi_read):
        # If manager, only return their team members
        if role.name.lower() == "manager" and not has_user_read and not has_kpi_read:
            # Use join to explicitly load the role relationship
            return db.query(User).join(Role).filter(User.manager_id == current_user.id).all()
        # If admin or has USER_READ or KPI_READ permission, return all users
        # Use join to explicitly load the role relationship
        return db.query(User).join(Role).all()
    else:
        # If not authorized, raise an exception
        raise HTTPException(status_code=403, detail="Not authorized to access user data")

@app.post("/users/first-admin", response_model=UserResponse)
def create_first_admin(user_data: dict, db: Session = Depends(get_db)):
    """
    Create the first admin user without authentication.
    This endpoint should only be used during initial setup.
    """
    # Check if any users exist
    existing_users = db.query(User).count()
    if existing_users > 0:
        raise HTTPException(status_code=403, detail="Cannot create first admin user when users already exist")

    # Check if admin role exists
    admin_role = db.query(Role).filter(Role.name == "Admin").first()
    if not admin_role:
        # Create admin role
        admin_role = Role(name="Admin", is_custom=False)
        db.add(admin_role)
        db.commit()
        db.refresh(admin_role)
        print("Admin role created successfully")

    # Create admin user
    try:
        admin_user = User(
            email=user_data["email"],
            name=user_data["name"],
            password_hash=hash_password(user_data["password"]),
            role_id=admin_role.id,
            is_active=True
        )
        logger.info(f"Created admin user: {user_data['email']}")
    except Exception as e:
        logger.error(f"Error creating admin user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating admin user")
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    # Also add the user to localStorage tables in the main database for frontend authentication
    try:
        # Create new user object for localStorage
        new_user = {
            "id": str(admin_user.id),
            "name": admin_user.name,
            "email": admin_user.email,
            "role": {
                "id": str(admin_role.id),
                "name": admin_role.name,
                "permissions": [],
                "isCustom": admin_role.is_custom
            },
            "department": "Administration",
            "isActive": admin_user.is_active,
            "createdAt": admin_user.created_at.isoformat()
        }

        # Get existing users from localStorage_users table
        localStorage_users = db.query(LocalStorageUsers).filter(LocalStorageUsers.id == 1).first()

        users = []
        if localStorage_users:
            users = json.loads(localStorage_users.data)

        # Add user to the list
        users.append(new_user)

        # Save updated users
        if localStorage_users:
            localStorage_users.data = json.dumps(users)
        else:
            localStorage_users = LocalStorageUsers(id=1, data=json.dumps(users))
            db.add(localStorage_users)

        # Get existing passwords from localStorage_passwords table
        localStorage_passwords = db.query(LocalStoragePasswords).filter(LocalStoragePasswords.id == 1).first()

        passwords = {}
        if localStorage_passwords:
            passwords = json.loads(localStorage_passwords.data)

        # Add the new user's password
        passwords[admin_user.email] = user_data["password"]

        # Save updated passwords
        if localStorage_passwords:
            localStorage_passwords.data = json.dumps(passwords)
        else:
            localStorage_passwords = LocalStoragePasswords(id=1, data=json.dumps(passwords))
            db.add(localStorage_passwords)

        db.commit()

        logger.info(f"Admin user {admin_user.email} added to localStorage tables in the main database successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding admin user to localStorage tables: {e}", exc_info=True)

    return admin_user

@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if user with this email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        logger.warning(f"Attempt to create user with existing email: {user.email}")
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Create user in employee_eval.db
    try:
        db_user = User(
            email=user.email,
            name=user.name,
            password_hash=hash_password(user.password),
            role_id=user.role_id,
            manager_id=user.manager_id
        )
        logger.info(f"Created new user: {user.email}")
    except Exception as e:
        logger.error(f"Error creating user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating user")
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Also add the user to localStorage tables in the main database for frontend authentication
    try:
        # Get the role information
        role = db.query(Role).filter(Role.id == user.role_id).first()

        # Check if role exists
        if not role:
            logger.error(f"Role with ID {user.role_id} not found for user {user.email}")
            # Get the default Employee role instead
            role = db.query(Role).filter(Role.name == "Employee").first()
            if not role:
                # If Employee role doesn't exist, create it
                role = Role(name="Employee", is_custom=False)
                db.add(role)
                db.commit()
                db.refresh(role)
                logger.info(f"Created default Employee role for user {user.email}")

            # Update the user's role_id
            db_user.role_id = role.id
            db.commit()
            db.refresh(db_user)
            logger.info(f"Updated user {user.email} with default Employee role")

        # Get existing users from localStorage_users table
        localStorage_users = db.query(LocalStorageUsers).filter(LocalStorageUsers.id == 1).first()

        users = []
        if localStorage_users:
            users = json.loads(localStorage_users.data)

        # Create new user object for localStorage
        new_user = {
            "id": str(db_user.id),
            "name": db_user.name,
            "email": db_user.email,
            "role": {
                "id": str(role.id),
                "name": role.name,
                "permissions": [],
                "isCustom": role.is_custom
            },
            "department": "Department",
            "isActive": db_user.is_active,
            "createdAt": db_user.created_at.isoformat()
        }

        # Add user to the list
        users.append(new_user)

        # Save updated users
        if localStorage_users:
            localStorage_users.data = json.dumps(users)
        else:
            localStorage_users = LocalStorageUsers(id=1, data=json.dumps(users))
            db.add(localStorage_users)

        # Get existing passwords from localStorage_passwords table
        localStorage_passwords = db.query(LocalStoragePasswords).filter(LocalStoragePasswords.id == 1).first()

        passwords = {}
        if localStorage_passwords:
            passwords = json.loads(localStorage_passwords.data)

        # Add the new user's password
        passwords[db_user.email] = user.password

        # Save updated passwords
        if localStorage_passwords:
            localStorage_passwords.data = json.dumps(passwords)
        else:
            localStorage_passwords = LocalStoragePasswords(id=1, data=json.dumps(passwords))
            db.add(localStorage_passwords)

        db.commit()

        logger.info(f"User {db_user.email} added to localStorage tables in the main database successfully")
    except Exception as e:
        logger.error(f"Error adding user to localStorage tables: {e}", exc_info=True)

    return db_user

# Role Management Endpoints
@app.get("/roles", response_model=List[RoleResponse])
def get_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all roles.
    Admin users can access all roles.
    Managers can access roles that belong to their direct reports.
    Users with USER_READ or KPI_READ permission can access all roles.
    """
    # Get the role of the current user
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()

    # Check if user has USER_READ or KPI_READ permission
    has_user_read = has_permission(db, current_user.id, "USER_READ")
    has_kpi_read = has_permission(db, current_user.id, "KPI_READ")

    # Check if the user is an admin, manager, or has USER_READ or KPI_READ permission
    if not user_role or (user_role.name.lower() != "admin" and user_role.name.lower() != "manager" and not has_user_read and not has_kpi_read):
        raise HTTPException(status_code=403, detail="Not authorized to access role data")

    # Get roles based on user's role
    if user_role.name.lower() == "manager" and not has_user_read and not has_kpi_read:
        # For managers without USER_READ or KPI_READ permission, get roles of their direct reports
        # First, get all direct reports of the manager
        direct_reports = db.query(User).filter(User.manager_id == current_user.id, User.is_active == True).all()

        # Get unique role IDs from direct reports
        direct_report_role_ids = set(user.role_id for user in direct_reports)

        # Get roles that match these IDs
        roles = db.query(Role).filter(Role.id.in_(direct_report_role_ids)).all()
    else:
        # For admins or users with USER_READ or KPI_READ permission, get all roles
        roles = db.query(Role).all()

    # For each role, get its permissions
    for role in roles:
        role_permissions = db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
        role.permissions = role_permissions

    return roles

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update a user.
    Admin users can update any user, managers can only update their team members.
    """
    # Get the role of the current user
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()

    # Check if the user is an admin or manager
    if not user_role or (user_role.name.lower() != "admin" and user_role.name.lower() != "manager"):
        raise HTTPException(status_code=403, detail="Not authorized to update users")

    # Get the user to update
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # If manager, check if the user is their team member
    if user_role.name.lower() == "manager" and db_user.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")

    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)

    # Also update the user in localStorage tables in the main database
    try:
        # Get the role information
        role = db.query(Role).filter(Role.id == db_user.role_id).first()

        # Get existing users from localStorage_users table
        localStorage_users = db.query(LocalStorageUsers).filter(LocalStorageUsers.id == 1).first()

        if localStorage_users:
            users = json.loads(localStorage_users.data)

            # Find and update the user
            for i, user in enumerate(users):
                if user.get("id") == str(user_id):
                    # Update user fields
                    users[i]["name"] = db_user.name
                    users[i]["email"] = db_user.email
                    users[i]["role"] = {
                        "id": str(role.id),
                        "name": role.name,
                        "permissions": [],
                        "isCustom": role.is_custom
                    }
                    users[i]["managerId"] = str(db_user.manager_id) if db_user.manager_id else None
                    users[i]["isActive"] = db_user.is_active
                    break

            # Save updated users
            localStorage_users.data = json.dumps(users)
            db.commit()

        logger.info(f"User {db_user.email} (ID: {user_id}) updated successfully")
    except Exception as e:
        logger.error(f"Error updating user in localStorage tables: {e}", exc_info=True)
        # Continue execution since the user was already updated in the main database

    return db_user

@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete a user.
    Only admin users can access this endpoint.
    """
    # Check if the user is an admin
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not user_role or user_role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete users")

    # Get the user
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Don't allow deleting yourself
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Delete the user
    db.delete(db_user)
    db.commit()

    # Also remove from localStorage tables in the main database
    try:
        # Get existing users from localStorage_users table
        localStorage_users = db.query(LocalStorageUsers).filter(LocalStorageUsers.id == 1).first()

        if localStorage_users:
            users = json.loads(localStorage_users.data)
            # Filter out the deleted user
            users = [u for u in users if u.get("id") != str(user_id)]

            # Save updated users
            localStorage_users.data = json.dumps(users)

            # Get the user's email to remove from passwords
            user_email = db_user.email

            # Get existing passwords from localStorage_passwords table
            localStorage_passwords = db.query(LocalStoragePasswords).filter(LocalStoragePasswords.id == 1).first()

            if localStorage_passwords:
                passwords = json.loads(localStorage_passwords.data)
                # Remove the user's password
                if user_email in passwords:
                    del passwords[user_email]

                # Save updated passwords
                localStorage_passwords.data = json.dumps(passwords)

            db.commit()

        logger.info(f"User {db_user.email} (ID: {user_id}) deleted successfully")
    except Exception as e:
        logger.error(f"Error removing user from localStorage tables: {e}", exc_info=True)
        # Continue execution since the user was already deleted from the main database

    return None

@app.get("/roles/{role_id}", response_model=RoleResponse)
def get_role(role_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get a specific role by ID.
    Only admin users can access this endpoint.
    """
    # Check if the user is an admin
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not user_role or user_role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access role data")

    # Get the role
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Get the role's permissions
    role_permissions = db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
    role.permissions = role_permissions

    return role

@app.post("/roles", response_model=RoleResponse)
def create_role(role: RoleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a new role.
    Only admin users can access this endpoint.
    """
    # Check if the user is an admin
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not user_role or user_role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to create roles")

    # Check if role with this name already exists
    existing_role = db.query(Role).filter(Role.name == role.name).first()
    if existing_role:
        raise HTTPException(status_code=400, detail="Role with this name already exists")

    # Create the role
    db_role = Role(name=role.name, is_custom=role.is_custom)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)

    return db_role

@app.put("/roles/{role_id}", response_model=RoleResponse)
def update_role(role_id: int, role: RoleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update a role.
    Only admin users can access this endpoint.
    """
    # Check if the user is an admin
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not user_role or user_role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update roles")

    # Get the role
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Don't allow updating built-in roles
    if not db_role.is_custom:
        raise HTTPException(status_code=400, detail="Cannot update built-in roles")

    # Update the role
    db_role.name = role.name
    if role.is_custom is not None:
        db_role.is_custom = role.is_custom

    db.commit()
    db.refresh(db_role)

    return db_role

@app.delete("/roles/{role_id}", status_code=204)
def delete_role(role_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete a role.
    Only admin users can access this endpoint.
    """
    # Check if the user is an admin
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not user_role or user_role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete roles")

    # Get the role
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Don't allow deleting built-in roles
    if not db_role.is_custom:
        raise HTTPException(status_code=400, detail="Cannot delete built-in roles")

    # Check if any users are using this role
    users_with_role = db.query(User).filter(User.role_id == role_id).count()
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail="Cannot delete role that is assigned to users")

    # Delete the role's permissions
    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()

    # Delete the role
    db.delete(db_role)
    db.commit()

    return None

# Permission Management Endpoints
@app.get("/permissions", response_model=List[PermissionResponse])
def get_permissions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all permissions.
    Only admin users can access this endpoint.
    """
    # Check if the user is an admin
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access permission data")

    return db.query(Permission).all()

@app.post("/role-permissions", response_model=RolePermissionResponse)
def add_permission_to_role(role_permission: RolePermissionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Add a permission to a role.
    Only admin users can access this endpoint.
    """
    # Check if the user is an admin
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not user_role or user_role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to manage role permissions")

    # Check if the role exists
    role = db.query(Role).filter(Role.id == role_permission.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if the permission exists
    permission = db.query(Permission).filter(Permission.id == role_permission.permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    # Check if the role already has this permission
    existing_role_permission = db.query(RolePermission).filter(
        RolePermission.role_id == role_permission.role_id,
        RolePermission.permission_id == role_permission.permission_id
    ).first()
    if existing_role_permission:
        raise HTTPException(status_code=400, detail="Role already has this permission")

    # Add the permission to the role
    db_role_permission = RolePermission(
        role_id=role_permission.role_id,
        permission_id=role_permission.permission_id
    )
    db.add(db_role_permission)
    db.commit()
    db.refresh(db_role_permission)

    return db_role_permission

@app.delete("/role-permissions/{role_permission_id}", status_code=204)
def remove_permission_from_role(role_permission_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Remove a permission from a role.
    Only admin users can access this endpoint.
    """
    # Check if the user is an admin
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not user_role or user_role.name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to manage role permissions")

    # Get the role permission
    db_role_permission = db.query(RolePermission).filter(RolePermission.id == role_permission_id).first()
    if not db_role_permission:
        raise HTTPException(status_code=404, detail="Role permission not found")

    # Delete the role permission
    db.delete(db_role_permission)
    db.commit()

    return None

@app.get("/kpis", response_model=List[KPIResponse])
def get_kpis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if user_role and user_role.name.lower() == "admin":
        return db.query(KPI).filter(KPI.status == "active").all()
    elif user_role and user_role.name.lower() == "manager":
        direct_reports = db.query(User.id).filter(User.manager_id == current_user.id).all()
        direct_report_ids = [u.id for u in direct_reports]
        if not direct_report_ids:
            return []
        return db.query(KPI).filter(KPI.target_employee_id.in_(direct_report_ids), KPI.status == "active").all()
    else:
        # Employees: show only their own KPIs
        return db.query(KPI).filter(KPI.target_employee_id == current_user.id, KPI.status == "active").all()

@app.get("/api/kpis/managed", response_model=List[KPIResponse])
def get_managed_kpis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(KPI).filter(KPI.created_by == current_user.id).all()

@app.get("/api/kpis/employee/{employee_id}/weightage")
def get_employee_kpi_weightage(employee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get the KPI weightage information for a specific employee.
    Returns:
    - total_weightage: total weightage of all KPIs
    - kpis: list of KPIs with their details (id, title, weightage, is_technical, creator_name, type)
    - admin_weightage: total weightage of admin KPIs (kept for backward compatibility)
    - manager_weightage: total weightage of manager KPIs (kept for backward compatibility)
    """
    # Get the user's role for authorization check
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()

    # Check if the employee exists
    employee = db.query(User).filter(User.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Authorization check: Only allow access if the current user is:
    # 1. An admin
    # 2. The employee's manager
    # 3. The employee themselves
    is_admin = user_role and user_role.name.lower() == "admin"
    is_manager = employee.manager_id == current_user.id
    is_self = employee_id == current_user.id

    if not (is_admin or is_manager or is_self):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this employee's KPI weightage"
        )

    # Use the KPIService to get the weightage information
    from services.kpi import KPIService
    return KPIService.get_total_kpi_weightage(db, employee_id)

@app.get("/api/kpis/employee/{employee_id}", response_model=List[KPIResponse])
def get_employee_kpis(employee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employee = db.query(User).filter(User.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee_role = db.query(Role).filter(Role.id == employee.role_id).first()
    is_employee_admin = employee_role and employee_role.name.lower() == "admin"

    # 1. Employee-specific KPIs
    employee_specific_kpis = db.query(KPI).filter(
        KPI.type == "employee-specific",
        KPI.target_employee_id == employee_id,
        KPI.status == "active"
    ).all()

    # 2. Global KPIs
    global_kpis = []
    if not is_employee_admin:
        admin_global_kpis = db.query(KPI).filter(
            KPI.type == "global",
            KPI.manager_id == 0,
            KPI.status == "active"
        ).all()
        manager_global_kpis = []
        if employee.manager_id:
            manager_global_kpis = db.query(KPI).filter(
                KPI.type == "global",
                KPI.manager_id == employee.manager_id,
                KPI.status == "active"
            ).all()
        global_kpis = admin_global_kpis + manager_global_kpis

    # 3. Role-based KPIs
    admin_role_kpis = db.query(KPI).filter(
        KPI.type == "role-based",
        KPI.target_role_id == employee.role_id,
        KPI.manager_id == 0,
        KPI.status == "active"
    ).all()
    manager_role_kpis = []
    if employee.manager_id:
        manager_role_kpis = db.query(KPI).filter(
            KPI.type == "role-based",
            KPI.target_role_id == employee.role_id,
            KPI.manager_id == employee.manager_id,
            KPI.status == "active"
        ).all()
    role_based_kpis = admin_role_kpis + manager_role_kpis

    # Add created_by_role field to each KPI
    def add_created_by_role(kpi):
        creator = db.query(User).filter(User.id == kpi.created_by).first()
        creator_role = db.query(Role).filter(Role.id == creator.role_id).first() if creator else None
        kpi_dict = kpi.__dict__.copy()
        kpi_dict['created_by_role'] = creator_role.name.lower() if creator_role else 'unknown'
        return kpi_dict

    all_kpis = employee_specific_kpis + global_kpis + role_based_kpis
    kpis_with_role = [add_created_by_role(kpi) for kpi in all_kpis]
    return kpis_with_role

@app.post("/kpis", response_model=KPIResponse)
def create_kpi(kpi: KPICreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Use the KPIService to create the KPI with proper validation
        from services.kpi import KPIService

        # Create the KPI using the service
        db_kpi = KPIService.create_kpi(db, kpi, current_user)
        return db_kpi
    except HTTPException:
        # Re-raise HTTP exceptions with specific error messages
        db.rollback()
        raise
    except ValueError as e:
        db.rollback()
        logger.error(f"Value error creating KPI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid value in KPI data: {str(e)}"
        )
    except TypeError as e:
        db.rollback()
        logger.error(f"Type error creating KPI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data type in KPI: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating KPI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create KPI: {str(e)}"
        )

@app.put("/kpis/{kpi_id}", response_model=KPIResponse)
def update_kpi(kpi_id: int, kpi: KPIUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update a KPI by ID. Only admins and managers can update KPIs they created or are associated with.
    """
    try:
        # Use the KPIService to update the KPI with proper validation
        from services.kpi import KPIService

        # Update the KPI using the service
        db_kpi = KPIService.update_kpi(db, kpi_id, kpi, current_user)
        return db_kpi
    except HTTPException:
        # Re-raise HTTP exceptions with specific error messages
        db.rollback()
        raise
    except ValueError as e:
        db.rollback()
        logger.error(f"Value error updating KPI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid value in KPI data: {str(e)}"
        )
    except TypeError as e:
        db.rollback()
        logger.error(f"Type error updating KPI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data type in KPI: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating KPI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update KPI: {str(e)}"
        )

@app.delete("/kpis/{kpi_id}")
def delete_kpi(kpi_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete a KPI by ID. Only admins and managers can delete KPIs they created.
    """
    try:
        # Check the user's role
        user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
        is_manager = user_role and user_role.name.lower() == "manager"
        is_admin = user_role and user_role.name.lower() == "admin"

        # Only admins and managers can delete KPIs
        if not (is_admin or is_manager):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and managers can delete KPIs"
            )

        # Get the KPI
        db_kpi = db.query(KPI).filter(KPI.id == kpi_id).first()
        if not db_kpi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="KPI not found"
            )

        # Admins can delete any KPI
        # Managers can only delete KPIs they created
        if is_manager and not is_admin and db_kpi.manager_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete KPIs you created"
            )

        # Delete the KPI
        db.delete(db_kpi)
        db.commit()
        return {"message": "KPI deleted successfully"}
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting KPI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete KPI: {str(e)}"
        )


@app.get("/evaluations", response_model=List[EvaluationResponse])
def get_evaluations(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user),
    department: Optional[str] = None,
    manager_id: Optional[int] = None,
    status: Optional[str] = None
):
    """
    Get evaluations with role-based filtering:
    - Admin: All evaluations with optional filters
    - Manager: Only direct report evaluations
    - Employee: Only their own evaluations

    Query parameters:
    - department: Filter by department (admin only)
    - manager_id: Filter by manager ID (admin only)
    - status: Filter by evaluation status
    """
    # Base query
    query = db.query(Evaluation)

    # Get user role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    role_name = user_role.name.lower() if user_role else ""

    # Role-based filtering
    if role_name == "admin":
        # Admins can see all evaluations with optional filters
        if department:
            # Join with User to filter by department
            query = query.join(User, User.id == Evaluation.employee_id).filter(User.department == department)

        if manager_id:
            query = query.filter(Evaluation.manager_id == manager_id)

    elif role_name == "manager":
        # Managers can only see evaluations of their direct reports
        query = query.filter(Evaluation.manager_id == current_user.id)

    else:
        # Employees can only see their own evaluations
        query = query.filter(Evaluation.employee_id == current_user.id)

    # Common filters for all roles
    if status:
        query = query.filter(Evaluation.status == status)

    # Execute query
    evaluations = query.all()

    # Check if user has admin role for permissions
    is_admin = db.query(RolePermission).join(Permission).filter(
        RolePermission.role_id == current_user.role_id,
        Permission.name == "admin_evaluations"
    ).first() is not None

    # Check if user has manager role for permissions
    is_manager = db.query(RolePermission).join(Permission).filter(
        RolePermission.role_id == current_user.role_id,
        Permission.name == "manage_evaluations"
    ).first() is not None

    result = []
    for evaluation in evaluations:
        # Create a copy of the evaluation to add permissions
        eval_dict = evaluation.__dict__.copy()

        # Ensure required fields have valid values
        if eval_dict.get('raw_score') is None:
            # Calculate raw score from KPI evaluations if available
            kpi_evaluations = db.query(KPIEvaluation).filter(KPIEvaluation.evaluation_id == evaluation.id).all()
            if kpi_evaluations:
                # Convert to KPIEvaluationCreate objects for the calculation function
                kpi_eval_creates = [
                    KPIEvaluationCreate(
                        id=kpi.id,
                        evaluation_id=kpi.evaluation_id,
                        kpi_id=kpi.kpi_id,
                        title=kpi.title,
                        description=kpi.description,
                        category=kpi.category,
                        weightage=kpi.weightage,
                        rating=kpi.rating,
                        comment=kpi.comment
                    ) for kpi in kpi_evaluations
                ]
                eval_dict['raw_score'] = calculate_raw_score(kpi_eval_creates)
            else:
                eval_dict['raw_score'] = 0.0

        # Ensure normalized_score has a valid value
        if eval_dict.get('normalized_score') is None:
            eval_dict['normalized_score'] = calculate_normalized_score(eval_dict['raw_score'])

        # Ensure performance_label has a valid value
        if eval_dict.get('performance_label') is None:
            eval_dict['performance_label'] = get_performance_label(eval_dict['normalized_score'])

        # Ensure increment_percentage has a valid value
        if eval_dict.get('increment_percentage') is None:
            eval_dict['increment_percentage'] = calculate_increment_percentage(eval_dict['normalized_score'])

        # Set permissions based on user role
        permissions = EvaluationPermissions(
            # Only admins can view increment percentage
            can_view_increment_percentage=is_admin,
            # Only admins can view admin comments
            can_view_admin_comments=is_admin,
            # Managers can edit evaluations they created or for employees they manage
            can_edit=is_admin or (is_manager and (evaluation.manager_id == current_user.id or evaluation.created_by == current_user.id)),
            # Only admins can approve evaluations
            can_approve=is_admin
        )

        eval_dict["permissions"] = permissions
        result.append(eval_dict)

    return result

@app.get("/api/evaluations/employee/{employee_id}", response_model=PaginatedEvaluationResponse)
def get_employee_evaluations(
    employee_id: int,
    page: int = 1,
    page_size: int = 10,
    status: Optional[str] = None,
    period: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get evaluation history for a specific employee with pagination and filtering.
    Query parameters:
    - page: Page number (default: 1)
    - page_size: Number of items per page (default: 10)
    - status: Filter by evaluation status (draft, submitted, approved, rejected)
    - period: Filter by evaluation period
    """
    # Get the user's role for authorization check
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()

    # Check if the employee exists
    employee = db.query(User).filter(User.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Authorization check: Only allow access if the current user is:
    # 1. An admin
    # 2. The employee's manager
    # 3. The employee themselves
    is_admin = user_role and user_role.name.lower() == "admin"
    is_manager = employee.manager_id == current_user.id
    is_self = employee_id == current_user.id

    if not (is_admin or is_manager or is_self):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this employee's evaluations"
        )

    # Base query: Get evaluations for the specified employee
    query = db.query(Evaluation).filter(Evaluation.employee_id == employee_id)

    # Apply filters if provided
    if status:
        query = query.filter(Evaluation.status == status)

    if period:
        query = query.filter(Evaluation.period == period)

    # Order by created_at (newest first)
    query = query.order_by(Evaluation.created_at.desc())

    # Count total items before pagination
    total_items = query.count()

    # Calculate total pages
    total_pages = (total_items + page_size - 1) // page_size

    # Validate page number
    if page < 1:
        page = 1
    elif page > total_pages and total_pages > 0:
        page = total_pages

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)

    # Execute query
    evaluations = query.all()

    # Check if user has admin role for permissions
    is_admin = db.query(RolePermission).join(Permission).filter(
        RolePermission.role_id == current_user.role_id,
        Permission.name == "admin_evaluations"
    ).first() is not None

    # Check if user has manager role for permissions
    is_manager = db.query(RolePermission).join(Permission).filter(
        RolePermission.role_id == current_user.role_id,
        Permission.name == "manage_evaluations"
    ).first() is not None

    # Process evaluations to add permissions
    result = []
    for evaluation in evaluations:
        # Create a copy of the evaluation to add permissions
        eval_dict = evaluation.__dict__.copy()

        # Ensure required fields have valid values
        if eval_dict.get('raw_score') is None:
            # Calculate raw score from KPI evaluations if available
            kpi_evaluations = db.query(KPIEvaluation).filter(KPIEvaluation.evaluation_id == evaluation.id).all()
            if kpi_evaluations:
                # Convert to KPIEvaluationCreate objects for the calculation function
                kpi_eval_creates = [
                    KPIEvaluationCreate(
                        id=kpi.id,
                        evaluation_id=kpi.evaluation_id,
                        kpi_id=kpi.kpi_id,
                        title=kpi.title,
                        description=kpi.description,
                        category=kpi.category,
                        weightage=kpi.weightage,
                        rating=kpi.rating,
                        comment=kpi.comment
                    ) for kpi in kpi_evaluations
                ]
                eval_dict['raw_score'] = calculate_raw_score(kpi_eval_creates)
            else:
                eval_dict['raw_score'] = 0.0

        # Ensure normalized_score has a valid value
        if eval_dict.get('normalized_score') is None:
            eval_dict['normalized_score'] = calculate_normalized_score(eval_dict['raw_score'])

        # Ensure performance_label has a valid value
        if eval_dict.get('performance_label') is None:
            eval_dict['performance_label'] = get_performance_label(eval_dict['normalized_score'])

        # Ensure increment_percentage has a valid value
        if eval_dict.get('increment_percentage') is None:
            eval_dict['increment_percentage'] = calculate_increment_percentage(eval_dict['normalized_score'])

        # Set permissions based on user role
        permissions = EvaluationPermissions(
            # Only admins can view increment percentage
            can_view_increment_percentage=is_admin,
            # Only admins can view admin comments
            can_view_admin_comments=is_admin,
            # Managers can edit evaluations they created or for employees they manage
            can_edit=is_admin or (is_manager and (evaluation.manager_id == current_user.id or evaluation.created_by == current_user.id)),
            # Only admins can approve evaluations
            can_approve=is_admin
        )

        eval_dict["permissions"] = permissions
        result.append(eval_dict)

    # Return paginated response
    return {
        "items": result,
        "total": total_items,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@app.post("/api/evaluations/start", response_model=EvaluationResponse)
def start_evaluation(evaluation_request: EvaluationStartRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Start a new evaluation for an employee.
    Only managers and admins can start evaluations.
    The evaluation is created in draft status with associated KPIs but no ratings.
    """
    # Get the user's role for authorization check
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()

    # Authorization check: Only allow managers and admins to start evaluations
    is_admin = user_role and user_role.name.lower() == "admin"
    is_manager = user_role and user_role.name.lower() == "manager"

    if not (is_admin or is_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to start evaluations"
        )

    # Check if the employee exists
    employee = db.query(User).filter(User.id == evaluation_request.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # If the user is a manager, check if they are the employee's manager
    if is_manager and not is_admin:
        if employee.manager_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to start evaluations for this employee"
            )

    # Get applicable KPIs for the employee
    # 1. Employee-specific KPIs targeted at this employee
    employee_specific_kpis = db.query(KPI).filter(
        KPI.type == "employee-specific",
        KPI.target_employee_id == evaluation_request.employee_id,
        KPI.status == "active"  # Only include active KPIs
    ).all()

    # 2. Global KPIs created by the employee's manager or admin (manager_id = 0)
    global_kpis = db.query(KPI).filter(
        KPI.type == "global",
        KPI.status == "active",  # Only include active KPIs
        or_(
            KPI.manager_id == employee.manager_id,
            KPI.manager_id == 0  # Include admin-created global KPIs
        )
    ).all()

    # 3. Role-based KPIs for the employee's role created by their manager or admin (manager_id = 0)
    role_based_kpis = db.query(KPI).filter(
        KPI.type == "role-based",
        KPI.target_role_id == employee.role_id,
        KPI.status == "active",  # Only include active KPIs
        or_(
            KPI.manager_id == employee.manager_id,
            KPI.manager_id == 0  # Include admin-created global KPIs
        )
    ).all()

    # Combine all applicable KPIs
    applicable_kpis = employee_specific_kpis + global_kpis + role_based_kpis

    if not applicable_kpis:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No applicable KPIs found for this employee"
        )

    # Create evaluation in draft status
    db_evaluation = Evaluation(
        employee_id=evaluation_request.employee_id,
        manager_id=employee.manager_id,
        period=evaluation_request.period,
        raw_score=0,  # Initial score is 0
        normalized_score=0,  # Initial normalized score is 0
        performance_label="",  # No performance label yet
        increment_percentage=0,  # No increment percentage yet
        status="draft",  # Set status to draft
        comments=evaluation_request.comments,
        created_by=current_user.id
    )
    db.add(db_evaluation)
    db.commit()
    db.refresh(db_evaluation)

    # Create KPI evaluations with empty ratings
    for kpi in applicable_kpis:
        db_kpi_eval = KPIEvaluation(
            evaluation_id=db_evaluation.id,
            kpi_id=kpi.id,
            title=kpi.title,
            description=kpi.description,
            category="technical" if kpi.is_technical else "admin",
            weightage=kpi.weightage,
            rating=0,  # Initial rating is 0
            comment=""  # No comment yet
        )
        db.add(db_kpi_eval)

    db.commit()

    # Refresh the evaluation to include the KPI evaluations
    db.refresh(db_evaluation)

    # Check if user has admin role
    is_admin = db.query(RolePermission).join(Permission).filter(
        RolePermission.role_id == current_user.role_id,
        Permission.name == "admin_evaluations"
    ).first() is not None

    # Check if user has manager role
    is_manager = db.query(RolePermission).join(Permission).filter(
        RolePermission.role_id == current_user.role_id,
        Permission.name == "manage_evaluations"
    ).first() is not None

    # Create a copy of the evaluation to add permissions
    eval_dict = db_evaluation.__dict__.copy()

    # Set permissions based on user role
    permissions = EvaluationPermissions(
        # Only admins can view increment percentage
        can_view_increment_percentage=is_admin,
        # Only admins can view admin comments
        can_view_admin_comments=is_admin,
        # Managers can edit evaluations they created or for employees they manage
        can_edit=is_admin or (is_manager and (db_evaluation.manager_id == current_user.id or db_evaluation.created_by == current_user.id)),
        # Only admins can approve evaluations
        can_approve=is_admin
    )

    eval_dict["permissions"] = permissions
    return eval_dict

@app.put("/api/evaluations/{evaluation_id}/submit", response_model=EvaluationResponse)
def submit_evaluation(
    evaluation_id: int,
    evaluation_data: EvaluationSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a completed evaluation with KPI ratings.
    Only managers and admins can submit evaluations.
    All KPIs must have ratings.
    """
    # Get the user's role for authorization check
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()

    # Authorization check: Only allow managers and admins to submit evaluations
    is_admin = user_role and user_role.name.lower() == "admin"
    is_manager = user_role and user_role.name.lower() == "manager"

    if not (is_admin or is_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to submit evaluations"
        )

    
    def submit_evaluation(db: Session, evaluation_id: int, evaluation_data: EvaluationSubmitRequest, current_user: User) -> Evaluation:
        # Get the evaluation
        evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
        if not evaluation:
            raise ValueError(f"Evaluation with ID {evaluation_id} not found")
    
        # Update evaluation fields
        evaluation.comments = evaluation_data.comments
        evaluation.manager_comments = evaluation_data.manager_comments
        evaluation.status = "submitted"
        evaluation.submitted_at = datetime.utcnow()
        evaluation.updated_at = datetime.utcnow()
        
        # Use raw SQL to update submitted_by
        db.execute(
            text("UPDATE evaluations SET submitted_by = :user_id WHERE id = :eval_id"),
            {"user_id": current_user.id, "eval_id": evaluation_id}
        )
        
        # Calculate and update scores
        raw_score = calculate_raw_score(evaluation_data.kpi_evaluations)
        normalized_score = calculate_normalized_score(raw_score)
        performance_label = get_performance_label(normalized_score)
        increment_percentage = calculate_increment_percentage(normalized_score)
    
    # Update evaluation
        evaluation.raw_score = raw_score
        evaluation.normalized_score = normalized_score
        evaluation.performance_label = performance_label
        evaluation.increment_percentage = increment_percentage
    
        db.commit()
        db.refresh(evaluation)
        return evaluation

    # Create notifications
    # Notify the employee
    employee_notification = Notification(
        user_id=db_evaluation.employee_id,
        type="evaluation_submitted",
        title="Evaluation Submitted",
        message=f"Your evaluation for period {db_evaluation.period} has been submitted by your manager.",
        is_read=False
    )
    db.add(employee_notification)

    # Notify admins
    admin_role = db.query(Role).filter(Role.name.ilike("admin")).first()
    if admin_role:
        admin_users = db.query(User).filter(User.role_id == admin_role.id).all()
        for admin in admin_users:
            admin_notification = Notification(
                user_id=admin.id,
                type="evaluation_submitted",
                title="Evaluation Submitted",
                message=f"An evaluation for employee ID {db_evaluation.employee_id} has been submitted and is ready for review.",
                is_read=False
            )
            db.add(admin_notification)

    db.commit()

    # Check if user has admin role for permissions
    is_admin = db.query(RolePermission).join(Permission).filter(
        RolePermission.role_id == current_user.role_id,
        Permission.name == "admin_evaluations"
    ).first() is not None

    # Check if user has manager role for permissions
    is_manager = db.query(RolePermission).join(Permission).filter(
        RolePermission.role_id == current_user.role_id,
        Permission.name == "manage_evaluations"
    ).first() is not None

    # Create a copy of the evaluation to add permissions
    eval_dict = db_evaluation.__dict__.copy()

    # Set permissions based on user role
    permissions = EvaluationPermissions(
        # Only admins can view increment percentage
        can_view_increment_percentage=is_admin,
        # Only admins can view admin comments
        can_view_admin_comments=is_admin,
        # Managers can edit evaluations they created or for employees they manage
        can_edit=is_admin or (is_manager and (db_evaluation.manager_id == current_user.id or db_evaluation.created_by == current_user.id)),
        # Only admins can approve evaluations
        can_approve=is_admin
    )

    eval_dict["permissions"] = permissions
    return eval_dict


@app.put("/evaluations/{evaluation_id}", response_model=EvaluationResponse)
def update_evaluation(evaluation_id: int, evaluation: EvaluationCreate, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    try:
        # Check if evaluation exists
        db_evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
        if not db_evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # Authorization check
        is_admin = db.query(RolePermission).join(Permission).filter(
            RolePermission.role_id == current_user.role_id,
            Permission.name == "admin_evaluations"
        ).first() is not None
        
        is_manager = db.query(RolePermission).join(Permission).filter(
            RolePermission.role_id == current_user.role_id,
            Permission.name == "manage_evaluations"
        ).first() is not None
        
        # Only allow the creator, the manager of the employee, or an admin to update the evaluation
        if not (is_admin or 
                db_evaluation.created_by == current_user.id or 
                (is_manager and db_evaluation.manager_id == current_user.id)):
            raise HTTPException(
                status_code=403,
                detail="Not authorized to update this evaluation"
            )
        
        # Fetch all KPIs for this evaluation's employee
        all_kpis = db.query(KPI).filter(KPI.status == "active").all()
        # Build a map of kpi_id -> created_by_role
        kpi_role_map = {}
        for kpi in all_kpis:
            creator = db.query(User).filter(User.id == kpi.created_by).first()
            creator_role = db.query(Role).filter(Role.id == creator.role_id).first() if creator else None
            kpi_role_map[kpi.id] = creator_role.name.lower() if creator_role else 'unknown'

        # Determine current user's role
        user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
        user_role_name = user_role.name.lower() if user_role else 'unknown'

        # Filter KPI evaluations to only those the user is allowed to rate
        allowed_kpi_evaluations = [
            kpi_eval for kpi_eval in evaluation.kpi_evaluations
            if kpi_role_map.get(kpi_eval.kpi_id) == user_role_name
        ]

        # Calculate scores
        raw_score = calculate_raw_score(allowed_kpi_evaluations)
        normalized_score = calculate_normalized_score(raw_score)
        performance_label = get_performance_label(normalized_score)
        increment_percentage = calculate_increment_percentage(normalized_score)
        
        # Set current timestamp for updated_at
        current_time = datetime.utcnow()
        
        # Update evaluation fields
        db_evaluation.manager_id = evaluation.manager_id if evaluation.manager_id is not None else db_evaluation.manager_id
        db_evaluation.cycle_id = evaluation.cycle_id if evaluation.cycle_id is not None else db_evaluation.cycle_id
        db_evaluation.period = evaluation.period if evaluation.period is not None else db_evaluation.period
        db_evaluation.raw_score = raw_score
        db_evaluation.normalized_score = normalized_score
        db_evaluation.performance_label = performance_label
        db_evaluation.increment_percentage = increment_percentage
        db_evaluation.status = evaluation.status if evaluation.status is not None else db_evaluation.status
        db_evaluation.comments = evaluation.comments if evaluation.comments is not None else db_evaluation.comments
        db_evaluation.manager_comments = evaluation.manager_comments if evaluation.manager_comments is not None else db_evaluation.manager_comments
        db_evaluation.admin_comments = evaluation.admin_comments if evaluation.admin_comments is not None else db_evaluation.admin_comments
        db_evaluation.updated_at = current_time
        
        # Update drafted_by or submitted_by based on status
        if db_evaluation.status == "draft":
            db_evaluation.drafted_by = current_user.id
        elif db_evaluation.status == "submitted":
            db_evaluation.submitted_at = current_time
            db_evaluation.submitted_by = current_user.id
        
        # Delete existing KPI evaluations
        db.query(KPIEvaluation).filter(KPIEvaluation.evaluation_id == db_evaluation.id).delete()
        
        # Create new KPI evaluations (only for allowed KPIs)
        for kpi_eval in allowed_kpi_evaluations:
            db_kpi_eval = KPIEvaluation(
                evaluation_id=db_evaluation.id,
                kpi_id=kpi_eval.kpi_id,
                title=kpi_eval.title,
                description=kpi_eval.description,
                category=kpi_eval.category,
                weightage=kpi_eval.weightage,
                rating=kpi_eval.rating,
                comment=kpi_eval.comment,
                created_at=current_time,
                updated_at=current_time
            )
            db.add(db_kpi_eval)
        
        db.commit()
        db.refresh(db_evaluation)
        
        # Create a copy of the evaluation to add permissions
        eval_dict = db_evaluation.__dict__.copy()
        
        # Remove SQLAlchemy state attribute
        if "_sa_instance_state" in eval_dict:
            del eval_dict["_sa_instance_state"]
        
        # Set permissions based on user role
        permissions = EvaluationPermissions(
            # Only admins can view increment percentage
            can_view_increment_percentage=is_admin,
            # Only admins can view admin comments
            can_view_admin_comments=is_admin,
            # Managers can edit evaluations they created or for employees they manage
            can_edit=is_admin or (is_manager and (db_evaluation.manager_id == current_user.id or db_evaluation.created_by == current_user.id)),
            # Only admins can approve evaluations
            can_approve=is_admin
        )
        
        eval_dict["permissions"] = permissions
        return eval_dict
    except Exception as e:
        # Log the error
        logging.error(f"Error updating evaluation: {str(e)}")
        # Rollback the transaction
        db.rollback()
        # Re-raise the exception
        raise

@app.post("/evaluations", response_model=EvaluationResponse)
def create_evaluation(evaluation: EvaluationCreate, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    try:
        # Calculate scores
        raw_score = calculate_raw_score(evaluation.kpi_evaluations)
        normalized_score = calculate_normalized_score(raw_score)
        performance_label = get_performance_label(normalized_score)
        increment_percentage = calculate_increment_percentage(normalized_score)

        # Set current timestamp for created_at and updated_at
        current_time = datetime.utcnow()

        # Use provided manager_id if available, otherwise use current user's id
        manager_id = evaluation.manager_id if evaluation.manager_id is not None else current_user.id

        # Use provided status if available, otherwise use default "draft"
        status = evaluation.status if evaluation.status is not None else "draft"

        # Check if an evaluation already exists for this employee/period combination when saving a draft
        existing_evaluation = None
        if status == "draft" and evaluation.employee_id and evaluation.period:
            existing_evaluation = db.query(Evaluation).filter(
                Evaluation.employee_id == evaluation.employee_id,
                Evaluation.period == evaluation.period,
                Evaluation.status.in_(["draft", "pending"])
            ).first()

        if existing_evaluation:
            # Update existing evaluation
            existing_evaluation.manager_id = manager_id
            existing_evaluation.cycle_id = evaluation.cycle_id
            existing_evaluation.raw_score = raw_score
            existing_evaluation.normalized_score = normalized_score
            existing_evaluation.performance_label = performance_label
            existing_evaluation.increment_percentage = increment_percentage
            existing_evaluation.status = status
            existing_evaluation.comments = evaluation.comments
            existing_evaluation.manager_comments = evaluation.manager_comments
            existing_evaluation.admin_comments = evaluation.admin_comments
            existing_evaluation.updated_at = current_time
            existing_evaluation.drafted_by = current_user.id
            
            # Delete existing KPI evaluations
            db.query(KPIEvaluation).filter(KPIEvaluation.evaluation_id == existing_evaluation.id).delete()
            
            # Create new KPI evaluations
            for kpi_eval in evaluation.kpi_evaluations:
                db_kpi_eval = KPIEvaluation(
                    evaluation_id=existing_evaluation.id,
                    kpi_id=kpi_eval.kpi_id,
                    title=kpi_eval.title,
                    description=kpi_eval.description,
                    category=kpi_eval.category,
                    weightage=kpi_eval.weightage,
                    rating=kpi_eval.rating,
                    comment=kpi_eval.comment,
                    created_at=current_time,
                    updated_at=current_time
                )
                db.add(db_kpi_eval)
                
            db_evaluation = existing_evaluation
        else:
            # Create new evaluation
            db_evaluation = Evaluation(
                employee_id=evaluation.employee_id,
                manager_id=manager_id,
                cycle_id=evaluation.cycle_id,
                period=evaluation.period,
                raw_score=raw_score,
                normalized_score=normalized_score,
                performance_label=performance_label,
                increment_percentage=increment_percentage,
                status=status,
                comments=evaluation.comments,
                manager_comments=evaluation.manager_comments,
                admin_comments=evaluation.admin_comments,
                created_at=current_time,
                updated_at=current_time,
                created_by=current_user.id
            )

            # Add to session and flush to get the ID
            db.add(db_evaluation)
            db.flush()

            # Update submitted_by or drafted_by based on status
            if status == "draft":
                db.execute(
                    text("UPDATE evaluations SET drafted_by = :user_id WHERE id = :eval_id"),
                    {"user_id": current_user.id, "eval_id": db_evaluation.id}
                )
            else:  # status == "submitted"
                db.execute(
                    text("UPDATE evaluations SET submitted_by = :user_id WHERE id = :eval_id"),
                    {"user_id": current_user.id, "eval_id": db_evaluation.id}
                )

            # Create KPI evaluations
            for kpi_eval in evaluation.kpi_evaluations:
                db_kpi_eval = KPIEvaluation(
                    evaluation_id=db_evaluation.id,
                    kpi_id=kpi_eval.kpi_id,
                    title=kpi_eval.title,
                    description=kpi_eval.description,
                    category=kpi_eval.category,
                    weightage=kpi_eval.weightage,
                    rating=kpi_eval.rating,
                    comment=kpi_eval.comment,
                    created_at=current_time,
                    updated_at=current_time
                )
                db.add(db_kpi_eval)

        db.commit()
        db.refresh(db_evaluation)

        # Check if user has admin role
        is_admin = db.query(RolePermission).join(Permission).filter(
            RolePermission.role_id == current_user.role_id,
            Permission.name == "admin_evaluations"
        ).first() is not None

        # Check if user has manager role
        is_manager = db.query(RolePermission).join(Permission).filter(
            RolePermission.role_id == current_user.role_id,
            Permission.name == "manage_evaluations"
        ).first() is not None

        # Create a copy of the evaluation to add permissions
        eval_dict = db_evaluation.__dict__.copy()
        
        # Remove SQLAlchemy state attribute
        if "_sa_instance_state" in eval_dict:
            del eval_dict["_sa_instance_state"]

        # Set permissions based on user role
        permissions = EvaluationPermissions(
            # Only admins can view increment percentage
            can_view_increment_percentage=is_admin,
            # Only admins can view admin comments
            can_view_admin_comments=is_admin,
            # Managers can edit evaluations they created or for employees they manage
            can_edit=is_admin or (is_manager and (db_evaluation.manager_id == current_user.id or db_evaluation.created_by == current_user.id)),
            # Only admins can approve evaluations
            can_approve=is_admin
        )

        eval_dict["permissions"] = permissions
        return eval_dict
    except Exception as e:
        # Log the error
        logging.error(f"Error creating evaluation: {str(e)}")
        # Rollback the transaction
        db.rollback()
        # Raise HTTP exception with detailed error message
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create evaluation: {str(e)}"
        )

# Evaluation Cycle Endpoints
@app.get("/evaluation-cycles", response_model=List[EvaluationCycleResponse])
def get_evaluation_cycles(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user),
    status: Optional[str] = None
):
    # Check if user has admin or manager role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    is_admin = user_role and user_role.name.lower() == "admin"
    is_manager = user_role and user_role.name.lower() == "manager"

    # Managers can only access active cycles
    if is_manager and not is_admin:
        # Force status to be 'active' for managers
        status = "active"
    elif not (is_admin or is_manager):
        # Employees can only access active cycles
        if status != "active":
            raise HTTPException(status_code=403, detail="Not authorized to access non-active evaluation cycles")

    # Base query
    query = db.query(EvaluationCycle)

    # Apply status filter if provided
    if status:
        query = query.filter(EvaluationCycle.status == status)

    # Execute query
    cycles = query.all()

    # Add statistics to each cycle
    result = []
    for cycle in cycles:
        # Get total evaluations for this cycle
        total_evaluations = db.query(Evaluation).filter(Evaluation.cycle_id == cycle.id).count()

        # Get completed evaluations (status = approved)
        completed_evaluations = db.query(Evaluation).filter(
            Evaluation.cycle_id == cycle.id,
            Evaluation.status == "approved"
        ).count()

        # Calculate progress percentage
        progress_percentage = 0
        if total_evaluations > 0:
            progress_percentage = (completed_evaluations / total_evaluations) * 100

        # Create a copy of the cycle to add statistics
        cycle_dict = cycle.__dict__.copy()
        cycle_dict["total_evaluations"] = total_evaluations
        cycle_dict["completed_evaluations"] = completed_evaluations
        cycle_dict["progress_percentage"] = progress_percentage
        
        # Calculate remaining days only for active cycles
        if cycle.status == "active":
            cycle_dict["remaining_days"] = calculate_remaining_days(cycle.evaluation_end_date)
        else:
            cycle_dict["remaining_days"] = 0

        result.append(cycle_dict)

    return result

@app.get("/evaluation-cycles/{cycle_id}", response_model=EvaluationCycleResponse)
def get_evaluation_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific evaluation cycle by ID.
    Admin users can access any cycle, managers can access active cycles.
    """
    # Check if user has admin or manager role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    is_admin = user_role and user_role.name.lower() == "admin"
    is_manager = user_role and user_role.name.lower() == "manager"

    # Get the cycle
    cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail=f"Evaluation cycle with ID {cycle_id} not found")
    
    # Managers can only access active cycles
    if is_manager and not is_admin:
        if cycle.status != "active":
            raise HTTPException(status_code=403, detail="Not authorized to access non-active evaluation cycles")
    elif not (is_admin or is_manager):
        # Other roles (like employees) cannot access cycles
        raise HTTPException(status_code=403, detail="Not authorized to access evaluation cycles")

    # Get statistics for this cycle
    total_evaluations = db.query(Evaluation).filter(Evaluation.cycle_id == cycle_id).count()
    completed_evaluations = db.query(Evaluation).filter(
        Evaluation.cycle_id == cycle_id,
        Evaluation.status == "approved"
    ).count()

    # Calculate progress percentage
    progress_percentage = 0
    if total_evaluations > 0:
        progress_percentage = (completed_evaluations / total_evaluations) * 100

    # Create a copy of the cycle to add statistics
    cycle_dict = cycle.__dict__.copy()
    cycle_dict["total_evaluations"] = total_evaluations
    cycle_dict["completed_evaluations"] = completed_evaluations
    cycle_dict["progress_percentage"] = progress_percentage
    
    # Calculate remaining days only for active cycles
    if cycle.status == "active":
        cycle_dict["remaining_days"] = calculate_remaining_days(cycle.evaluation_end_date)
    else:
        cycle_dict["remaining_days"] = 0

    return cycle_dict

@app.post("/evaluation-cycles", response_model=EvaluationCycleResponse)
def create_evaluation_cycle(
    cycle: EvaluationCycleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new evaluation cycle.
    Only admin users can access this endpoint.
    """
    # Check if user has admin role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    is_admin = user_role and user_role.name.lower() == "admin"

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to create evaluation cycles")

    # Validate dates
    if cycle.evaluation_start_date >= cycle.evaluation_end_date:
        raise HTTPException(status_code=400, detail="Evaluation start date must be before evaluation end date")

    if cycle.execution_start_date >= cycle.execution_end_date:
        raise HTTPException(status_code=400, detail="Execution start date must be before execution end date")

    # Create the cycle
    db_cycle = EvaluationCycle(
        name=cycle.name,
        evaluation_start_date=cycle.evaluation_start_date,
        evaluation_end_date=cycle.evaluation_end_date,
        execution_start_date=cycle.execution_start_date,
        execution_end_date=cycle.execution_end_date,
        status="draft",
        created_by=current_user.id
    )
    db.add(db_cycle)
    db.commit()
    db.refresh(db_cycle)

    # Add statistics (will be zero for a new cycle)
    cycle_dict = db_cycle.__dict__.copy()
    cycle_dict["total_evaluations"] = 0
    cycle_dict["completed_evaluations"] = 0
    cycle_dict["progress_percentage"] = 0

    return cycle_dict

@app.put("/evaluation-cycles/{cycle_id}", response_model=EvaluationCycleResponse)
def update_evaluation_cycle(
    cycle_id: int,
    cycle_update: EvaluationCycleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing evaluation cycle.
    Only admin users can access this endpoint.
    """
    # Check if user has admin role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    is_admin = user_role and user_role.name.lower() == "admin"

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update evaluation cycles")

    # Get the cycle
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail=f"Evaluation cycle with ID {cycle_id} not found")

    # Update fields if provided
    if cycle_update.name is not None:
        db_cycle.name = cycle_update.name

    if cycle_update.evaluation_start_date is not None:
        db_cycle.evaluation_start_date = cycle_update.evaluation_start_date

    if cycle_update.evaluation_end_date is not None:
        db_cycle.evaluation_end_date = cycle_update.evaluation_end_date

    if cycle_update.execution_start_date is not None:
        db_cycle.execution_start_date = cycle_update.execution_start_date

    if cycle_update.execution_end_date is not None:
        db_cycle.execution_end_date = cycle_update.execution_end_date

    if cycle_update.status is not None:
        db_cycle.status = cycle_update.status

    # Validate dates
    if db_cycle.evaluation_start_date >= db_cycle.evaluation_end_date:
        raise HTTPException(status_code=400, detail="Evaluation start date must be before evaluation end date")

    if db_cycle.execution_start_date >= db_cycle.execution_end_date:
        raise HTTPException(status_code=400, detail="Execution start date must be before execution end date")

    db.commit()
    db.refresh(db_cycle)

    # Get statistics for this cycle
    total_evaluations = db.query(Evaluation).filter(Evaluation.cycle_id == cycle_id).count()
    completed_evaluations = db.query(Evaluation).filter(
        Evaluation.cycle_id == cycle_id,
        Evaluation.status == "approved"
    ).count()

    # Calculate progress percentage
    progress_percentage = 0
    if total_evaluations > 0:
        progress_percentage = (completed_evaluations / total_evaluations) * 100

    # Create a copy of the cycle to add statistics
    cycle_dict = db_cycle.__dict__.copy()
    cycle_dict["total_evaluations"] = total_evaluations
    cycle_dict["completed_evaluations"] = completed_evaluations
    cycle_dict["progress_percentage"] = progress_percentage

    return cycle_dict

@app.delete("/evaluation-cycles/{cycle_id}", response_model=dict)
def delete_evaluation_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an evaluation cycle.
    Only admin users can access this endpoint.
    Admin users can delete any evaluation cycle regardless of its status.
    """
    # Check if user has admin role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    is_admin = user_role and user_role.name.lower() == "admin"

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete evaluation cycles")

    # Get the cycle
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail=f"Evaluation cycle with ID {cycle_id} not found")

    # Check if there are any evaluations associated with this cycle
    evaluations_count = db.query(Evaluation).filter(Evaluation.cycle_id == cycle_id).count()

    # If there are evaluations, delete them first
    if evaluations_count > 0:
        db.query(Evaluation).filter(Evaluation.cycle_id == cycle_id).delete()
        db.commit()

    # Delete the cycle
    db.delete(db_cycle)
    db.commit()

    return {"message": f"Evaluation cycle with ID {cycle_id} deleted successfully"}

@app.post("/evaluation-cycles/{cycle_id}/activate", response_model=EvaluationCycleResponse)
def activate_evaluation_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Activate an evaluation cycle and generate evaluations for all eligible employees.
    Only admin users can access this endpoint.
    """
    # Check if user has admin role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    is_admin = user_role and user_role.name.lower() == "admin"

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to activate evaluation cycles")

    # Get the cycle
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail=f"Evaluation cycle with ID {cycle_id} not found")

    # Check if the cycle is in draft status
    if db_cycle.status != "draft":
        raise HTTPException(status_code=400, detail=f"Evaluation cycle with ID {cycle_id} is not in draft status")

    # Get all active users except those with Admin role
    employees = db.query(User).join(Role).filter(
        User.is_active == True,
        Role.name != "Admin"
    ).all()

    # Create evaluations for each employee
    for employee in employees:
        # Skip users without a manager assigned
        if employee.manager_id is None:
            continue
            
        # Check if an evaluation already exists for this employee in this cycle
        existing_evaluation = db.query(Evaluation).filter(
            Evaluation.employee_id == employee.id,
            Evaluation.cycle_id == cycle_id
        ).first()

        if not existing_evaluation:
            # Create a new evaluation
            evaluation = Evaluation(
                employee_id=employee.id,
                manager_id=employee.manager_id,
                cycle_id=cycle_id,
                period=f"{db_cycle.evaluation_start_date.strftime('%b %Y')} - {db_cycle.evaluation_end_date.strftime('%b %Y')}",
                status="pending",
                created_by=current_user.id
            )
            db.add(evaluation)

    # Update the cycle status to active
    db_cycle.status = "active"
    db.commit()
    db.refresh(db_cycle)

    # Get statistics for this cycle
    total_evaluations = db.query(Evaluation).filter(Evaluation.cycle_id == cycle_id).count()
    completed_evaluations = db.query(Evaluation).filter(
        Evaluation.cycle_id == cycle_id,
        Evaluation.status == "approved"
    ).count()

    # Calculate progress percentage
    progress_percentage = 0
    if total_evaluations > 0:
        progress_percentage = (completed_evaluations / total_evaluations) * 100

    # Create a copy of the cycle to add statistics
    cycle_dict = db_cycle.__dict__.copy()
    cycle_dict["total_evaluations"] = total_evaluations
    cycle_dict["completed_evaluations"] = completed_evaluations
    cycle_dict["progress_percentage"] = progress_percentage

    return cycle_dict

@app.post("/evaluation-cycles/{cycle_id}/pause", response_model=EvaluationCycleResponse)
def pause_evaluation_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Pause an evaluation cycle.
    Only admin users can access this endpoint.
    Admin users can pause any evaluation cycle regardless of its status.
    """
    # Check if user has admin role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    is_admin = user_role and user_role.name.lower() == "admin"

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to pause evaluation cycles")

    # Get the cycle
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail=f"Evaluation cycle with ID {cycle_id} not found")

    # Update the cycle status to paused
    db_cycle.status = "paused"
    db.commit()
    db.refresh(db_cycle)

    # Get statistics for this cycle
    total_evaluations = db.query(Evaluation).filter(Evaluation.cycle_id == cycle_id).count()
    completed_evaluations = db.query(Evaluation).filter(
        Evaluation.cycle_id == cycle_id,
        Evaluation.status == "approved"
    ).count()

    # Calculate progress percentage
    progress_percentage = 0
    if total_evaluations > 0:
        progress_percentage = (completed_evaluations / total_evaluations) * 100

    # Create a copy of the cycle to add statistics
    cycle_dict = db_cycle.__dict__.copy()
    cycle_dict["total_evaluations"] = total_evaluations
    cycle_dict["completed_evaluations"] = completed_evaluations
    cycle_dict["progress_percentage"] = progress_percentage

    return cycle_dict

@app.post("/evaluation-cycles/{cycle_id}/stop", response_model=EvaluationCycleResponse)
def stop_evaluation_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Stop (cancel) an evaluation cycle.
    Only admin users can access this endpoint.
    Admin users can stop any evaluation cycle regardless of its status.
    """
    # Check if user has admin role
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    is_admin = user_role and user_role.name.lower() == "admin"

    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to stop evaluation cycles")

    # Get the cycle
    db_cycle = db.query(EvaluationCycle).filter(EvaluationCycle.id == cycle_id).first()
    if not db_cycle:
        raise HTTPException(status_code=404, detail=f"Evaluation cycle with ID {cycle_id} not found")

    # Update the cycle status to cancelled
    db_cycle.status = "cancelled"
    db.commit()
    db.refresh(db_cycle)

    # Get statistics for this cycle
    total_evaluations = db.query(Evaluation).filter(Evaluation.cycle_id == cycle_id).count()
    completed_evaluations = db.query(Evaluation).filter(
        Evaluation.cycle_id == cycle_id,
        Evaluation.status == "approved"
    ).count()

    # Calculate progress percentage
    progress_percentage = 0
    if total_evaluations > 0:
        progress_percentage = (completed_evaluations / total_evaluations) * 100

    # Create a copy of the cycle to add statistics
    cycle_dict = db_cycle.__dict__.copy()
    cycle_dict["total_evaluations"] = total_evaluations
    cycle_dict["completed_evaluations"] = completed_evaluations
    cycle_dict["progress_percentage"] = progress_percentage

    return cycle_dict

@app.get("/")
def root():
    return {"message": "Employee Evaluation Portal API"}

@app.get("/health")
def health():
    """Health check endpoint for Docker"""
    return {"status": "healthy"}

# LocalStorage sync endpoints
@app.post("/users")
def sync_users(data: LocalStorageUserData, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Store user data in the database.
    Only authenticated users can access this endpoint.
    Syncs users to the main database (employee_eval.db)
    """
    try:
        # Store the data in localStorage_users table in the main database
        localStorage_users = db.query(LocalStorageUsers).filter(LocalStorageUsers.id == 1).first()

        if localStorage_users:
            # Update existing record
            localStorage_users.data = json.dumps(data.users)
        else:
            # Create new record
            localStorage_users = LocalStorageUsers(id=1, data=json.dumps(data.users))
            db.add(localStorage_users)

        db.commit()

        # Get existing passwords from localStorage_passwords table in the main database
        localStorage_passwords = db.query(LocalStoragePasswords).filter(LocalStoragePasswords.id == 1).first()

        passwords = {}
        if localStorage_passwords:
            passwords = json.loads(localStorage_passwords.data)

        # For each user in the data
        for user_data in data.users:
            # Check if user already exists in the users table
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()

            if not existing_user:
                # Get password from localStorage_passwords
                password = passwords.get(user_data["email"])
                if not password:
                    logger.warning(f"Warning: No password found for user {user_data['email']}")
                    continue

                # Get role information
                role_id = int(user_data["role"]["id"]) if user_data.get("role") and user_data["role"].get("id") else None
                if not role_id:
                    logger.warning(f"No role ID found for user {user_data['email']}")
                    continue

                # Create user in the users table
                try:
                    db_user = User(
                        email=user_data["email"],
                        name=user_data["name"],
                        password_hash=hash_password(password),
                        role_id=role_id,
                        manager_id=int(user_data["managerId"]) if user_data.get("managerId") else None,
                        is_active=user_data.get("isActive", True)
                    )
                    db.add(db_user)
                    db.commit()
                    logger.info(f"User {user_data['email']} synced to the database successfully")
                except Exception as e:
                    logger.error(f"Error creating user {user_data['email']} in the database: {e}", exc_info=True)
                    db.rollback()
                    continue

        return {"message": "User data synced successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing users: {e}", exc_info=True)
        return {"message": "Error syncing user data", "error": str(e)}

@app.get("/sync/users")
def get_synced_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get user data from the database.
    Only authenticated users can access this endpoint.
    """
    try:
        # Get data from the main database
        localStorage_users = db.query(LocalStorageUsers).filter(LocalStorageUsers.id == 1).first()

        if localStorage_users:
            return {"users": json.loads(localStorage_users.data)}
        return {"users": []}
    except Exception as e:
        logger.error(f"Error getting synced users: {e}", exc_info=True)
        return {"users": [], "error": str(e)}

@app.post("/sync/passwords")
def sync_passwords(data: LocalStoragePasswordData, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Store password data in the database.
    Only authenticated users can access this endpoint.
    """
    try:
        # Check if record exists
        localStorage_passwords = db.query(LocalStoragePasswords).filter(LocalStoragePasswords.id == 1).first()

        if localStorage_passwords:
            # Update existing record
            localStorage_passwords.data = json.dumps(data.passwords)
        else:
            # Create new record
            localStorage_passwords = LocalStoragePasswords(id=1, data=json.dumps(data.passwords))
            db.add(localStorage_passwords)

        db.commit()
        return {"message": "Password data synced successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing passwords: {e}", exc_info=True)
        return {"message": "Error syncing password data", "error": str(e)}

@app.get("/sync/passwords")
def get_synced_passwords(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get password data from the database.
    Only authenticated users can access this endpoint.
    """
    try:
        # Get data from the main database
        localStorage_passwords = db.query(LocalStoragePasswords).filter(LocalStoragePasswords.id == 1).first()

        if localStorage_passwords:
            return {"passwords": json.loads(localStorage_passwords.data)}
        return {"passwords": {}}
    except Exception as e:
        logger.error(f"Error getting synced passwords: {e}", exc_info=True)
        return {"passwords": {}, "error": str(e)}

@app.post("/sync/kpis")
def sync_kpis(data: LocalStorageKPIData, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Store KPI data in the database.
    Only authenticated users can access this endpoint.
    """
    try:
        # Check if record exists
        localStorage_kpis = db.query(LocalStorageKPIs).filter(LocalStorageKPIs.id == 1).first()

        if localStorage_kpis:
            # Update existing record
            localStorage_kpis.data = json.dumps(data.kpis)
        else:
            # Create new record
            localStorage_kpis = LocalStorageKPIs(id=1, data=json.dumps(data.kpis))
            db.add(localStorage_kpis)

        db.commit()
        return {"message": "KPI data synced successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing KPIs: {e}", exc_info=True)
        return {"message": "Error syncing KPI data", "error": str(e)}

@app.get("/sync/kpis")
def get_synced_kpis(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get KPI data from the database.
    Only authenticated users can access this endpoint.
    """
    try:
        # Get data from the main database
        localStorage_kpis = db.query(LocalStorageKPIs).filter(LocalStorageKPIs.id == 1).first()

        if localStorage_kpis:
            return {"kpis": json.loads(localStorage_kpis.data)}
        return {"kpis": []}
    except Exception as e:
        logger.error(f"Error getting synced KPIs: {e}", exc_info=True)
        return {"kpis": [], "error": str(e)}

@app.get("/sync/all")
def get_all_synced_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get all synced data from the database.
    Only authenticated users can access this endpoint.
    """
    users_data = get_synced_users(current_user, db)
    passwords_data = get_synced_passwords(current_user, db)
    kpis_data = get_synced_kpis(current_user, db)

    return {
        "users": users_data.get("users", []),
        "passwords": passwords_data.get("passwords", {}),
        "kpis": kpis_data.get("kpis", [])
    }

@app.post("/sync/current-user")
def sync_current_user(user_data: CurrentUserData, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Store user session data for the authenticated user.
    Each user has their own session data identified by their user ID.
    """
    try:
        user_id = current_user.id

        # Check if record exists
        localStorage_user_session = db.query(LocalStorageUserSessions).filter(LocalStorageUserSessions.user_id == user_id).first()

        if localStorage_user_session:
            # Update existing record
            localStorage_user_session.data = json.dumps(user_data.user)
        else:
            # Create new record
            localStorage_user_session = LocalStorageUserSessions(user_id=user_id, data=json.dumps(user_data.user))
            db.add(localStorage_user_session)

        db.commit()
        return {"message": "User session data synced successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing user session: {e}", exc_info=True)
        return {"message": "Error syncing user session data", "error": str(e)}

@app.get("/sync/current-user")
def get_current_user_session(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get the session data for the authenticated user.
    """
    try:
        user_id = current_user.id

        # Get data from the main database
        localStorage_user_session = db.query(LocalStorageUserSessions).filter(LocalStorageUserSessions.user_id == user_id).first()

        if localStorage_user_session:
            return {"user": json.loads(localStorage_user_session.data)}

        # If no session data found, return the user from the database
        # Get the role's permissions
        role_permissions = db.query(RolePermission).filter(RolePermission.role_id == current_user.role_id).all()
        current_user.role.permissions = role_permissions

        user_response = UserResponse.from_orm(current_user).dict()

        # Transform the user data to match the frontend's expected structure
        # Convert is_custom to isCustom
        if "role" in user_response and "is_custom" in user_response["role"]:
            user_response["role"]["isCustom"] = user_response["role"]["is_custom"]
            user_response["role"].pop("is_custom")

        return {"user": user_response}
    except Exception as e:
        logger.error(f"Error getting user session: {e}", exc_info=True)
        return {"user": None, "error": str(e)}

@app.post("/notifications", response_model=NotificationResponse)
def create_notification(notification: NotificationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a new notification
    """
    try:
        # Check if the user exists
        user = db.query(User).filter(User.id == notification.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Create the notification
        db_notification = Notification(
            user_id=notification.user_id,
            type=notification.type,
            title=notification.title,
            message=notification.message,
            is_read=False
        )

        db.add(db_notification)
        db.commit()
        db.refresh(db_notification)

        return db_notification
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating notification: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating notification: {str(e)}")

@app.get("/evaluations/{evaluation_id}", response_model=EvaluationResponse)
def get_evaluation_by_id(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single evaluation and its associated KPI evaluations by evaluation_id.
    """
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    # Permission check: allow admin, manager of employee, or the employee themselves
    # Check if user is admin (has admin role or admin_evaluations permission)
    is_admin = False
    admin_role = db.query(Role).filter(Role.name == "Admin").first()
    if admin_role and current_user.role_id == admin_role.id:
        is_admin = True
    else:
        # Check for admin_evaluations permission
        admin_permission = db.query(Permission).filter(Permission.name == "admin_evaluations").first()
        if admin_permission:
            admin_role_perm = db.query(RolePermission).filter(
                RolePermission.role_id == current_user.role_id,
                RolePermission.permission_id == admin_permission.id
            ).first()
            is_admin = admin_role_perm is not None

    # Check if user is manager (has manager role or manage_evaluations permission)
    is_manager = False
    manager_role = db.query(Role).filter(Role.name == "Manager").first()
    if manager_role and current_user.role_id == manager_role.id:
        is_manager = True
    else:
        # Check for manage_evaluations permission
        manage_permission = db.query(Permission).filter(Permission.name == "manage_evaluations").first()
        if manage_permission:
            manage_role_perm = db.query(RolePermission).filter(
                RolePermission.role_id == current_user.role_id,
                RolePermission.permission_id == manage_permission.id
            ).first()
            is_manager = manage_role_perm is not None

    # Check if user is the employee being evaluated
    is_self = evaluation.employee_id == current_user.id
    
    # Check if user is the manager of the employee being evaluated
    is_employee_manager = evaluation.manager_id == current_user.id

    # Allow access if: admin, manager, employee's manager, or the employee themselves
    if not (is_admin or is_manager or is_employee_manager or is_self):
        raise HTTPException(status_code=403, detail="Not authorized to view this evaluation")

    # Fetch associated KPI evaluations
    kpi_evaluations = db.query(KPIEvaluation).filter(KPIEvaluation.evaluation_id == evaluation_id).all()
    # Convert to dicts for response
    kpi_evaluations_data = [
        {
            "id": kpi.id,
            "kpi_id": kpi.kpi_id,
            "title": kpi.title,
            "description": kpi.description,
            "category": kpi.category,
            "weightage": kpi.weightage,
            "rating": kpi.rating,
            "comment": kpi.comment,
            "created_at": kpi.created_at,
            "updated_at": kpi.updated_at,
        }
        for kpi in kpi_evaluations
    ]
    # Build response
    eval_dict = evaluation.__dict__.copy()
    if "_sa_instance_state" in eval_dict:
        del eval_dict["_sa_instance_state"]
    eval_dict["kpi_evaluations"] = kpi_evaluations_data
    # Add permissions (reuse logic from other endpoints)
    permissions = EvaluationPermissions(
        can_view_increment_percentage=is_admin,
        can_view_admin_comments=is_admin,
        can_edit=is_admin or (is_manager and (evaluation.manager_id == current_user.id or evaluation.created_by == current_user.id)),
        can_approve=is_admin
    )
    eval_dict["permissions"] = permissions
    return eval_dict

# ============================================================================
# GRANULAR ACCESS CONTROL ENDPOINTS (SUPER ADMIN ONLY)
# ============================================================================

SUPER_ADMIN_EMAIL = "sgul@trafix.com"

def verify_super_admin(current_user: User = Depends(get_current_user)):
    """Verify that the current user is the super admin"""
    if current_user.email != SUPER_ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Only super admin can access granular access control."
        )
    return current_user

# Access Control Service Methods
def get_granular_permissions_service(db: Session):
    """Get all granular permissions"""
    return db.query(GranularPermission).filter(GranularPermission.is_active == True).all()

def create_granular_permission_service(db: Session, permission_data: GranularPermissionCreate):
    """Create a new granular permission"""
    permission_key = f"{permission_data.module_name}.{permission_data.action_name}"
    
    # Check if permission already exists
    existing_permission = db.query(GranularPermission).filter(
        GranularPermission.permission_key == permission_key
    ).first()
    
    if existing_permission:
        # Return the existing permission instead of creating a duplicate
        return existing_permission
    
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

def get_user_granular_permissions_service(db: Session, user_id: int):
    """Get all granular permissions for a user"""
    return db.query(UserPermission).filter(
        and_(
            UserPermission.user_id == user_id,
            UserPermission.is_active == True,
            or_(UserPermission.expires_at.is_(None), UserPermission.expires_at > datetime.utcnow())
        )
    ).all()

def assign_permission_to_user_service(db: Session, permission_data: UserPermissionCreate, granted_by_id: int):
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

def get_all_users_with_granular_permissions_service(db: Session):
    """Get all users who have granular permissions assigned"""
    users_with_permissions = db.query(User).join(UserPermission).filter(
        and_(
            UserPermission.is_active == True,
            or_(UserPermission.expires_at.is_(None), UserPermission.expires_at > datetime.utcnow())
        )
    ).distinct().all()
    
    result = []
    for user in users_with_permissions:
        permissions = get_user_granular_permissions_service(db, user.id)
        result.append({
            "user_id": user.id,
            "user_name": user.name,
            "user_email": user.email,
            "permissions": [{"id": p.id, "user_id": p.user_id, "permission_id": p.permission_id, 
                           "module_name": p.module_name, "action_name": p.action_name, 
                           "is_active": p.is_active, "granted_by": p.granted_by, 
                           "granted_at": p.granted_at, "expires_at": p.expires_at} for p in permissions]
        })
    
    return result

def get_access_control_summary_service(db: Session):
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
    
    return {
        "total_users": total_users,
        "total_granular_permissions": total_granular_permissions,
        "active_user_permissions": active_user_permissions,
        "modules_with_permissions": modules_with_permissions
    }

def revoke_user_permission_service(db: Session, user_permission_id: int):
    """Revoke a user's granular permission"""
    db_user_permission = db.query(UserPermission).filter(UserPermission.id == user_permission_id).first()
    if not db_user_permission:
        return False
    
    db_user_permission.is_active = False
    db.commit()
    return True

def check_user_granular_permission_service(db: Session, user_id: int, module_name: str, action_name: str):
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

@app.get("/access-control/summary")
def get_access_control_summary(
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Get access control summary statistics"""
    return get_access_control_summary_service(db)

@app.get("/access-control/granular-permissions")
def get_granular_permissions(
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Get all granular permissions"""
    return get_granular_permissions_service(db)

@app.post("/access-control/granular-permissions")
def create_granular_permission(
    permission_data: GranularPermissionCreate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Create a new granular permission"""
    return create_granular_permission_service(db, permission_data)

@app.get("/access-control/users-with-permissions")
def get_users_with_granular_permissions(
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Get all users who have granular permissions assigned"""
    return get_all_users_with_granular_permissions_service(db)

@app.get("/access-control/users/{user_id}/permissions")
def get_user_granular_permissions(
    user_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Get granular permissions for a specific user"""
    permissions = get_user_granular_permissions_service(db, user_id)
    return [{"id": p.id, "user_id": p.user_id, "permission_id": p.permission_id, 
             "module_name": p.module_name, "action_name": p.action_name, 
             "is_active": p.is_active, "granted_by": p.granted_by, 
             "granted_at": p.granted_at, "expires_at": p.expires_at} for p in permissions]

@app.post("/access-control/users/{user_id}/permissions")
def assign_permission_to_user(
    user_id: int,
    permission_data: UserPermissionCreateRequest,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Assign a granular permission to a user"""
    # Convert to UserPermissionCreate with user_id
    permission_create = UserPermissionCreate(
        user_id=user_id,
        permission_id=permission_data.permission_id,
        module_name=permission_data.module_name,
        action_name=permission_data.action_name,
        expires_at=permission_data.expires_at
    )
    user_permission = assign_permission_to_user_service(db, permission_create, current_user.id)
    
    return {"id": user_permission.id, "user_id": user_permission.user_id, 
            "permission_id": user_permission.permission_id, 
            "module_name": user_permission.module_name, 
            "action_name": user_permission.action_name, 
            "is_active": user_permission.is_active, 
            "granted_by": user_permission.granted_by, 
            "granted_at": user_permission.granted_at, 
            "expires_at": user_permission.expires_at}

@app.delete("/access-control/user-permissions/{user_permission_id}")
def revoke_user_permission(
    user_permission_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Revoke a user's granular permission"""
    success = revoke_user_permission_service(db, user_permission_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User permission not found"
        )
    return {"message": "Permission revoked successfully"}

@app.get("/access-control/users/{user_id}/check-permission/{module_name}/{action_name}")
def check_user_granular_permission(
    user_id: int,
    module_name: str,
    action_name: str,
    db: Session = Depends(get_db), 
    current_user: User = Depends(verify_super_admin)
):
    """Check if a user has a specific granular permission"""
    has_permission = check_user_granular_permission_service(db, user_id, module_name, action_name)
    return {"has_permission": has_permission}

# New endpoint for users to check their own granular permissions (no super admin restriction)
@app.get("/users/me/check-granular-permission/{module_name}/{action_name}")
def check_my_granular_permission(
    module_name: str,
    action_name: str,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Check if the current user has a specific granular permission"""
    has_permission = check_user_granular_permission_service(db, current_user.id, module_name, action_name)
    return {"has_permission": has_permission}

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize admin user for Docker mode
def init_admin_user():
    """
    Initialize the database tables for the application
    """
    try:
        # Connect to the main database
        db = SessionLocal()
        try:
            # Check if localStorage_users table has data
            localStorage_users = db.query(LocalStorageUsers).filter(LocalStorageUsers.id == 1).first()

            if not localStorage_users:
                # Initialize with empty array
                localStorage_users = LocalStorageUsers(id=1, data=json.dumps([]))
                db.add(localStorage_users)

            # Check if localStorage_passwords table has data
            localStorage_passwords = db.query(LocalStoragePasswords).filter(LocalStoragePasswords.id == 1).first()

            if not localStorage_passwords:
                # Initialize with empty object
                localStorage_passwords = LocalStoragePasswords(id=1, data=json.dumps({}))
                db.add(localStorage_passwords)

            db.commit()
            logger.info("localStorage tables in the main database initialized successfully")

            # Check if admin role exists
            admin_role = db.query(Role).filter(Role.name == "Admin").first()
            if not admin_role:
                # Create admin role
                admin_role = Role(name="Admin", is_custom=False)
                db.add(admin_role)
                db.commit()
                db.refresh(admin_role)
                logger.info("Admin role created successfully")

            # Create employee role if it doesn't exist
            employee_role = db.query(Role).filter(Role.name == "Employee").first()
            if not employee_role:
                employee_role = Role(name="Employee", is_custom=False)
                db.add(employee_role)
                db.commit()
                db.refresh(employee_role)
                logger.info("Employee role created successfully")

            # Create manager role if it doesn't exist
            manager_role = db.query(Role).filter(Role.name == "Manager").first()
            if not manager_role:
                manager_role = Role(name="Manager", is_custom=False)
                db.add(manager_role)
                db.commit()
                db.refresh(manager_role)
                logger.info("Manager role created successfully")

            # Create default granular permissions for the access control system
            try:
                default_permissions = [
                    {
                        'module_name': 'users',
                        'action_name': 'read',
                        'display_name': 'View Users',
                        'description': 'Ability to view user information'
                    },
                    {
                        'module_name': 'users',
                        'action_name': 'write',
                        'display_name': 'Edit Users',
                        'description': 'Ability to create and modify user accounts'
                    },
                    {
                        'module_name': 'evaluations',
                        'action_name': 'approve',
                        'display_name': 'Approve Evaluations',
                        'description': 'Ability to approve submitted evaluations'
                    },
                    {
                        'module_name': 'kpis',
                        'action_name': 'delete',
                        'display_name': 'Delete KPIs',
                        'description': 'Ability to delete KPI definitions'
                    },
                ]

                for perm_data in default_permissions:
                    existing_perm = db.query(GranularPermission).filter(
                        GranularPermission.module_name == perm_data['module_name'],
                        GranularPermission.action_name == perm_data['action_name']
                    ).first()
                    
                    if not existing_perm:
                        permission_key = f"{perm_data['module_name']}.{perm_data['action_name']}"
                        granular_perm = GranularPermission(
                            module_name=perm_data['module_name'],
                            action_name=perm_data['action_name'],
                            permission_key=permission_key,
                            display_name=perm_data['display_name'],
                            description=perm_data['description']
                        )
                        db.add(granular_perm)
                
                db.commit()
                logger.info("Default granular permissions created successfully")
            except Exception as e:
                logger.error(f"Error creating default granular permissions: {e}")

            logger.info("Database initialization completed successfully")
        except Exception as e:
            db.rollback()
            logger.error(f"Error initializing database: {e}", exc_info=True)
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error initializing database: {e}", exc_info=True)

# Initialize admin user on startup
init_admin_user()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
