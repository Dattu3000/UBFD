import json
import uuid
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog


class AuditService:
    """
    Ministry of Corporate Affairs (MCA) Rule 3(1) Immutable Audit Log Service.
    Writes append-only audit trail records for financial data mutations.
    """
    def __init__(self, db: AsyncSession):
        self.db = db

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
        audit_entry = AuditLog(
            audit_id=uuid.uuid4(),
            tenant_id=tenant_id,
            table_name=table_name,
            record_id=record_id,
            action=action,
            old_values=json.dumps(old_values, default=str) if old_values else None,
            new_values=json.dumps(new_values, default=str) if new_values else None,
            user_id=user_id,
        )
        self.db.add(audit_entry)
        await self.db.commit()
        return audit_entry
