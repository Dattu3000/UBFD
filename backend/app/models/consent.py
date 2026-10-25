import uuid
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    DateTime,
    Integer,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.entity import Entity
    from app.models.account import BankAccount


class BankConsent(Base):
    __tablename__ = "bank_consents"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    consent_handle: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    consent_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    mobile_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    bank_codes: Mapped[str] = mapped_column(String(255), nullable=False)
    # Status: PENDING_OTP, ACTIVE, EXPIRED, REVOKED
    status: Mapped[str] = mapped_column(String(50), default="PENDING_OTP", nullable=False)
    consent_duration_years: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    consent_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    consent_expiry: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fetch_frequency: Mapped[str] = mapped_column(String(50), default="DAILY", nullable=False)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    entity: Mapped["Entity"] = relationship("Entity")
    accounts: Mapped[List["BankAccount"]] = relationship("BankAccount", back_populates="consent")

    __table_args__ = (
        Index("ix_bank_consents_tenant_entity", "tenant_id", "entity_id"),
        Index("ix_bank_consents_mobile", "mobile_number"),
    )
