"""
Set model — represents a single set within a workout session.
"""

from datetime import datetime

from sqlalchemy import (
    TIMESTAMP,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .base import Base


class Set(Base):
    __tablename__ = "sets"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer, ForeignKey("sessions.id"), nullable=False, index=True
    )
    set_number = Column(Integer, nullable=False)
    name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    weight_kg = Column(Float, nullable=True)
    status = Column(
        String(20), nullable=False, default="empty"
    )
    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    session = relationship("Session", back_populates="sets")
    accelerometer_data = relationship(
        "AccelerometerData",
        back_populates="set",
        cascade="all, delete-orphan",
        uselist=False,
    )
    rep_details = relationship(
        "RepDetail",
        back_populates="set",
        cascade="all, delete-orphan",
        order_by="RepDetail.rep_number",
    )
    graph_images = relationship(
        "GraphImage",
        back_populates="set",
        cascade="all, delete-orphan",
    )
