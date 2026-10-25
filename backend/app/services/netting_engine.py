import uuid
from datetime import timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.models.transaction import Transaction
from app.models.account import BankAccount
from app.models.netting import IntercompanyNettingLog
from app.services.audit_service import AuditService


class InterCompanyNettingEngine:
    """
    Identifies and nets out matching debit-credit pairs across sister entities
    within a +/- 24-48 hour window to avoid gross inflow/outflow inflation.
    Adheres to GST Schedule I contra reconciliation standards.
    """
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def detect_and_pair(
        self,
        source_tx: Transaction,
        max_days_delta: int = 2,
        user_id: str = "system-netting-engine",
    ) -> Optional[IntercompanyNettingLog]:
        """
        Scans for counterpart credit transactions in sister entity accounts matching
        the source debit amount within the tolerance window.
        """
        if source_tx.debit_amount <= Decimal("0.00"):
            return None

        time_window_start = source_tx.transaction_date - timedelta(days=max_days_delta)
        time_window_end = source_tx.transaction_date + timedelta(days=max_days_delta)

        # Look for matching credit in sister entity accounts (different account)
        potential_match_stmt = select(Transaction).where(
            and_(
                Transaction.tenant_id == source_tx.tenant_id,
                Transaction.account_id != source_tx.account_id,
                Transaction.credit_amount == source_tx.debit_amount,
                Transaction.transaction_date.between(time_window_start, time_window_end),
                Transaction.is_intercompany.is_(False),
            )
        ).order_by(Transaction.transaction_date.asc(), Transaction.transaction_time.asc())

        potential_matches = (await self.db.scalars(potential_match_stmt)).all()

        for candidate in potential_matches:
            # Pair found: apply contra tags & record log
            source_tx.is_intercompany = True
            source_tx.intercompany_pair_id = candidate.transaction_id

            candidate.is_intercompany = True
            candidate.intercompany_pair_id = source_tx.transaction_id

            netting_log = IntercompanyNettingLog(
                log_id=uuid.uuid4(),
                source_transaction_id=source_tx.transaction_id,
                destination_transaction_id=candidate.transaction_id,
                netted_amount=source_tx.debit_amount,
                match_confidence=Decimal("98.50"),
                status="ELIMINATED",
            )
            self.db.add(netting_log)

            # Record MCA Rule 3 Immutable Audit Trail
            await self.audit.log_event(
                tenant_id=source_tx.tenant_id,
                table_name="intercompany_netting_logs",
                record_id=str(netting_log.log_id),
                action="CONTRA_PAIR_CREATED",
                old_values=None,
                new_values={
                    "source_tx": str(source_tx.transaction_id),
                    "destination_tx": str(candidate.transaction_id),
                    "netted_amount": float(source_tx.debit_amount),
                    "match_confidence": 98.50,
                    "status": "ELIMINATED",
                },
                user_id=user_id,
            )

            await self.db.commit()
            return netting_log

        return None

    async def auto_scan_tenant(
        self, tenant_id: uuid.UUID, user_id: str = "system-netting-engine"
    ) -> List[IntercompanyNettingLog]:
        """
        Scans all unpaired debit transactions for the tenant and attempts contra pairing.
        """
        stmt = select(Transaction).where(
            and_(
                Transaction.tenant_id == tenant_id,
                Transaction.debit_amount > Decimal("0.00"),
                Transaction.is_intercompany.is_(False),
            )
        )
        debit_txs = (await self.db.scalars(stmt)).all()

        paired_logs = []
        for tx in debit_txs:
            log = await self.detect_and_pair(tx, user_id=user_id)
            if log:
                paired_logs.append(log)
        return paired_logs

    async def list_contra_pairs(self, tenant_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Returns all contra netting logs joined with source and destination details.
        """
        stmt = (
            select(IntercompanyNettingLog)
            .order_by(IntercompanyNettingLog.created_at.desc())
        )
        logs = (await self.db.scalars(stmt)).all()

        results = []
        for log in logs:
            # Query source & dest tx
            src_tx = await self.db.scalar(
                select(Transaction)
                .where(Transaction.transaction_id == log.source_transaction_id)
                .options(selectinload(Transaction.account).selectinload(BankAccount.entity))
            )
            dst_tx = await self.db.scalar(
                select(Transaction)
                .where(Transaction.transaction_id == log.destination_transaction_id)
                .options(selectinload(Transaction.account).selectinload(BankAccount.entity))
            )

            if src_tx and dst_tx:
                results.append({
                    "log_id": log.log_id,
                    "source_transaction_id": log.source_transaction_id,
                    "destination_transaction_id": log.destination_transaction_id,
                    "netted_amount": log.netted_amount,
                    "match_confidence": log.match_confidence,
                    "status": log.status,
                    "created_at": log.created_at,
                    "source": {
                        "entity_name": src_tx.account.entity.name if src_tx.account and src_tx.account.entity else "Source Entity",
                        "bank_name": src_tx.account.bank_name if src_tx.account else "Bank",
                        "bank_code": src_tx.account.bank_code if src_tx.account else "CUSTOM",
                        "account_mask": src_tx.account.account_number_mask if src_tx.account else "",
                        "date": src_tx.transaction_date,
                        "narration": src_tx.narration,
                        "reference_number": src_tx.reference_number,
                    },
                    "destination": {
                        "entity_name": dst_tx.account.entity.name if dst_tx.account and dst_tx.account.entity else "Sister Entity",
                        "bank_name": dst_tx.account.bank_name if dst_tx.account else "Bank",
                        "bank_code": dst_tx.account.bank_code if dst_tx.account else "CUSTOM",
                        "account_mask": dst_tx.account.account_number_mask if dst_tx.account else "",
                        "date": dst_tx.transaction_date,
                        "narration": dst_tx.narration,
                        "reference_number": dst_tx.reference_number,
                    },
                })
        return results

    async def manual_override_dissolve(
        self,
        log_id: uuid.UUID,
        reason: str,
        user_id: str,
        tenant_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Manually dissolves an inter-company contra pair and restores gross visibility,
        recording a mandatory MCA Rule 3 immutable audit event with justification.
        """
        log = await self.db.scalar(
            select(IntercompanyNettingLog).where(IntercompanyNettingLog.log_id == log_id)
        )
        if not log:
            raise ValueError("Netting log not found")

        # Unpair transactions
        src_tx = await self.db.scalar(
            select(Transaction).where(Transaction.transaction_id == log.source_transaction_id)
        )
        dst_tx = await self.db.scalar(
            select(Transaction).where(Transaction.transaction_id == log.destination_transaction_id)
        )

        if src_tx:
            src_tx.is_intercompany = False
            src_tx.intercompany_pair_id = None
        if dst_tx:
            dst_tx.is_intercompany = False
            dst_tx.intercompany_pair_id = None

        log.status = "DISSOLVED"

        # Log immutable audit
        await self.audit.log_event(
            tenant_id=tenant_id,
            table_name="intercompany_netting_logs",
            record_id=str(log.log_id),
            action="MANUAL_CONTRA_DISSOLVED",
            old_values={"status": "ELIMINATED"},
            new_values={"status": "DISSOLVED", "reason": reason},
            user_id=user_id,
        )

        await self.db.commit()
        return {"status": "success", "message": f"Contra pair dissolved with reason: {reason}"}
