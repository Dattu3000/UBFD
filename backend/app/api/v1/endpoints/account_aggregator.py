import uuid
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.schemas.auth_schema import UserContext
from app.services.account_aggregator_service import AccountAggregatorService

router = APIRouter(prefix="/aa", tags=["Account Aggregator (RBI AA Rail)"])


# --- Schemas ---
class InitiateConsentRequest(BaseModel):
    entity_id: uuid.UUID
    mobile_number: str = Field(..., description="Mobile number linked to the bank account")
    bank_codes: List[str] = Field(default=["HDFC", "ICICI", "SBI"], description="Banks to link")
    duration_years: int = Field(default=3, description="Consent validity duration (e.g. 3 years)")


class DeclaredAccountInput(BaseModel):
    bank_code: str
    bank_name: str
    account_number: str
    ifsc_code: str
    account_type: str = "CURRENT"
    opening_balance: Decimal = Decimal("500000.00")


class VerifyConsentOtpRequest(BaseModel):
    consent_handle: str
    otp: str = Field(..., description="1-time OTP (use 123456 in sandbox)")
    declared_accounts: Optional[List[DeclaredAccountInput]] = None


class AddDirectAccountRequest(BaseModel):
    entity_id: uuid.UUID
    bank_name: str
    bank_code: str
    account_number: str
    ifsc_code: str
    account_type: str = "CURRENT"
    opening_balance: Decimal = Decimal("0.00")


# --- Endpoints ---

@router.post("/consent/initiate")
async def initiate_consent(
    payload: InitiateConsentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Step 1: Initiate a 3-Year Recurring Consent under RBI Account Aggregator framework.
    Generates a consent handle and sends a 1-time OTP to the linked mobile number.
    """
    try:
        result = await AccountAggregatorService.initiate_consent(
            db=db,
            tenant_id=current_user.tenant_id,
            entity_id=payload.entity_id,
            mobile_number=payload.mobile_number,
            bank_codes=payload.bank_codes,
            duration_years=payload.duration_years,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/consent/verify-otp")
async def verify_consent_otp(
    payload: VerifyConsentOtpRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Step 2: Submit the 1-time OTP.
    Activates the 3-Year Consent token and discovers or registers actual commercial accounts.
    Subsequent daily background syncs run automatically with 0 OTP friction.
    """
    try:
        declared_list = (
            [a.model_dump() for a in payload.declared_accounts]
            if payload.declared_accounts
            else None
        )
        result = await AccountAggregatorService.verify_consent_otp(
            db=db,
            tenant_id=current_user.tenant_id,
            consent_handle=payload.consent_handle,
            otp=payload.otp,
            declared_accounts=declared_list,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/consents")
async def list_active_consents(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Lists all active Account Aggregator consents, their 3-year expiration dates,
    and linked commercial bank accounts.
    """
    consents = await AccountAggregatorService.list_consents(db=db, tenant_id=current_user.tenant_id)
    return consents


@router.post("/sync/{consent_id}")
async def sync_consent_accounts(
    consent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Automated Background Sync (0 OTPs required):
    Pulls live transaction delta from banks, updates cleared balances,
    and triggers inter-company contra matching.
    """
    try:
        result = await AccountAggregatorService.sync_consent_accounts(
            db=db, tenant_id=current_user.tenant_id, consent_id=consent_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/accounts/add-direct")
async def add_direct_account(
    payload: AddDirectAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Directly register an actual commercial bank account with real account number mask.
    """
    try:
        account = await AccountAggregatorService.add_direct_account(
            db=db,
            tenant_id=current_user.tenant_id,
            entity_id=payload.entity_id,
            bank_name=payload.bank_name,
            bank_code=payload.bank_code,
            account_number=payload.account_number,
            ifsc_code=payload.ifsc_code,
            account_type=payload.account_type,
            opening_balance=payload.opening_balance,
        )
        return {
            "account_id": str(account.account_id),
            "bank_name": account.bank_name,
            "bank_code": account.bank_code,
            "account_number_mask": account.account_number_mask,
            "ifsc_code": account.ifsc_code,
            "account_type": account.account_type,
            "current_cleared_balance": float(account.current_cleared_balance),
            "is_live": account.is_live,
            "message": "Bank account successfully created and linked to entity",
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
