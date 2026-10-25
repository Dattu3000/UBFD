import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.account import BankAccount
from app.models.transaction import Transaction
from app.services.daily_calculator import DailyCashInspectorService
from app.schemas.auth_schema import UserContext
from app.schemas.ledger_schema import (
    DailyLedgerResponse,
    DailyLedgerData,
    DailyLedgerAccountInfo,
    DailyLedgerSummary,
    TransactionItem,
)

router = APIRouter(tags=["Daily Cash Inspector"])


@router.get(
    "/accounts/{account_id}/daily-ledger",
    response_model=DailyLedgerResponse,
    summary="Daily Cash Inspector Ledger Roll-Forward"
)
async def get_daily_ledger(
    account_id: uuid.UUID,
    date: date = Query(..., description="Target ISO date for daily roll-forward (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Filter transactions by narration or counterparty"),
    exclude_contra: bool = Query(False, description="Exclude inter-company contra transfers"),
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Sub-150ms Daily Cash Inspector endpoint.
    Computes opening balance, total debits, total credits, closing balance,
    and net velocity, accompanied by line-item transaction register.
    """
    # 1. Verify account exists and belongs to active tenant
    account = await db.scalar(
        select(BankAccount).where(
            and_(
                BankAccount.account_id == account_id,
                BankAccount.tenant_id == current_user.tenant_id,
            )
        )
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found or access denied",
        )

    # 2. Compute roll-forward metrics
    service = DailyCashInspectorService(db)
    metrics = await service.get_daily_metrics(account_id, date)

    summary = DailyLedgerSummary(
        account_id=account.account_id,
        date=date,
        opening_balance=metrics["opening_balance"],
        total_credited=metrics["total_credited"],
        total_debited=metrics["total_debited"],
        closing_balance=metrics["closing_balance"],
        net_velocity=metrics["net_velocity"],
        transaction_count=metrics["transaction_count"],
        is_cached=metrics.get("is_cached", False),
    )

    # 3. Fetch line-item transactions for target date
    tx_stmt = select(Transaction).where(
        and_(
            Transaction.account_id == account_id,
            Transaction.transaction_date == date,
        )
    )

    if exclude_contra:
        tx_stmt = tx_stmt.where(Transaction.is_intercompany.is_(False))

    if search and search.strip():
        term = f"%{search.strip()}%"
        tx_stmt = tx_stmt.where(
            or_(
                Transaction.narration.ilike(term),
                Transaction.counterparty_name.ilike(term),
                Transaction.reference_number.ilike(term),
            )
        )

    tx_stmt = tx_stmt.order_by(
        Transaction.transaction_time.asc(), Transaction.created_at.asc()
    )
    raw_txs = (await db.scalars(tx_stmt)).all()

    tx_items = [
        TransactionItem(
            transaction_id=tx.transaction_id,
            date=tx.transaction_date,
            time=tx.transaction_time.strftime("%H:%M:%S") if tx.transaction_time else None,
            reference_number=tx.reference_number,
            counterparty_name=tx.counterparty_name,
            narration=tx.narration,
            debit_amount=tx.debit_amount,
            credit_amount=tx.credit_amount,
            running_balance=tx.running_balance,
            category=tx.category,
            is_intercompany=tx.is_intercompany,
            contra_pair_id=tx.intercompany_pair_id,
        )
        for tx in raw_txs
    ]

    account_info = DailyLedgerAccountInfo(
        account_id=account.account_id,
        bank_name=account.bank_name,
        bank_code=account.bank_code,
        account_mask=account.account_number_mask,
        custom_tag=account.custom_tag,
        account_type=account.account_type,
    )

    return DailyLedgerResponse(
        status="success",
        data=DailyLedgerData(
            account=account_info,
            summary=summary,
            transactions=tx_items,
        ),
    )
