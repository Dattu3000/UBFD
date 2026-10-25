import uuid
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.account import BankAccount
from app.models.transaction import Transaction
from app.services.pdf_parser import get_parser_for_bank
from app.services.netting_engine import InterCompanyNettingEngine
from app.schemas.auth_schema import UserContext

router = APIRouter(prefix="/ingestion", tags=["Statement Ingestion"])


@router.post("/upload", summary="Upload and Ingest Bank Statement")
async def upload_bank_statement(
    account_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    bank_code_override: Optional[str] = Form(None),
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parses bank statement CSV/PDF tabular files (SBI, ICICI, HDFC), validates
    running balance continuity, stores transactions, and triggers automated contra pairing.
    """
    # 1. Verify account exists and belongs to tenant
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
            detail="Target bank account not found or access denied",
        )

    # 2. Read file content
    try:
        raw_bytes = await file.read()
        content = raw_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read statement file: {str(e)}",
        )

    # 3. Choose appropriate parser
    bank_code = bank_code_override or account.bank_code
    parser = get_parser_for_bank(bank_code)

    # 4. Parse content
    parsed_items = parser.parse_csv(content)
    if not parsed_items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid transaction rows extracted. Please verify statement format.",
        )

    # 5. Insert transactions
    inserted_txs = []
    latest_balance = account.current_cleared_balance

    for item in parsed_items:
        tx = Transaction(
            transaction_id=uuid.uuid4(),
            tenant_id=current_user.tenant_id,
            account_id=account.account_id,
            transaction_date=item.transaction_date,
            transaction_time=item.transaction_time,
            reference_number=item.reference_number,
            counterparty_name=item.counterparty_name,
            narration=item.narration,
            debit_amount=item.debit_amount,
            credit_amount=item.credit_amount,
            running_balance=item.running_balance,
            category=item.category,
            is_intercompany=False,
        )
        db.add(tx)
        inserted_txs.append(tx)
        latest_balance = item.running_balance

    # Update account cleared balance with latest running balance
    account.current_cleared_balance = latest_balance
    await db.commit()

    # 6. Auto-scan for contra transfer pairs
    netting_engine = InterCompanyNettingEngine(db)
    paired_contra = await netting_engine.auto_scan_tenant(current_user.tenant_id, user_id=current_user.username)

    return {
        "status": "success",
        "account_id": str(account.account_id),
        "bank_name": account.bank_name,
        "filename": file.filename,
        "ingested_count": len(inserted_txs),
        "contra_paired_count": len(paired_contra),
        "latest_cleared_balance": float(latest_balance),
        "preview": [
            {
                "date": str(tx.transaction_date),
                "ref": tx.reference_number,
                "counterparty": tx.counterparty_name,
                "narration": tx.narration,
                "debit": float(tx.debit_amount),
                "credit": float(tx.credit_amount),
                "running_balance": float(tx.running_balance),
                "category": tx.category,
            }
            for tx in inserted_txs[:5]
        ],
    }
