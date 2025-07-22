# Evaluation schemas
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class KPIEvaluationCreate(BaseModel):
    kpi_id: int
    title: str
    description: str
    category: str
    weightage: float
    rating: int
    comment: Optional[str] = None

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
    submitted_by: Optional[int] = None

class EvaluationStartRequest(BaseModel):
    employee_id: int
    period: str
    cycle_id: Optional[int] = None
    comments: Optional[str] = None

class EvaluationSubmitRequest(BaseModel):
    kpi_evaluations: List[KPIEvaluationCreate]
    comments: Optional[str] = None
    manager_comments: Optional[str] = None

class EvaluationResponse(BaseModel):
    id: int
    employee_id: int
    manager_id: int
    cycle_id: Optional[int] = None
    period: str
    raw_score: float
    normalized_score: float
    performance_label: str
    increment_percentage: float
    status: str
    comments: Optional[str]
    manager_comments: Optional[str]
    admin_comments: Optional[str]
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    rejected_at: Optional[datetime]
    created_by: int
    submitted_by: Optional[int] = None
    drafted_by: Optional[int] = None
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
