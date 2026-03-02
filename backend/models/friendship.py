"""
Friendship model for friend relationships between users
"""

from datetime import datetime

from sqlalchemy import (
    TIMESTAMP,
    Column,
    Enum,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .base import Base

import enum


class FriendshipStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    addressee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(FriendshipStatus), default=FriendshipStatus.PENDING, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False)

    # Relationships
    requester = relationship("User", foreign_keys=[requester_id], backref="sent_requests")
    addressee = relationship("User", foreign_keys=[addressee_id], backref="received_requests")

    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="unique_friendship"),
    )
