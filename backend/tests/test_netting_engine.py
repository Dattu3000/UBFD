import uuid
from datetime import date, time, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.transaction import Transaction
from app.models.audit import AuditLog
from app.models.netting import IntercompanyNettingLog
from app.services.netting_engine import InterCompanyNettingEngine
from app.api.dependencies import DEMO_TENANT_ID


@pytest.mark.asyncio
async def test_detect_and_pair_contra():
    """
    Validates that a debit transfer in Account A pairs with a credit transfer in Account B
    within 48 hours, creating contra flags and an MCA Rule 3 audit record.
    """
    async with async_session_factory() as session:
        acc_a = uuid.UUID("f81d4fae-7dec-11d0-a765-00a0c91e6bf6")
        acc_b = uuid.UUID("b3333333-3333-3333-3333-333333333333")
        test_date = date(2026, 11, 1)
        transfer_amount = Decimal("75000.00")

        # 1. Create debit in Account A
        tx_debit = Transaction(
            transaction_id=uuid.uuid4(),
            tenant_id=DEMO_TENANT_ID,
            account_id=acc_a,
            transaction_date=test_date,
            transaction_time=time(10, 0, 0),
            reference_number="RTGS_TEST_DR_01",
            counterparty_name="Sister Logistics LLP",
            narration="RTGS DR TO LOGISTICS",
            debit_amount=transfer_amount,
            credit_amount=Decimal("0.00"),
            running_balance=Decimal("1000000.00"),
            category="Inter-Company",
            is_intercompany=False,
        )

        # 2. Create matching credit in Account B (1 day later)
        tx_credit = Transaction(
            transaction_id=uuid.uuid4(),
            tenant_id=DEMO_TENANT_ID,
            account_id=acc_b,
            transaction_date=test_date + timedelta(days=1),
            transaction_time=time(11, 30, 0),
            reference_number="RTGS_TEST_CR_01",
            counterparty_name="Alpha Retailers Pvt Ltd",
            narration="RTGS CR FROM RETAILERS",
            debit_amount=Decimal("0.00"),
            credit_amount=transfer_amount,
            running_balance=Decimal("500000.00"),
            category="Inter-Company",
            is_intercompany=False,
        )

        session.add_all([tx_debit, tx_credit])
        await session.commit()

        # 3. Trigger Netting Engine
        engine = InterCompanyNettingEngine(session)
        netting_log = await engine.detect_and_pair(tx_debit, user_id="test-auditor")

        assert netting_log is not None
        assert netting_log.status == "ELIMINATED"
        assert netting_log.netted_amount == transfer_amount
        assert netting_log.destination_transaction_id == tx_credit.transaction_id

        # Verify contra tags on both transactions
        assert tx_debit.is_intercompany is True
        assert tx_debit.intercompany_pair_id == tx_credit.transaction_id
        assert tx_credit.is_intercompany is True
        assert tx_credit.intercompany_pair_id == tx_debit.transaction_id

        # 4. Verify MCA Rule 3 Immutable Audit Log
        audit_entry = await session.scalar(
            select(AuditLog).where(
                AuditLog.record_id == str(netting_log.log_id),
                AuditLog.action == "CONTRA_PAIR_CREATED"
            )
        )
        assert audit_entry is not None
        assert audit_entry.user_id == "test-auditor"


@pytest.mark.asyncio
async def test_netting_window_exceeded_no_pair():
    """
    Validates that matching transactions outside the 48-hour tolerance window do NOT pair.
    """
    async with async_session_factory() as session:
        acc_a = uuid.UUID("f81d4fae-7dec-11d0-a765-00a0c91e6bf6")
        acc_b = uuid.UUID("b3333333-3333-3333-3333-333333333333")
        transfer_amount = Decimal("33333.00")

        tx_debit = Transaction(
            transaction_id=uuid.uuid4(),
            tenant_id=DEMO_TENANT_ID,
            account_id=acc_a,
            transaction_date=date(2026, 11, 10),
            reference_number="OUTSIDE_DR_01",
            counterparty_name="Sister Logistics",
            narration="OLD TRANSFER",
            debit_amount=transfer_amount,
            credit_amount=Decimal("0.00"),
            running_balance=Decimal("1000000.00"),
            category="Inter-Company",
            is_intercompany=False,
        )

        # 5 days later (outside max 2 days window)
        tx_credit = Transaction(
            transaction_id=uuid.uuid4(),
            tenant_id=DEMO_TENANT_ID,
            account_id=acc_b,
            transaction_date=date(2026, 11, 15),
            reference_number="OUTSIDE_CR_01",
            counterparty_name="Alpha Retailers",
            narration="LATE CREDIT",
            debit_amount=Decimal("0.00"),
            credit_amount=transfer_amount,
            running_balance=Decimal("500000.00"),
            category="Inter-Company",
            is_intercompany=False,
        )

        session.add_all([tx_debit, tx_credit])
        await session.commit()

        engine = InterCompanyNettingEngine(session)
        netting_log = await engine.detect_and_pair(tx_debit)
        assert netting_log is None
        assert tx_debit.is_intercompany is False
