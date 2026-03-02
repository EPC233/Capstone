"""
Authentication API endpoints
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Security, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_password_hash,
    get_user_by_email,
    get_user_by_username,
    security_scheme,
)
from database import get_db
from models.user import User
from schemas.auth import (
    Token,
    UserCreate,
    UserLogin,
    UserProfileUpdate,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user.
    """
    # Sanitize input - strip whitespace
    username = user_data.username.strip()
    email = user_data.email.strip()
    password = user_data.password.strip()

    # Validate that fields are not empty after stripping
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username cannot be empty",
        )
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email cannot be empty",
        )
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot be empty",
        )

    # Check if username already exists
    existing_user = await get_user_by_username(username, db)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Check if email already exists
    existing_email = await get_user_by_email(email, db)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    hashed_password = get_password_hash(password)
    db_user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        email_verified=True,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        avatar_url=user_data.avatar_url,
    )

    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    return db_user


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Login endpoint that returns a JWT token.
    """
    user = await authenticate_user(login_data.username, login_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get(
    "/me",
    response_model=UserResponse,
    dependencies=[Security(security_scheme)],
)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get the current authenticated user's information.
    """
    return current_user


@router.patch(
    "/me/profile",
    response_model=UserResponse,
    dependencies=[Security(security_scheme)],
)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the current user's profile fields.
    """
    # Update profile fields if provided
    if profile_data.first_name is not None:
        current_user.first_name = (
            profile_data.first_name.strip() if profile_data.first_name else None
        )
    if profile_data.last_name is not None:
        current_user.last_name = (
            profile_data.last_name.strip() if profile_data.last_name else None
        )
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url

    await db.commit()
    await db.refresh(current_user)

    return current_user

