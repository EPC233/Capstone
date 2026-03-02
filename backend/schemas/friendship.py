"""
Friendship Pydantic schemas for request/response validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models.friendship import FriendshipStatus


class FriendRequest(BaseModel):
    """Schema for sending a friend request"""

    addressee_id: int


class FriendRequestResponse(BaseModel):
    """Schema for responding to a friend request"""

    friendship_id: int
    accept: bool


class FriendUser(BaseModel):
    """Schema for a user in friend context"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None


class FriendshipResponse(BaseModel):
    """Schema for friendship data returned to client"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    requester: FriendUser
    addressee: FriendUser
    status: FriendshipStatus
    created_at: datetime


class FriendListResponse(BaseModel):
    """Schema for a friend in the friends list"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    friendship_id: int
