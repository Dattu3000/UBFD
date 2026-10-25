import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.services.netting_engine import InterCompanyNettingEngine
from app.schemas.auth_schema import UserContext

router = APIRouter(prefix="/intercompany", tags=["Inter-Company Netting"])


class OverrideRequest(BaseModel):
    log_id: uuid.UUID
    action: str = Field("UNPAIR", description="Action to perform: UNPAIR, CONFIRM")
    reason: str = Field(..., min_length=5, description="Mandatory audit explanation under MCA Rule 3")


@router.get("/pairs", summary="List All Contra Pairs")
async def list_contra_pairs(
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all detected and active inter-company contra fund movements
    with sister entity accounts, netted amounts, and matching confidence.
    """
    engine = InterCompanyNettingEngine(db)
    pairs = await engine.list_contra_pairs(current_user.tenant_id)
    return {"status": "success", "count": len(pairs), "data": pairs}


@router.post("/scan", summary="Scan and Auto-Pair Contra Transfers")
async def scan_and_pair_contra(
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Scans recent transaction ledgers across all linked sister entities
    and automatically pairs matching debit-credit transfers within +/-48 hours.
    """
    engine = InterCompanyNettingEngine(db)
    paired_logs = await engine.auto_scan_tenant(current_user.tenant_id, user_id=current_user.username)
    return {
        "status": "success",
        "newly_paired_count": len(paired_logs),
        "message": f"Successfully paired {len(paired_logs)} contra transfers",
    }


@router.post("/override", summary="Manual Contra Override & Audit")
async def manual_contra_override(
    req: OverrideRequest,
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually unpairs a contra transfer pair, capturing a mandatory MCA Rule 3(1)
    audit justification trail.
    """
    engine = InterCompanyNettingEngine(db)
    try:
        res = await engine.manual_override_dissolve(
            log_id=req.log_id,
            reason=req.reason,
            user_id=current_user.username,
            tenant_id=current_user.tenant_id,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
