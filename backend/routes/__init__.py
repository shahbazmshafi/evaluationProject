# Routes package
# This package contains API routes for the application
from fastapi import APIRouter

# Create main router
api_router = APIRouter()

# Import and include all route modules
from .auth import router as auth_router
from .user import router as user_router
from .role import router as role_router
from .kpi import router as kpi_router
from .evaluation import router as evaluation_router
from .local_storage import router as local_storage_router

# Include all routers
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(user_router, prefix="/users", tags=["Users"])
api_router.include_router(role_router, prefix="/roles", tags=["Roles"])
api_router.include_router(kpi_router, prefix="/kpis", tags=["KPIs"])
api_router.include_router(evaluation_router, prefix="/evaluations", tags=["Evaluations"])
api_router.include_router(local_storage_router, prefix="/local-storage", tags=["Local Storage"])