import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    String,
    DateTime,
    Numeric,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class IntercompanyNettingLog(Base):
    __tablename__ = "intercompany_netting_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    source_transaction_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("transactions.transaction_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    destination_transaction_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("transactions.transaction_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    netted_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    match_confidence: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("98.50"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ELIMINATED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        Index("ix_netting_source_dest", "source_transaction_id", "destination_transaction_id"),
    )
