import hashlib
import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db
from models.user import User

load_dotenv()

BCRYPT_ROUNDS = 12
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security_scheme = HTTPBearer()
optional_bearer = HTTPBearer(auto_error=False)


def _prehash_password(password: str) -> bytes:
    return hashlib.sha256(password.encode("utf-8")).digest()


def get_password_hash(password: str) -> str:
    prehashed = _prehash_password(password)
    hashed = bcrypt.hashpw(prehashed, bcrypt.gensalt(rounds=BCRYPT_ROUNDS))
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    prehashed = _prehash_password(plain_password)
    return bcrypt.checkpw(prehashed, hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_verification_token(user_id: int, email: str) -> str:
    data = {
        "user_id": user_id,
        "email": email,
        "type": "email_verification",
    }
    expires_delta = timedelta(hours=24)
    return create_access_token(data, expires_delta=expires_delta)


def verify_verification_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "email_verification":
            return None
        return payload
    except JWTError:
        return None


def create_password_reset_token(user_id: int, email: str) -> str:
    data = {
        "user_id": user_id,
        "email": email,
        "type": "password_reset",
    }
    expires_delta = timedelta(hours=1)
    return create_access_token(data, expires_delta=expires_delta)


def verify_password_reset_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            return None
        return payload
    except JWTError:
        return None


async def get_user_by_username(username: str, db: AsyncSession) -> Optional[User]:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_email(email: str, db: AsyncSession) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(user_id: int, db: AsyncSession) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def authenticate_user(
    username: str, password: str, db: AsyncSession
) -> Optional[User]:
    user = await get_user_by_username(username, db)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


async def get_bearer_token(
    credentials: HTTPAuthorizationCredentials = Security(security_scheme),
) -> str:
    return credentials.credentials


async def get_current_user(
    token: str = Depends(get_bearer_token),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    result = await db.execute(select(User).where(User.username == username))
    authenticated_user = result.scalar_one_or_none()
    if authenticated_user is None:
        raise credentials_exception

    return authenticated_user


async def get_bearer_token_optional(
    credentials: HTTPAuthorizationCredentials | None = Security(optional_bearer),
) -> str | None:
    if credentials is None:
        return None
    return credentials.credentials


async def get_current_user_optional(
    token: str | None = Depends(get_bearer_token_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if token is None:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except JWTError:
        return None

    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get the current active user"""
    return current_user


async def require_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Dependency to require any authenticated user"""
    return current_user
