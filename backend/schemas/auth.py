"""
Schemas for user authentication and profile management. Kinda deprecated since this wont be going live, but
allows for multiple users on the same instance which is cool.

Schemas:
    __________ User schemas __________
    UserBase - Base schema for user data
    UserCreate - Create/Register a new user
    UserLogin - User login credentials
    UserResponse - User data returned to the client
    UserProfileUpdate - Update user profile fields

    __________ Token schemas __________
    Token - JWT token response
    TokenData - Decoded token

    __________ Password reset schemas __________
    PasswordResetRequest - Request a password reset email
    PasswordResetForm - Submit a new password with reset token
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email_verified: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None


class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetForm(BaseModel):
    token: str
    new_password: str
