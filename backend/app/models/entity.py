import uuid
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.account import BankAccount


class Entity(Base):
    __tablename__ = "entities"

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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Facility types: PVT_LTD, LLP, PROPRIETORSHIP, PARTNERSHIP
    entity_type: Mapped[str] = mapped_column(String(50), default="PVT_LTD", nullable=False)
    gstin: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    gstin_blind_index: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    pan: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    pan_blind_index: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    base_currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="entities")
    accounts: Mapped[List["BankAccount"]] = relationship(
        "BankAccount", back_populates="entity", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_entities_tenant_name", "tenant_id", "name"),
    )
