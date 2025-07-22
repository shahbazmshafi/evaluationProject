# KPI schemas
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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

class KPIRatingCreate(BaseModel):
    kpi_id: int
    rating: int
    comment: Optional[str] = None
    weightage: float

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

class LocalStorageKPIData(BaseModel):
    kpis: list[dict]
