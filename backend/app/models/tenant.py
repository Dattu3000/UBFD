import uuid
from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.entity import Entity
    from app.models.account import BankAccount
    from app.models.transaction import Transaction


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    entities: Mapped[List["Entity"]] = relationship(
        "Entity", back_populates="tenant", cascade="all, delete-orphan"
    )
    accounts: Mapped[List["BankAccount"]] = relationship(
        "BankAccount", back_populates="tenant", cascade="all, delete-orphan"
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction", back_populates="tenant", cascade="all, delete-orphan"
    )
