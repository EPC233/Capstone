"""
Workout session model for fitness tracking
"""

from datetime import datetime

from sqlalchemy import (
    TIMESTAMP,
    Column,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .base import Base


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    workout_type = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="workout_sessions")
    accelerometer_data = relationship(
        "AccelerometerData",
        back_populates="workout_session",
        cascade="all, delete-orphan",
    )
    graph_images = relationship(
        "GraphImage", back_populates="workout_session", cascade="all, delete-orphan"
    )
