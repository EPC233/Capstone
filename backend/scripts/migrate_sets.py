"""
Migration script: Introduce the `sets` table.

Converts existing accelerometer_data records (which were linked directly
to sessions) into proper Set → AccelerometerData relationships.

Steps:
  1. Create the `sets` table.
  2. For each existing accelerometer_data row, create a corresponding set
     and re-link the accelerometer_data to it.
  3. Drop the old `session_id` column from accelerometer_data and add `set_id`.

Usage:
    # From the backend directory, with DATABASE_URL in your environment:
    python scripts/migrate_sets.py

    # Or via Docker:
    docker compose exec backend python scripts/migrate_sets.py
"""

import asyncio
import os
import sys

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import text
from database import engine


async def migrate():
    async with engine.begin() as conn:
        # ------------------------------------------------------------------
        # 1. Create the `sets` table if it doesn't exist
        # ------------------------------------------------------------------
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS sets (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                    set_number INTEGER NOT NULL,
                    weight_kg DOUBLE PRECISION,
                    status VARCHAR(20) NOT NULL DEFAULT 'empty',
                    created_at TIMESTAMP NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP NOT NULL DEFAULT now()
                );
                """
            )
        )
        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_sets_id ON sets (id);")
        )
        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_sets_session_id ON sets (session_id);")
        )
        print("✅  sets table created (or already exists)")

        # ------------------------------------------------------------------
        # 2. Add `set_id` column to accelerometer_data (nullable for now)
        # ------------------------------------------------------------------
        col_exists = await conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'accelerometer_data' AND column_name = 'set_id'
                """
            )
        )
        if col_exists.fetchone() is None:
            await conn.execute(
                text(
                    """
                    ALTER TABLE accelerometer_data
                    ADD COLUMN set_id INTEGER REFERENCES sets(id) ON DELETE CASCADE;
                    """
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_accelerometer_data_set_id ON accelerometer_data (set_id);"
                )
            )
            print("✅  set_id column added to accelerometer_data")
        else:
            print("ℹ️   set_id column already exists on accelerometer_data")

        # ------------------------------------------------------------------
        # 3. Migrate existing accelerometer_data → sets
        # ------------------------------------------------------------------
        rows = await conn.execute(
            text(
                """
                SELECT id, session_id, created_at
                FROM accelerometer_data
                WHERE set_id IS NULL
                ORDER BY session_id, created_at
                """
            )
        )
        accel_rows = rows.fetchall()

        if accel_rows:
            # Group by session_id to assign set_numbers
            from collections import defaultdict

            by_session: dict[int, list] = defaultdict(list)
            for row in accel_rows:
                by_session[row.session_id].append(row)

            for session_id, records in by_session.items():
                for idx, record in enumerate(records, start=1):
                    # Create a new set
                    result = await conn.execute(
                        text(
                            """
                            INSERT INTO sets (session_id, set_number, status, created_at, updated_at)
                            VALUES (:session_id, :set_number, 'complete', :created_at, :created_at)
                            RETURNING id
                            """
                        ),
                        {
                            "session_id": session_id,
                            "set_number": idx,
                            "created_at": record.created_at,
                        },
                    )
                    new_set_id = result.fetchone().id

                    # Link the accelerometer_data to the new set
                    await conn.execute(
                        text(
                            """
                            UPDATE accelerometer_data
                            SET set_id = :set_id
                            WHERE id = :accel_id
                            """
                        ),
                        {"set_id": new_set_id, "accel_id": record.id},
                    )

            print(f"✅  Migrated {len(accel_rows)} accelerometer_data rows into sets")
        else:
            print("ℹ️   No unmigrated accelerometer_data rows found")

        # ------------------------------------------------------------------
        # 4. Make set_id NOT NULL and drop session_id from accelerometer_data
        # ------------------------------------------------------------------
        # Check if there are still any NULL set_id values
        null_check = await conn.execute(
            text(
                "SELECT COUNT(*) FROM accelerometer_data WHERE set_id IS NULL"
            )
        )
        null_count = null_check.fetchone()[0]

        if null_count == 0:
            # Make set_id NOT NULL
            await conn.execute(
                text(
                    """
                    ALTER TABLE accelerometer_data
                    ALTER COLUMN set_id SET NOT NULL;
                    """
                )
            )
            print("✅  set_id column set to NOT NULL")

            # Drop session_id column if it still exists
            session_col = await conn.execute(
                text(
                    """
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'accelerometer_data' AND column_name = 'session_id'
                    """
                )
            )
            if session_col.fetchone() is not None:
                await conn.execute(
                    text(
                        """
                        ALTER TABLE accelerometer_data
                        DROP COLUMN session_id;
                        """
                    )
                )
                print("✅  Dropped session_id column from accelerometer_data")
            else:
                print("ℹ️   session_id already removed from accelerometer_data")
        else:
            print(
                f"⚠️   {null_count} accelerometer_data rows still have NULL set_id — "
                "skipping NOT NULL constraint and session_id drop"
            )

    print("\n🎉  Migration complete!")


if __name__ == "__main__":
    asyncio.run(migrate())
