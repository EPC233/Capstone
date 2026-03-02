"""
Seed script to create a test user for the fitness tracker.

Usage:
    python backend/scripts/populate_db.py
"""

import asyncio
import os
import sys

# Add parent directory to path to import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.future import select
from sqlalchemy.orm import sessionmaker

from auth import get_password_hash
from models import Base, User

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not set in environment variables")
    sys.exit(1)

# Create engine and session
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def create_test_user(db: AsyncSession):
    """Create test user with hardcoded credentials"""
    # Check if test user already exists
    result = await db.execute(
        select(User).where(User.username == "testuser")
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        print("✅ Test user already exists")
        return existing_user

    # Create test user
    test_user = User(
        username="testuser",
        email="test@fitnesstracker.com",
        hashed_password=get_password_hash("testpass"),
        email_verified=True,
        is_active=True,
        first_name="Test",
        last_name="User",
    )

    db.add(test_user)
    await db.commit()
    await db.refresh(test_user)

    print("✅ Created test user:")
    print(f"   Username: testuser")
    print(f"   Password: testpass")
    print(f"   Email: test@fitnesstracker.com")

    return test_user


async def populate_database():
    """Main function to populate the database"""
    print("=" * 60)
    print("FITNESS TRACKER - DATABASE POPULATION")
    print("=" * 60)

    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created")

    # Create test user
    async with AsyncSessionLocal() as db:
        await create_test_user(db)

    print("=" * 60)
    print("✅ DATABASE POPULATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(populate_database())
