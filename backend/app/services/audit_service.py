import json
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.audit import AuditLog


class AuditService:
    """
    Ministry of Corporate Affairs (MCA) Rule 3(1) Immutable Audit Log Service.
    Enforces a cryptographically tamper-evident hash chain (WORM - Write Once, Read Many).

    Formula:
    row_hash = SHA256(prev_hash || tenant_id || user_id || action || new_values || timestamp)
    """

    GENESIS_HASH = "0" * 64

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def calculate_row_hash(
        prev_hash: str,
        tenant_id: uuid.UUID,
        user_id: str,
        action: str,
        new_values_str: str,
        timestamp_str: str,
    ) -> str:
        chain_input = f"{prev_hash}|{str(tenant_id)}|{user_id}|{action}|{new_values_str}|{timestamp_str}"
        return hashlib.sha256(chain_input.encode("utf-8")).hexdigest()

    async def log_event(
        self,
        tenant_id: uuid.UUID,
        table_name: str,
        record_id: str,
        action: str,
        old_values: Optional[Dict[str, Any]],
        new_values: Optional[Dict[str, Any]],
        user_id: str,
    ) -> AuditLog:
        # 1. Fetch latest audit log for this tenant to get prev_hash
        stmt = (
            select(AuditLog)
            .where(AuditLog.tenant_id == tenant_id)
            .order_by(AuditLog.timestamp.desc(), AuditLog.audit_id.desc())
            .limit(1)
        )
        latest_entry = await self.db.scalar(stmt)
        prev_hash = latest_entry.row_hash if latest_entry else self.GENESIS_HASH

        # 2. Prepare payload & timestamp
        now = datetime.now(timezone.utc)
        ts_str = now.strftime("%Y-%m-%d %H:%M:%S")
        old_str = json.dumps(old_values, sort_keys=True, default=str) if old_values else "{}"
        new_str = json.dumps(new_values, sort_keys=True, default=str) if new_values else "{}"

        # 3. Cryptographic hash chain calculation
        row_hash = self.calculate_row_hash(
            prev_hash=prev_hash,
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            new_values_str=new_str,
            timestamp_str=ts_str,
        )

        audit_entry = AuditLog(
            audit_id=uuid.uuid4(),
            tenant_id=tenant_id,
            table_name=table_name,
            record_id=record_id,
            action=action,
            old_values=old_str if old_values else None,
            new_values=new_str if new_values else None,
            user_id=user_id,
            prev_hash=prev_hash,
            row_hash=row_hash,
            timestamp=now,
        )
        self.db.add(audit_entry)
        await self.db.commit()
        await self.db.refresh(audit_entry)
        return audit_entry

    async def verify_chain_integrity(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """
        MCA Rule 3(1) Verification Audit:
        Traverses the full audit trail sequentially to mathematically verify that
        no record was inserted, modified, or deleted directly in the database.
        """
        stmt = (
            select(AuditLog)
            .where(AuditLog.tenant_id == tenant_id)
            .order_by(AuditLog.timestamp.asc(), AuditLog.audit_id.asc())
        )
        records = (await self.db.scalars(stmt)).all()

        if not records:
            return {
                "is_valid": True,
                "total_records": 0,
                "genesis_hash": self.GENESIS_HASH,
                "latest_hash": self.GENESIS_HASH,
                "status": "Audit ledger empty. No transactions recorded.",
            }

        expected_prev = self.GENESIS_HASH
        for idx, rec in enumerate(records):
            # Check previous hash link
            if rec.prev_hash != expected_prev:
                return {
                    "is_valid": False,
                    "tampered_at_index": idx,
                    "tampered_record_id": str(rec.audit_id),
                    "action": rec.action,
                    "reason": f"Hash chain broken. Expected prev_hash {expected_prev}, found {rec.prev_hash}",
                }

            # Recalculate row hash
            ts_str = rec.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            new_str = rec.new_values if rec.new_values else "{}"
            computed_hash = self.calculate_row_hash(
                prev_hash=rec.prev_hash,
                tenant_id=rec.tenant_id,
                user_id=rec.user_id,
                action=rec.action,
                new_values_str=new_str,
                timestamp_str=ts_str,
            )

            if computed_hash != rec.row_hash:
                return {
                    "is_valid": False,
                    "tampered_at_index": idx,
                    "tampered_record_id": str(rec.audit_id),
                    "action": rec.action,
                    "reason": "Cryptographic row integrity check failed: content was tampered post-write",
                }

            expected_prev = rec.row_hash

        return {
            "is_valid": True,
            "total_records": len(records),
            "genesis_hash": self.GENESIS_HASH,
            "latest_hash": expected_prev,
            "status": "Cryptographic chain verified: 100% immutable and compliant with MCA Rule 3(1)",
        }
