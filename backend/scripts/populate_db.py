"""
Seed script to create an admin user for the fitness tracker.

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
from database.migrations import seed_initial_data
from models import Base, Role, User

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not set in environment variables")
    sys.exit(1)

# Create engine and session
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def create_admin_user(db: AsyncSession):
    """Create admin user with hardcoded credentials"""
    # Check if admin user already exists
    result = await db.execute(
        select(User).where(User.username == "admin")
    )
    existing_admin = result.scalar_one_or_none()

    if existing_admin:
        print("✅ Admin user already exists")
        return existing_admin

    # Get admin role
    result = await db.execute(select(Role).where(Role.name == "admin"))
    admin_role = result.scalar_one_or_none()

    if not admin_role:
        print("❌ Admin role not found. Make sure migrations have run.")
        sys.exit(1)

    # Create admin user
    admin_user = User(
        username="admin",
        email="admin@fitnesstracker.com",
        hashed_password=get_password_hash("admin"),
        role_id=admin_role.id,
        email_verified=True,
        is_active=True,
        first_name="Admin",
        last_name="User",
    )

    db.add(admin_user)
    await db.commit()
    await db.refresh(admin_user)

    print("✅ Created admin user:")
    print(f"   Username: admin")
    print(f"   Password: admin")
    print(f"   Email: admin@fitnesstracker.com")

    return admin_user


async def populate_database():
    """Main function to populate the database"""
    print("=" * 60)
    print("FITNESS TRACKER - DATABASE POPULATION")
    print("=" * 60)

    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created")

        # Seed initial data (roles)
        await seed_initial_data(conn)

    # Create admin user
    async with AsyncSessionLocal() as db:
        await create_admin_user(db)

    print("=" * 60)
    print("✅ DATABASE POPULATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(populate_database())
