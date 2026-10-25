from datetime import date
from decimal import Decimal
from uuid import UUID
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.transaction import Transaction
from app.models.account import BankAccount, DailyAccountSummary


class DailyCashInspectorService:
    """
    Sub-150ms Daily Cash Inspector Engine.
    Computes opening balance, total debits, total credits, closing balance,
    and net velocity with dual-mode performance:
    1. Pre-aggregated summary cache (<10ms)
    2. Dynamic fallback from transaction ledger with prior-day rollback (<100ms)
    """
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_daily_metrics(self, account_id: UUID, target_date: date) -> Dict[str, Any]:
        # 1. Attempt read from pre-aggregated summary table
        cached_summary = await self.db.scalar(
            select(DailyAccountSummary).where(
                and_(
                    DailyAccountSummary.account_id == account_id,
                    DailyAccountSummary.summary_date == target_date
                )
            )
        )
        if cached_summary:
            # Quick transaction count
            tx_count = await self.db.scalar(
                select(func.count(Transaction.transaction_id)).where(
                    and_(
                        Transaction.account_id == account_id,
                        Transaction.transaction_date == target_date
                    )
                )
            ) or 0

            return {
                "account_id": account_id,
                "date": target_date,
                "opening_balance": cached_summary.opening_balance,
                "total_credited": cached_summary.total_credited,
                "total_debited": cached_summary.total_debited,
                "closing_balance": cached_summary.closing_balance,
                "net_velocity": cached_summary.total_credited - cached_summary.total_debited,
                "transaction_count": tx_count,
                "is_cached": True
            }

        # 2. Dynamic Fallback: Calculate from Transaction Ledger
        # Compute total credits, debits & count on target_date
        stmt = select(
            func.coalesce(func.sum(Transaction.credit_amount), Decimal("0.00")).label("credits"),
            func.coalesce(func.sum(Transaction.debit_amount), Decimal("0.00")).label("debits"),
            func.count(Transaction.transaction_id).label("tx_count")
        ).where(
            and_(
                Transaction.account_id == account_id,
                Transaction.transaction_date == target_date
            )
        )
        result = await self.db.execute(stmt)
        credits, debits, tx_count = result.one()

        # Find closing running_balance from latest transaction on target_date
        latest_tx_stmt = select(Transaction.running_balance).where(
            and_(
                Transaction.account_id == account_id,
                Transaction.transaction_date == target_date
            )
        ).order_by(Transaction.transaction_time.desc(), Transaction.created_at.desc()).limit(1)
        
        closing_balance = await self.db.scalar(latest_tx_stmt)

        if closing_balance is None:
            # No transactions on target_date; fetch nearest prior closing balance
            prior_tx_stmt = select(Transaction.running_balance).where(
                and_(
                    Transaction.account_id == account_id,
                    Transaction.transaction_date < target_date
                )
            ).order_by(Transaction.transaction_date.desc(), Transaction.transaction_time.desc()).limit(1)
            
            prior_balance = await self.db.scalar(prior_tx_stmt)
            if prior_balance is None:
                # Default to base account initial opening balance
                account_stmt = select(BankAccount.opening_balance).where(BankAccount.account_id == account_id)
                prior_balance = await self.db.scalar(account_stmt) or Decimal("0.00")
            
            opening_balance = prior_balance
            closing_balance = prior_balance
        else:
            opening_balance = closing_balance - credits + debits

        return {
            "account_id": account_id,
            "date": target_date,
            "opening_balance": opening_balance,
            "total_credited": credits,
            "total_debited": debits,
            "closing_balance": closing_balance,
            "net_velocity": credits - debits,
            "transaction_count": tx_count,
            "is_cached": False
        }
