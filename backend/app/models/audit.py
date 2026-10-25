import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AuditLog(Base):
    """
    Adheres to Ministry of Corporate Affairs (MCA) Rule 3(1) of Companies
    (Accounts) Rules, requiring an immutable, append-only audit trail for financial
    book alterations, category changes, and contra transaction pairings.
    """
    __tablename__ = "audit_logs"

    audit_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    table_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    record_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # INSERT, UPDATE_CATEGORY, NETTING_PAIR, OVERRIDE
    old_values: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    new_values: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    user_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    __table_args__ = (
        Index("ix_audit_tenant_table_rec", "tenant_id", "table_name", "record_id"),
    )
