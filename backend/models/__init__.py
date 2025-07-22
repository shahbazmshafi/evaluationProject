# Models package
from config.database import Base, engine

# Import all models to ensure they are registered with SQLAlchemy
from .user import User
from .role import Role
from .permission import Permission
from .role_permission import RolePermission
from .kpi import KPI
from .evaluation_cycle import EvaluationCycle
from .evaluation import Evaluation
from .kpi_evaluation import KPIEvaluation
from .kpi_rating import KPIRating
from .notification import Notification
from .local_storage import LocalStorageUsers, LocalStoragePasswords, LocalStorageKPIs, LocalStorageUserSessions

# Create all tables in the database
def create_tables():
    Base.metadata.create_all(bind=engine)
