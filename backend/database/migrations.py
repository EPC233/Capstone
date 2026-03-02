"""
Database seeding for starter code

This module seeds initial data required for the application to function.
For fresh databases, SQLAlchemy's create_all() handles table creation,
so we only need to seed lookup data (roles).

For production, consider using Alembic for more robust migration management.
"""

from sqlalchemy import text


async def run_migrations(conn):
    """
    Placeholder for migrations (not needed for fresh databases).

    SQLAlchemy's Base.metadata.create_all() creates all tables from models.
    This function is kept for compatibility but does nothing.
    """
    pass


async def seed_initial_data(conn):
    """
    Seed initial data (lookup tables, default values, etc.).

    This ensures required data exists even on fresh databases.
    Currently seeds:
    - Roles (user) - REQUIRED for authentication
    """
    await _seed_roles(conn)


async def _seed_roles(conn):
    """Seed initial roles if they don't exist"""
    try:
        result = await conn.execute(
            text(
                """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name='roles'
            )
            """
            )
        )
        table_exists = result.scalar()

        if not table_exists:
            print("⚠️  Roles table does not exist yet. Skipping seed.")
            return

        result = await conn.execute(text("SELECT COUNT(*) FROM roles"))
        count = result.scalar()

        await conn.execute(
            text(
                """
            INSERT INTO roles (name, description, created_at, updated_at) VALUES 
                ('user', 'Standard user role', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (name) DO NOTHING;
            """
            )
        )

        if count == 0:
            print("✅ Seeded initial role (user)")
        else:
            print("✅ Verified role exists (user)")
    except Exception as e:
        print(f"⚠️  Seed note (roles): {e}")
