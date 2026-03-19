"""
RepDetail model — stores per-rep analysis results for a set.
"""

from datetime import datetime

from sqlalchemy import (
    TIMESTAMP,
    Column,
    Float,
    ForeignKey,
    Integer,
)
from sqlalchemy.orm import relationship

from .base import Base


class RepDetail(Base):
    __tablename__ = "rep_details"

    id = Column(Integer, primary_key=True, index=True)
    set_id = Column(
        Integer, ForeignKey("sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rep_number = Column(Integer, nullable=False)
    start_sample = Column(Integer, nullable=False)
    end_sample = Column(Integer, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    rom_meters = Column(Float, nullable=False)
    rom_cm = Column(Float, nullable=False)
    peak_velocity = Column(Float, nullable=False)
    avg_velocity = Column(Float, nullable=False)
    peak_accel = Column(Float, nullable=False)
    avg_watts = Column(Float, nullable=True)
    rest_at_top_seconds = Column(Float, nullable=True)
    rest_at_bottom_seconds = Column(Float, nullable=True)

    # Eccentric phase
    ecc_start_sample = Column(Integer, nullable=True)
    ecc_end_sample = Column(Integer, nullable=True)
    ecc_duration_seconds = Column(Float, nullable=True)
    ecc_peak_velocity = Column(Float, nullable=True)
    ecc_avg_velocity = Column(Float, nullable=True)
    ecc_peak_accel = Column(Float, nullable=True)
    ecc_avg_accel = Column(Float, nullable=True)
    ecc_avg_watts = Column(Float, nullable=True)

    # Concentric phase
    con_start_sample = Column(Integer, nullable=True)
    con_end_sample = Column(Integer, nullable=True)
    con_duration_seconds = Column(Float, nullable=True)
    con_peak_velocity = Column(Float, nullable=True)
    con_avg_velocity = Column(Float, nullable=True)
    con_peak_accel = Column(Float, nullable=True)
    con_avg_accel = Column(Float, nullable=True)
    con_avg_watts = Column(Float, nullable=True)

    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False)

    # Relationships
    set = relationship("Set", back_populates="rep_details")
