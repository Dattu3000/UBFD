import uuid
from datetime import date, time, datetime, timezone
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Date,
    Time,
    Numeric,
    Boolean,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.account import BankAccount


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bank_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    transaction_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    reference_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    counterparty_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    narration: Mapped[str] = mapped_column(Text, nullable=False)
    debit_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    credit_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    running_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="Uncategorized", nullable=False)
    
    # Inter-company contra netting flags
    is_intercompany: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    intercompany_pair_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("transactions.transaction_id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="transactions")
    account: Mapped["BankAccount"] = relationship("BankAccount", back_populates="transactions")

    __table_args__ = (
        Index("ix_tx_account_date_time", "account_id", "transaction_date", "transaction_time"),
        Index("ix_tx_interco_date", "is_intercompany", "transaction_date"),
    )
