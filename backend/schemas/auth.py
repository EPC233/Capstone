"""
Authentication Pydantic schemas for request/response validation
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    """Base schema with common user fields"""

    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    child_name: Optional[str] = None
    child_sex_assigned_at_birth: Optional[str] = None
    child_dob: Optional[date] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user (registration)"""

    password: str
    role: Optional[str] = "user"  # Default role is 'user'


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


class UserDisableRequest(BaseModel):
    """Schema for disabling/enabling a user"""

    user_id: int
    is_active: bool


class UserRoleChangeRequest(BaseModel):
    """Schema for changing a user's role"""

    user_id: int
    role: str


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile fields"""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    child_name: Optional[str] = None
    child_sex_assigned_at_birth: Optional[str] = None
    child_dob: Optional[date] = None
    avatar_url: Optional[str] = None


class PasswordResetRequest(BaseModel):
    """Schema for requesting a password reset email"""

    email: EmailStr


class PasswordResetForm(BaseModel):
    """Schema for submitting password reset with token"""

    token: str
    new_password: str
