import uuid
from datetime import date, time
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TransactionItem(BaseModel):
    transaction_id: uuid.UUID
    date: date
    time: Optional[str] = None
    reference_number: str
    counterparty_name: str
    narration: str
    debit_amount: Decimal
    credit_amount: Decimal
    running_balance: Decimal
    category: str
    is_intercompany: bool = False
    contra_pair_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class DailyLedgerSummary(BaseModel):
    account_id: uuid.UUID
    date: date
    opening_balance: Decimal
    total_credited: Decimal
    total_debited: Decimal
    closing_balance: Decimal
    net_velocity: Decimal
    transaction_count: int
    is_cached: bool = False


class DailyLedgerAccountInfo(BaseModel):
    account_id: uuid.UUID
    bank_name: str
    bank_code: str
    account_mask: str
    custom_tag: Optional[str] = None
    account_type: str = "CURRENT"


class DailyLedgerData(BaseModel):
    account: DailyLedgerAccountInfo
    summary: DailyLedgerSummary
    transactions: List[TransactionItem]


class DailyLedgerResponse(BaseModel):
    status: str = "success"
    data: DailyLedgerData
