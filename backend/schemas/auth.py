"""
Authentication Pydantic schemas for request/response validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    """Base schema with common user fields"""

    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user (registration)"""

    password: str


class UserLogin(BaseModel):
    """Schema for user login"""

    username: str
    password: str


class RoleInUser(BaseModel):
    """Role information included in User response"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None


class UserResponse(UserBase):
    """What a user looks like when we send it back to the client"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    role: RoleInUser
    email_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    """Schema for JWT token response"""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for decoded token data"""

    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile fields"""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordResetForm(BaseModel):
    """Schema for submitting password reset with token"""

    token: str
    new_password: str
