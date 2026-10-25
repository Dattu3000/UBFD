import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict


class NettingPairCandidate(BaseModel):
    source_transaction_id: uuid.UUID
    destination_transaction_id: uuid.UUID
    source_entity_name: str
    destination_entity_name: str
    source_bank_code: str
    destination_bank_code: str
    amount: Decimal
    time_difference_hours: float
    confidence_score: Decimal = Decimal("98.50")
    source_narration: str
    destination_narration: str


class NettingOverrideRequest(BaseModel):
    source_transaction_id: uuid.UUID
    destination_transaction_id: Optional[uuid.UUID] = None
    action: Literal["CONFIRM_PAIR", "MANUAL_PAIR", "UNPAIR", "DISMISS"]
    reason: str


class NettingLogOut(BaseModel):
    log_id: uuid.UUID
    source_transaction_id: uuid.UUID
    destination_transaction_id: uuid.UUID
    netted_amount: Decimal
    match_confidence: Decimal
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
