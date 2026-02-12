"""
User model for authentication and authorization
"""

from datetime import datetime

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from .base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role_id = Column(
        Integer, ForeignKey("roles.id"), nullable=False, index=True, default=1
    )  # Default to 'user' role (id=1)
    email_verified = Column(
        Boolean, default=False, nullable=False, index=True
    )  # Email verification status
    is_active = Column(
        Boolean, default=True, nullable=False, index=True
    )  # User account active status
    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Optional user profile fields
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)  # URL to avatar image

    # Relationship to Role
    role = relationship("Role", backref="users")
    
    # Relationship to WorkoutSessions
    workout_sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
