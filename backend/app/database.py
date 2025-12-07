import os
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./codepair.db")


class Base(DeclarativeBase):
    pass


def create_engine(database_url: str = DATABASE_URL) -> AsyncEngine:
    return create_async_engine(database_url, echo=False, future=True)


engine = create_engine()
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
