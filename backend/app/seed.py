"""Initialize schema and the first administrator without sample learning data."""

import asyncio
import os

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models import User, UserRole


async def init_db():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def seed_data():
    """Create the first admin on an empty database; preserve existing data."""
    await init_db()
    async with AsyncSessionLocal() as session:
        existing_user = (await session.execute(select(User.id).limit(1))).scalar_one_or_none()
        if existing_user is not None:
            print("Database already initialized; preserving all existing data.")
            return

        password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD")
        if not password:
            raise RuntimeError("Set ADMIN_BOOTSTRAP_PASSWORD before initializing a new database")

        session.add(User(
            email=os.getenv("ADMIN_BOOTSTRAP_EMAIL", "admin@example.com"),
            hashed_password=get_password_hash(password),
            full_name="Quản trị viên",
            role=UserRole.ADMIN,
            is_active=True,
        ))
        await session.commit()
        print("Created the initial administrator. No sample quizzes or courses were loaded.")


if __name__ == "__main__":
    asyncio.run(seed_data())
