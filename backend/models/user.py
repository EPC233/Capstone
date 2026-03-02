from sqlalchemy import (
    Boolean,
    Column,
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
    email_verified = Column(Boolean, default=False, nullable=False, index=True)

    # Optional fields
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # Relationships
    workout_sessions = relationship(
        "WorkoutSession", back_populates="user", cascade="all, delete-orphan"
    )
