# KPIEvaluation model
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from config.database import Base

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
