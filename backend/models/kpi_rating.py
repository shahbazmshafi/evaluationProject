# KPIRating model (kept for backward compatibility)
from sqlalchemy import Column, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship

from config.database import Base

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
