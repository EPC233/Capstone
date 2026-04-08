"""
GraphImage model — represents a graph image associated with a session.
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


class GraphImage(Base):
    __tablename__ = "graph_images"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer, ForeignKey("sessions.id"), nullable=False, index=True
    )
    set_id = Column(
        Integer, ForeignKey("sets.id", ondelete="CASCADE"), nullable=True, index=True
    )
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    image_type = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False)

    # Relationships
    session = relationship("Session", back_populates="graph_images")
    set = relationship("Set", back_populates="graph_images")
