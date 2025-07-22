# KPI routes
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..config.database import get_db
from ..config.security import get_current_user
from ..models.user import User
from ..schemas.kpi import KPICreate, KPIResponse, KPIUpdate
from ..services.kpi import KPIService
from ..services.kpi_update import KPIUpdateService

router = APIRouter()

@router.get("", response_model=List[KPIResponse])
def get_kpis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all KPIs
    """
    # Check if user has permission to view all KPIs
    if current_user.role.name != "Admin" and current_user.role.name != "Manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view all KPIs")

    return KPIService.get_kpis(db)

@router.get("/managed", response_model=List[KPIResponse])
def get_managed_kpis(
    status: Optional[str] = None,
    type: Optional[str] = None,
    sort_by: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get KPIs managed by the current user
    """
    # Check if user has permission to view managed KPIs
    if current_user.role.name != "Manager" and current_user.role.name != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view managed KPIs")

    return KPIService.get_managed_kpis(db, current_user, status, type, sort_by)

@router.get("/employee/{employee_id}", response_model=List[KPIResponse])
def get_employee_kpis(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get KPIs for a specific employee
    """
    # Check if user has permission to view employee KPIs
    if current_user.role.name != "Admin" and current_user.id != employee_id and current_user.id != db.query(User).filter(User.id == employee_id).first().manager_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this employee's KPIs")

    return KPIService.get_employee_kpis(db, employee_id, current_user)

@router.post("", response_model=KPIResponse)
def create_kpi(kpi: KPICreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a new KPI
    """
    # Check if user has permission to create KPIs
    if current_user.role.name != "Admin" and current_user.role.name != "Manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create KPIs")

    return KPIService.create_kpi(db, kpi, current_user)

@router.put("/{kpi_id}", response_model=KPIResponse)
def update_kpi(kpi_id: int, kpi: KPIUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update a KPI
    """
    # Check if user has permission to update KPIs
    if current_user.role.name != "Admin" and current_user.role.name != "Manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update KPIs")

    return KPIUpdateService.update_kpi(db, kpi_id, kpi, current_user)

@router.delete("/{kpi_id}", response_model=KPIResponse)
def delete_kpi(kpi_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete a KPI
    """
    return KPIService.delete_kpi(db, kpi_id, current_user)
