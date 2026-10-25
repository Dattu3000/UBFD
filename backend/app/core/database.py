from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings


class Base(DeclarativeBase):
    pass


# Detect sqlite vs postgresql
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=connect_args,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async database session.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def set_tenant_rls_context(session: AsyncSession, tenant_id: UUID) -> None:
    """
    Enforces PostgreSQL Row-Level Security (RLS) tenant context.
    Safely no-ops when running against SQLite in local development/test mode.
    """
    if "postgresql" in settings.DATABASE_URL:
        await session.execute(
            text(f"SET LOCAL app.current_tenant_id = '{str(tenant_id)}'")
        )


async def init_db() -> None:
    """
    Creates database schema if tables do not exist.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # SQLite lightweight column migration for live account & consent additions
        if "sqlite" in settings.DATABASE_URL:
            res = await conn.execute(text("PRAGMA table_info(bank_accounts)"))
            cols = [row[1] for row in res.fetchall()]
            if cols:
                if "is_live" not in cols:
                    await conn.execute(text("ALTER TABLE bank_accounts ADD COLUMN is_live BOOLEAN NOT NULL DEFAULT 0"))
                if "consent_id" not in cols:
                    await conn.execute(text("ALTER TABLE bank_accounts ADD COLUMN consent_id VARCHAR(36)"))
