import pytest_asyncio
from app.core.database import Base, engine, init_db, async_session_factory
from app.core.seeder import seed_demo_data_if_empty


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    """
    Ensure clean database tables and initial demo seed are loaded before test suite executes.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await init_db()
    async with async_session_factory() as session:
        await seed_demo_data_if_empty(session)
    yield
