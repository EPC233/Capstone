"""
Routes for user management stuff - mostly deprecated but still good to have ig.

Routes:
    POST /auth/register - Register a new account
    POST /auth/login - Authenticate user and return token
    GET /auth/me - Retrieve current user profile
    PATCH /auth/me/profile - Update current user profile
    POST /auth/forgot-password - Request password reset token via email
    POST /auth/reset-password - Reset password using valid reset token
    GET /auth/users/search - Search for users by username
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Security, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    create_password_reset_token,
    get_current_active_user,
    get_password_hash,
    get_user_by_email,
    get_user_by_username,
    security_scheme,
    verify_password_reset_token,
)
from database import get_db
from models.user import User
from schemas.auth import (
    PasswordResetForm,
    PasswordResetRequest,
    Token,
    UserCreate,
    UserLogin,
    UserProfileUpdate,
    UserResponse,
)
from services.email_service import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    username = user_data.username.strip()
    email = user_data.email.strip()
    password = user_data.password.strip()

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

    existing_user = await get_user_by_username(username, db)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    existing_email = await get_user_by_email(email, db)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

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


@router.post("/forgot-password", status_code=200)
async def forgot_password(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    email = data.email.strip().lower()
    user = await get_user_by_email(email, db)
    if user:
        token = create_password_reset_token(user.id, user.email)
        send_password_reset_email(user.email, token)
    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=200)
async def reset_password(
    data: PasswordResetForm,
    db: AsyncSession = Depends(get_db),
):
    payload = verify_password_reset_token(data.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token payload",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found",
        )

    new_password = data.new_password.strip()
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters",
        )

    user.hashed_password = get_password_hash(new_password)
    await db.commit()
    return {"message": "Password has been reset successfully."}


@router.get(
    "/users/search",
    response_model=list[UserResponse],
    dependencies=[Security(security_scheme)],
)
async def search_users(
    q: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not q or len(q) < 2:
        return []

    safe_q = q.replace("%", "\\%").replace("_", "\\_")
    result = await db.execute(
        select(User)
        .where(User.username.ilike(f"%{safe_q}%"))
        .where(User.id != current_user.id)
        .limit(20)
    )
    return result.scalars().all()
