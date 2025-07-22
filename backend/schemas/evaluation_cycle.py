# Evaluation cycle schemas
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import date, datetime

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
    remaining_days: Optional[int] = None

    class Config:
        from_attributes = True

class PaginatedEvaluationCycleResponse(BaseModel):
    items: List[EvaluationCycleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
