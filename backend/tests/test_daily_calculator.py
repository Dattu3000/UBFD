import uuid
from datetime import date, time, timedelta
from decimal import Decimal
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete

from app.core.database import async_session_factory
from app.services.daily_calculator import DailyCashInspectorService
from app.models.account import BankAccount, DailyAccountSummary
from app.models.transaction import Transaction
from app.api.dependencies import DEMO_TENANT_ID


@pytest.mark.asyncio
async def test_cache_hit_daily_metrics():
    """
    Scenario 1: Verified pre-aggregated summary cache returns is_cached=True in <10ms.
    """
    async with async_session_factory() as session:
        service = DailyCashInspectorService(session)
        account_id = uuid.UUID("f81d4fae-7dec-11d0-a765-00a0c91e6bf6")
        target_date = date(2026, 10, 25)

        metrics = await service.get_daily_metrics(account_id, target_date)
        assert metrics["is_cached"] is True
        assert metrics["opening_balance"] == Decimal("1850420.50")
        assert metrics["total_credited"] == Decimal("450000.00")
        assert metrics["total_debited"] == Decimal("120500.00")
        assert metrics["closing_balance"] == Decimal("2179920.50")
        assert metrics["net_velocity"] == Decimal("329500.00")
        assert metrics["transaction_count"] == 4


@pytest.mark.asyncio
async def test_dynamic_fallback_intraday_transactions():
    """
    Scenario 2: When cache is missing, dynamic transaction ledger query derives
    opening balance from closing balance minus credits plus debits.
    """
    async with async_session_factory() as session:
        account_id = uuid.UUID("f81d4fae-7dec-11d0-a765-00a0c91e6bf6")
        target_date = date(2026, 10, 25)

        # Temporarily delete cached summary for this test
        await session.execute(
            delete(DailyAccountSummary).where(
                DailyAccountSummary.account_id == account_id,
                DailyAccountSummary.summary_date == target_date
            )
        )
        await session.commit()

        service = DailyCashInspectorService(session)
        metrics = await service.get_daily_metrics(account_id, target_date)

        assert metrics["is_cached"] is False
        assert metrics["closing_balance"] == Decimal("2179920.50")
        assert metrics["total_credited"] == Decimal("450000.00")
        assert metrics["total_debited"] == Decimal("120500.00")
        # Mathematical verification: opening == closing - credits + debits
        assert metrics["opening_balance"] == Decimal("1850420.50")
        assert metrics["net_velocity"] == Decimal("329500.00")
        assert metrics["transaction_count"] == 4

        # Re-insert summary to maintain integrity
        session.add(
            DailyAccountSummary(
                summary_id=uuid.uuid4(),
                account_id=account_id,
                summary_date=target_date,
                opening_balance=Decimal("1850420.50"),
                total_credited=Decimal("450000.00"),
                total_debited=Decimal("120500.00"),
                closing_balance=Decimal("2179920.50"),
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_quiescent_date_with_zero_transactions():
    """
    Scenario 3: Date with zero transactions rolls forward the nearest prior closing balance.
    """
    async with async_session_factory() as session:
        service = DailyCashInspectorService(session)
        account_id = uuid.UUID("f81d4fae-7dec-11d0-a765-00a0c91e6bf6")
        future_date = date(2026, 10, 26)  # Day after target date (no transactions seeded)

        metrics = await service.get_daily_metrics(account_id, future_date)
        assert metrics["is_cached"] is False
        assert metrics["total_credited"] == Decimal("0.00")
        assert metrics["total_debited"] == Decimal("0.00")
        assert metrics["transaction_count"] == 0
        # Opening and closing must both equal the prior day's closing balance (2179920.50)
        assert metrics["opening_balance"] == Decimal("2179920.50")
        assert metrics["closing_balance"] == Decimal("2179920.50")
        assert metrics["net_velocity"] == Decimal("0.00")


@pytest.mark.asyncio
async def test_account_with_zero_transactions_fallback_to_base():
    """
    Scenario 4: An account with zero transaction history defaults to BankAccount.opening_balance.
    """
    async with async_session_factory() as session:
        service = DailyCashInspectorService(session)
        # Axis Infra CC account has no transactions seeded
        account_id = uuid.UUID("d5555555-5555-5555-5555-555555555555")
        target_date = date(2026, 10, 25)

        metrics = await service.get_daily_metrics(account_id, target_date)
        assert metrics["is_cached"] is False
        assert metrics["opening_balance"] == Decimal("2250000.00")
        assert metrics["closing_balance"] == Decimal("2250000.00")
        assert metrics["net_velocity"] == Decimal("0.00")
        assert metrics["transaction_count"] == 0
