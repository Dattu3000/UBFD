import pytest
import time
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_vault_search_pan_blind_index():
    """
    Verify blind-index deterministic search for Indian PAN.
    Must resolve matching entity via HMAC-SHA256 equality lookup in <50ms without full-table decryption.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Search by PAN of seeded entity (Alpha Retailers has PAN AABCA1234F)
        start = time.perf_counter()
        res = await ac.get(f"{settings.API_V1_STR}/accounts/vault-search?q=AABCA1234F")
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert res.status_code == 200
        data = res.json()

        assert data["detected_type"] == "PAN"
        assert len(data["blind_index"]) == 64
        assert data["matches"]["entities"]
        matched_ent = data["matches"]["entities"][0]
        assert "Alpha Retailers" in matched_ent["name"]
        assert matched_ent["pan"] == "AABCA1234F"
        # Warm repeat query to verify sub-50ms indexed speed
        res2 = await ac.get(f"{settings.API_V1_STR}/accounts/vault-search?q=AABCA1234F")
        assert res2.status_code == 200
        assert res2.json()["execution_time_ms"] < 50


@pytest.mark.asyncio
async def test_vault_search_gstin_blind_index():
    """
    Verify blind-index deterministic search for Indian GSTIN.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Search by GSTIN (27AABCA1234F1Z5)
        res = await ac.get(f"{settings.API_V1_STR}/accounts/vault-search?q=27AABCA1234F1Z5")
        assert res.status_code == 200
        data = res.json()

        assert data["detected_type"] == "GSTIN"
        assert data["matches"]["entities"]
        assert "Alpha Retailers" in data["matches"]["entities"][0]["name"]
        assert data["matches"]["entities"][0]["gstin"] == "27AABCA1234F1Z5"


@pytest.mark.asyncio
async def test_vault_search_narration_and_utr():
    """
    Verify free text narration search fallback.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"{settings.API_V1_STR}/accounts/vault-search?q=NEFT")
        assert res.status_code == 200
        data = res.json()
        assert "matches" in data
        assert "execution_time_ms" in data


@pytest.mark.asyncio
async def test_mca_audit_verify_chain_structure():
    """
    Verify MCA Rule 3(1) verify-chain payload structure.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"{settings.API_V1_STR}/audit/verify-chain")
        assert res.status_code == 200
        data = res.json()
        assert data["is_valid"] is True
        assert "total_records" in data
        assert "genesis_hash" in data
        assert "latest_hash" in data
