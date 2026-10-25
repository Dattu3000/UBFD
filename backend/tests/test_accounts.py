import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_health_and_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "online"

        res_root = await ac.get("/")
        assert res_root.status_code == 200
        assert "Unified Business Finance Dashboard" in res_root.json()["message"]


@pytest.mark.asyncio
async def test_auth_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_payload = {
            "username": "rajesh_promoter",
            "password": "password123",
            "tenant_slug": "apex-holdings-group"
        }
        res = await ac.post(f"{settings.API_V1_STR}/auth/login", json=login_payload)
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["tenant_name"] == "Apex Holdings Group India"


@pytest.mark.asyncio
async def test_list_entities_and_accounts():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Fetch entities
        res_entities = await ac.get(f"{settings.API_V1_STR}/entities")
        assert res_entities.status_code == 200
        entities = res_entities.json()
        assert len(entities) >= 3
        entity_names = [e["name"] for e in entities]
        assert "Alpha Retailers Pvt Ltd" in entity_names
        assert "Sister Logistics LLP" in entity_names
        assert "Apex Infra Projects Ltd" in entity_names

        # 2. Fetch accounts
        res_accounts = await ac.get(f"{settings.API_V1_STR}/accounts")
        assert res_accounts.status_code == 200
        accounts = res_accounts.json()
        assert len(accounts) >= 6
        bank_codes = [a["bank_code"] for a in accounts]
        assert "HDFC" in bank_codes
        assert "ICICI" in bank_codes
        assert "SBI" in bank_codes
        assert "AXIS" in bank_codes
        assert "KOTAK" in bank_codes


@pytest.mark.asyncio
async def test_group_liquidity_summary():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"{settings.API_V1_STR}/summary/group-liquidity")
        assert res.status_code == 200
        data = res.json()
        assert float(data["total_cleared_cash"]) > 0
        assert data["accounts_count"] >= 6
        assert data["entities_count"] >= 3
