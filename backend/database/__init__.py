"""
Database connection and session management
"""

import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={
        "server_settings": {
            "application_name": "todo_api",
        }
    },
)

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    """
    Generator function that yields a database session.

    The 'yield' keyword is special - it:
    1. Creates a session when the function is called
    2. Gives it to your endpoint function
    3. Closes the session when the endpoint finishes

    This ensures database connections are properly cleaned up.
    """
    async with AsyncSessionLocal() as session:
        yield session
