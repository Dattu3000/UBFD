import uuid
from decimal import Decimal
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_account_aggregator_3year_consent_flow():
    """
    Test complete RBI Account Aggregator flow:
    1. Initiate 3-year background consent with mobile number & banks
    2. Verify 1-time OTP (activated for 3 years)
    3. Verify live bank accounts created and linked
    4. Perform automated periodic background sync with ZERO OTP
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login to get token
        login_res = await client.post(
            f"{settings.API_V1_STR}/auth/login",
            json={"username": "rajesh_promoter", "password": "password123", "tenant_slug": "apex-holdings-group"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        # Get entities
        res_entities = await client.get("/api/v1/entities", headers=headers)
        assert res_entities.status_code == 200
        entities = res_entities.json()
        assert len(entities) > 0
        entity_id = entities[0]["id"]

        # Step 1: Initiate 3-Year Consent
        initiate_payload = {
            "entity_id": entity_id,
            "mobile_number": "9876543210",
            "bank_codes": ["HDFC", "ICICI"],
            "duration_years": 3,
        }
        res_initiate = await client.post("/api/v1/aa/consent/initiate", json=initiate_payload, headers=headers)
        assert res_initiate.status_code == 200
        data_initiate = res_initiate.json()
        consent_handle = data_initiate["consent_handle"]
        assert data_initiate["status"] == "PENDING_OTP"
        assert data_initiate["duration_years"] == 3

        # Step 2: Verify 1-Time OTP with actual bank account declaration
        verify_payload = {
            "consent_handle": consent_handle,
            "otp": "123456",
            "declared_accounts": [
                {
                    "bank_code": "HDFC",
                    "bank_name": "HDFC Bank",
                    "account_number": "50200098765432",
                    "ifsc_code": "HDFC0000240",
                    "account_type": "CURRENT",
                    "opening_balance": "850000.00",
                }
            ],
        }
        res_verify = await client.post("/api/v1/aa/consent/verify-otp", json=verify_payload, headers=headers)
        assert res_verify.status_code == 200
        data_verify = res_verify.json()
        assert data_verify["status"] == "ACTIVE"
        assert len(data_verify["accounts_linked"]) == 1
        account = data_verify["accounts_linked"][0]
        assert account["bank_code"] == "HDFC"
        assert account["account_number_mask"] == "XXXX-XXXX-5432"
        assert account["is_live"] is True

        # Step 3: List Active Consents
        res_consents = await client.get("/api/v1/aa/consents", headers=headers)
        assert res_consents.status_code == 200
        consents = res_consents.json()
        active_consent = next((c for c in consents if c["consent_handle"] == consent_handle), None)
        assert active_consent is not None
        assert active_consent["status"] == "ACTIVE"
        consent_id = active_consent["id"]

        # Step 4: Automated Background Sync (0 OTPs required!)
        res_sync = await client.post(f"/api/v1/aa/sync/{consent_id}", headers=headers)
        assert res_sync.status_code == 200
        data_sync = res_sync.json()
        assert data_sync["status"] == "SUCCESS"
        assert data_sync["accounts_synced"] >= 1
        assert data_sync["new_transactions_fetched"] >= 1


@pytest.mark.asyncio
async def test_add_direct_live_bank_account():
    """
    Test direct creation of an actual bank account number without AA consent.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_res = await client.post(
            f"{settings.API_V1_STR}/auth/login",
            json={"username": "rajesh_promoter", "password": "password123", "tenant_slug": "apex-holdings-group"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        res_entities = await client.get("/api/v1/entities", headers=headers)
        entity_id = res_entities.json()[0]["id"]

        payload = {
            "entity_id": entity_id,
            "bank_name": "State Bank of India",
            "bank_code": "SBI",
            "account_number": "334455667788",
            "ifsc_code": "SBIN0001001",
            "account_type": "OVERDRAFT",
            "opening_balance": "1200000.00",
        }
        res = await client.post("/api/v1/aa/accounts/add-direct", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["account_number_mask"] == "XXXX-XXXX-7788"
        assert data["bank_code"] == "SBI"
        assert data["is_live"] is True
