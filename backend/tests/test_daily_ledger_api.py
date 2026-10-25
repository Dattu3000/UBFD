import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_get_daily_ledger_success():
    """
    Validates GET /accounts/{account_id}/daily-ledger returns 200 with summary and transactions.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        account_id = "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
        res = await ac.get(f"{settings.API_V1_STR}/accounts/{account_id}/daily-ledger?date=2026-10-25")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        
        # Verify account info
        acc_info = data["data"]["account"]
        assert acc_info["bank_code"] == "HDFC"
        assert acc_info["account_mask"] == "•••• 9482"
        assert acc_info["custom_tag"] == "PRIMARY OPERATING"

        # Verify summary
        summary = data["data"]["summary"]
        assert float(summary["opening_balance"]) == 1850420.50
        assert float(summary["total_credited"]) == 450000.00
        assert float(summary["total_debited"]) == 120500.00
        assert float(summary["closing_balance"]) == 2179920.50
        assert float(summary["net_velocity"]) == 329500.00

        # Verify transactions
        transactions = data["data"]["transactions"]
        assert len(transactions) == 4
        ref_numbers = [t["reference_number"] for t in transactions]
        assert "CMS2948201948" in ref_numbers
        assert "HDFC0092841029" in ref_numbers


@pytest.mark.asyncio
async def test_get_daily_ledger_search_filter():
    """
    Validates search query filter matches narration or counterparty.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        account_id = "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
        res = await ac.get(
            f"{settings.API_V1_STR}/accounts/{account_id}/daily-ledger?date=2026-10-25&search=Packaging"
        )
        assert res.status_code == 200
        data = res.json()
        transactions = data["data"]["transactions"]
        assert len(transactions) == 1
        assert "Packaging" in transactions[0]["counterparty_name"]


@pytest.mark.asyncio
async def test_get_daily_ledger_exclude_contra():
    """
    Validates exclude_contra=true omits inter-company fund movements.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        account_id = "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
        res = await ac.get(
            f"{settings.API_V1_STR}/accounts/{account_id}/daily-ledger?date=2026-10-25&exclude_contra=true"
        )
        assert res.status_code == 200
        data = res.json()
        transactions = data["data"]["transactions"]
        # Inter-company contra transaction (HDFC0092841029) must be filtered out
        ref_numbers = [t["reference_number"] for t in transactions]
        assert "HDFC0092841029" not in ref_numbers
        assert len(transactions) == 3


@pytest.mark.asyncio
async def test_get_daily_ledger_account_not_found():
    """
    Validates invalid account UUID returns 404.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        random_id = str(uuid.uuid4())
        res = await ac.get(f"{settings.API_V1_STR}/accounts/{random_id}/daily-ledger?date=2026-10-25")
        assert res.status_code == 404
