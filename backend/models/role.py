"""
Role model for user roles
"""

from datetime import datetime

from sqlalchemy import TIMESTAMP, Column, Integer, String

from .base import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), unique=True, nullable=False, index=True)
    # Role names: 'user', 'manager', 'admin'
    description = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
