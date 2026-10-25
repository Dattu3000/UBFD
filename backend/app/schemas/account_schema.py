import uuid
from decimal import Decimal
from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field

BankCodeType = str
FacilityType = Literal["CURRENT", "SAVINGS", "OVERDRAFT", "CASH_CREDIT"]
LegalEntityType = Literal["PVT_LTD", "LLP", "PROPRIETORSHIP", "PARTNERSHIP"]


class EntityBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    entity_type: LegalEntityType = "PVT_LTD"
    gstin: Optional[str] = Field(None, max_length=20)
    pan: Optional[str] = Field(None, max_length=20)
    base_currency: str = "INR"


class EntityCreate(EntityBase):
    pass


class EntityOut(EntityBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    total_liquidity: Optional[Decimal] = Decimal("0.00")
    account_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class BankAccountBase(BaseModel):
    entity_id: uuid.UUID
    bank_name: str = Field(..., max_length=100)
    bank_code: BankCodeType
    account_number_mask: str = Field(..., max_length=50)
    ifsc_code: str = Field(..., min_length=11, max_length=11)
    account_type: FacilityType = "CURRENT"
    opening_balance: Decimal = Decimal("0.00")
    custom_tag: Optional[str] = None


class BankAccountCreate(BankAccountBase):
    account_number_raw: Optional[str] = None


class BankAccountOut(BaseModel):
    account_id: uuid.UUID
    tenant_id: uuid.UUID
    entity_id: uuid.UUID
    entity_name: Optional[str] = None
    bank_name: str
    bank_code: BankCodeType
    account_number_mask: str
    ifsc_code: str
    account_type: FacilityType
    custom_tag: Optional[str] = None
    opening_balance: Decimal
    current_cleared_balance: Decimal

    model_config = ConfigDict(from_attributes=True)


class GroupLiquiditySummary(BaseModel):
    total_cleared_cash: Decimal
    total_overdraft_utilized: Decimal
    net_group_liquidity: Decimal
    entities_count: int
    accounts_count: int
    unreconciled_transactions_count: int
    accounts: List[BankAccountOut]
