import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    DateTime,
    Date,
    Numeric,
    ForeignKey,
    Boolean,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.entity import Entity
    from app.models.transaction import Transaction
    from app.models.consent import BankConsent


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    account_id: Mapped[uuid.UUID] = mapped_column(
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
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Bank codes: SBI, ICICI, HDFC, AXIS, KOTAK, BOB, CUSTOM
    bank_code: Mapped[str] = mapped_column(String(20), nullable=False)
    account_number_mask: Mapped[str] = mapped_column(String(50), nullable=False)
    account_number_encrypted: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    account_number_blind_index: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=False)

    # Facility types: CURRENT, SAVINGS, OVERDRAFT, CASH_CREDIT
    account_type: Mapped[str] = mapped_column(String(50), default="CURRENT", nullable=False)
    opening_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        default=Decimal("0.00"),
        nullable=False
    )
    current_cleared_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        default=Decimal("0.00"),
        nullable=False
    )
    custom_tag: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_live: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("bank_consents.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="accounts")
    entity: Mapped["Entity"] = relationship("Entity", back_populates="accounts")
    consent: Mapped[Optional["BankConsent"]] = relationship("BankConsent", back_populates="accounts")
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction", back_populates="account", cascade="all, delete-orphan"
    )
    daily_summaries: Mapped[List["DailyAccountSummary"]] = relationship(
        "DailyAccountSummary", back_populates="account", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_bank_accounts_tenant_entity", "tenant_id", "entity_id"),
    )


class DailyAccountSummary(Base):
    __tablename__ = "daily_account_summaries"

    summary_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bank_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    summary_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    total_credited: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    total_debited: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    closing_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    account: Mapped["BankAccount"] = relationship("BankAccount", back_populates="daily_summaries")

    __table_args__ = (
        UniqueConstraint("account_id", "summary_date", name="uq_account_summary_date"),
        Index("ix_summary_account_date", "account_id", "summary_date"),
    )
