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
from models import Base, User, Session, Friendship, FriendshipStatus

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


async def create_test_user2(db: AsyncSession):
    """Create second test user with hardcoded credentials"""
    # Check if test user already exists
    result = await db.execute(
        select(User).where(User.username == "testuser2")
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        print("✅ Test user 2 already exists")
        return existing_user

    # Create test user 2
    test_user2 = User(
        username="testuser2",
        email="test2@fitnesstracker.com",
        hashed_password=get_password_hash("testpass2"),
        email_verified=True,
        first_name="Test",
        last_name="User2",
    )

    db.add(test_user2)
    await db.commit()
    await db.refresh(test_user2)

    print("✅ Created test user 2:")
    print(f"   Username: testuser2")
    print(f"   Password: testpass2")
    print(f"   Email: test2@fitnesstracker.com")

    return test_user2


async def create_test_user3(db: AsyncSession):
    """Create third test user with hardcoded credentials (no friends)"""
    # Check if test user already exists
    result = await db.execute(
        select(User).where(User.username == "testuser3")
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        print("✅ Test user 3 already exists")
        return existing_user

    # Create test user 3
    test_user3 = User(
        username="testuser3",
        email="test3@fitnesstracker.com",
        hashed_password=get_password_hash("testpass3"),
        email_verified=True,
        first_name="Test",
        last_name="User3",
    )

    db.add(test_user3)
    await db.commit()
    await db.refresh(test_user3)

    print("✅ Created test user 3:")
    print(f"   Username: testuser3")
    print(f"   Password: testpass3")
    print(f"   Email: test3@fitnesstracker.com")

    return test_user3


async def create_test_sessions(db: AsyncSession, user1: User, user2: User, user3: User):
    """Create test sessions for both users"""
    # Check if sessions already exist
    result = await db.execute(
        select(Session).where(Session.name == "Test Session 1")
    )
    existing_session1 = result.scalar_one_or_none()

    if not existing_session1:
        session1 = Session(
            user_id=user1.id,
            name="Test Session 1",
            description="Morning workout session for testuser",
            session_type="cardio",
        )
        db.add(session1)
        print("✅ Created test session 1 for testuser")
    else:
        print("✅ Test session 1 already exists")

    result = await db.execute(
        select(Session).where(Session.name == "Test Session 2")
    )
    existing_session2 = result.scalar_one_or_none()

    if not existing_session2:
        session2 = Session(
            user_id=user2.id,
            name="Test Session 2",
            description="Evening strength training for testuser2",
            session_type="strength",
        )
        db.add(session2)
        print("✅ Created test session 2 for testuser2")
    else:
        print("✅ Test session 2 already exists")

    result = await db.execute(
        select(Session).where(Session.name == "Test Session 3")
    )
    existing_session3 = result.scalar_one_or_none()

    if not existing_session3:
        session3 = Session(
            user_id=user3.id,
            name="Test Session 3",
            description="Solo HIIT workout for testuser3",
            session_type="hiit",
        )
        db.add(session3)
        print("✅ Created test session 3 for testuser3")
    else:
        print("✅ Test session 3 already exists")

    await db.commit()


async def create_friendship(db: AsyncSession, user1: User, user2: User):
    """Create accepted friendship between two users"""
    # Check if friendship already exists
    result = await db.execute(
        select(Friendship).where(
            ((Friendship.requester_id == user1.id) & (Friendship.addressee_id == user2.id)) |
            ((Friendship.requester_id == user2.id) & (Friendship.addressee_id == user1.id))
        )
    )
    existing_friendship = result.scalar_one_or_none()

    if existing_friendship:
        print("✅ Friendship already exists between test users")
        return existing_friendship

    # Create accepted friendship
    friendship = Friendship(
        requester_id=user1.id,
        addressee_id=user2.id,
        status=FriendshipStatus.ACCEPTED,
    )

    db.add(friendship)
    await db.commit()
    await db.refresh(friendship)

    print("✅ Created friendship between testuser and testuser2")

    return friendship


async def populate_database():
    """Main function to populate the database"""
    print("=" * 60)
    print("FITNESS TRACKER - DATABASE POPULATION")
    print("=" * 60)

    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created")

    # Create test users, sessions, and friendship
    async with AsyncSessionLocal() as db:
        user1 = await create_test_user(db)
        user2 = await create_test_user2(db)
        user3 = await create_test_user3(db)
        await create_test_sessions(db, user1, user2, user3)
        await create_friendship(db, user1, user2)

    print("=" * 60)
    print("✅ DATABASE POPULATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(populate_database())
