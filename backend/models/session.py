"""
Session model — represents a workout session, which can contain multiple sets and associated graph images.
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


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    session_type = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="sessions")
    sets = relationship(
        "Set",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Set.set_number",
    )
    
    graph_images = relationship(
        "GraphImage", back_populates="session", cascade="all, delete-orphan"
    )
