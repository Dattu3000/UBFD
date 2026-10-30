import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.schemas.auth_schema import UserContext
from app.services.audit_service import AuditService
from app.models.audit import AuditLog

router = APIRouter(prefix="/audit", tags=["MCA Rule 3(1) Cryptographic Audit Ledger"])


@router.get("/verify-chain", response_model=Dict[str, Any])
async def verify_audit_chain(
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    MCA Rule 3(1) Cryptographic Integrity Verification:
    Traverses the full audit trail sequentially for the active tenant and mathematically
    verifies that no audit records have been inserted, modified, or deleted directly in the database.
    """
    audit_service = AuditService(db)
    result = await audit_service.verify_chain_integrity(current_user.tenant_id)
    return result


@router.get("/logs")
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists audit log trail for the active tenant, including row_hash and prev_hash proof.
    """
    stmt = (
        select(AuditLog)
        .where(AuditLog.tenant_id == current_user.tenant_id)
        .order_by(AuditLog.timestamp.desc(), AuditLog.audit_id.desc())
        .offset(offset)
        .limit(limit)
    )
    records = (await db.scalars(stmt)).all()

    return [
        {
            "audit_id": str(rec.audit_id),
            "table_name": rec.table_name,
            "record_id": rec.record_id,
            "action": rec.action,
            "user_id": rec.user_id,
            "prev_hash": rec.prev_hash,
            "row_hash": rec.row_hash,
            "timestamp": rec.timestamp.isoformat() if rec.timestamp else None,
            "old_values": rec.old_values,
            "new_values": rec.new_values,
        }
        for rec in records
    ]
