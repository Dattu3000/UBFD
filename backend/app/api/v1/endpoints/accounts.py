import uuid
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.entity import Entity
from app.models.account import BankAccount
from app.schemas.auth_schema import UserContext
from app.schemas.account_schema import (
    EntityCreate,
    EntityOut,
    BankAccountCreate,
    BankAccountOut,
    GroupLiquiditySummary,
)

router = APIRouter(tags=["Entities & Bank Accounts"])


# --- Legal Entities ---

@router.get("/entities", response_model=List[EntityOut])
async def list_entities(
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all legal entities registered under the authenticated tenant,
    with aggregated liquidity and linked account count.
    """
    stmt = (
        select(Entity)
        .where(Entity.tenant_id == current_user.tenant_id)
        .options(selectinload(Entity.accounts))
        .order_by(Entity.name)
    )
    result = await db.scalars(stmt)
    entities = result.all()

    output = []
    for ent in entities:
        total_liq = sum(
            (acc.current_cleared_balance for acc in ent.accounts), Decimal("0.00")
        )
        output.append(
            EntityOut(
                id=ent.id,
                tenant_id=ent.tenant_id,
                name=ent.name,
                entity_type=ent.entity_type, # type: ignore
                gstin=ent.gstin,
                pan=ent.pan,
                base_currency=ent.base_currency,
                total_liquidity=total_liq,
                account_count=len(ent.accounts),
            )
        )
    return output


@router.post("/entities", response_model=EntityOut, status_code=status.HTTP_201_CREATED)
async def create_entity(
    entity_in: EntityCreate,
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new legal business entity under the active tenant.
    """
    new_entity = Entity(
        id=uuid.uuid4(),
        tenant_id=current_user.tenant_id,
        name=entity_in.name,
        entity_type=entity_in.entity_type,
        gstin=entity_in.gstin,
        pan=entity_in.pan,
        base_currency=entity_in.base_currency,
    )
    db.add(new_entity)
    await db.commit()
    await db.refresh(new_entity)

    return EntityOut(
        id=new_entity.id,
        tenant_id=new_entity.tenant_id,
        name=new_entity.name,
        entity_type=new_entity.entity_type, # type: ignore
        gstin=new_entity.gstin,
        pan=new_entity.pan,
        base_currency=new_entity.base_currency,
        total_liquidity=Decimal("0.00"),
        account_count=0,
    )


# --- Bank Accounts ---

@router.get("/accounts", response_model=List[BankAccountOut])
async def list_bank_accounts(
    entity_id: Optional[uuid.UUID] = None,
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all commercial bank accounts for the tenant, optionally filtered by legal entity.
    """
    stmt = (
        select(BankAccount)
        .where(BankAccount.tenant_id == current_user.tenant_id)
        .options(selectinload(BankAccount.entity))
    )
    if entity_id:
        stmt = stmt.where(BankAccount.entity_id == entity_id)
    
    stmt = stmt.order_by(BankAccount.bank_name, BankAccount.account_number_mask)
    accounts = (await db.scalars(stmt)).all()

    output = []
    for acc in accounts:
        output.append(
            BankAccountOut(
                account_id=acc.account_id,
                tenant_id=acc.tenant_id,
                entity_id=acc.entity_id,
                entity_name=acc.entity.name if acc.entity else "Unknown Entity",
                bank_name=acc.bank_name,
                bank_code=acc.bank_code, # type: ignore
                account_number_mask=acc.account_number_mask,
                ifsc_code=acc.ifsc_code,
                account_type=acc.account_type, # type: ignore
                custom_tag=acc.custom_tag,
                opening_balance=acc.opening_balance,
                current_cleared_balance=acc.current_cleared_balance,
            )
        )
    return output


@router.get("/accounts/{account_id}", response_model=BankAccountOut)
async def get_bank_account(
    account_id: uuid.UUID,
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve single bank account details and real-time cleared balance.
    """
    stmt = (
        select(BankAccount)
        .where(
            and_(
                BankAccount.account_id == account_id,
                BankAccount.tenant_id == current_user.tenant_id,
            )
        )
        .options(selectinload(BankAccount.entity))
    )
    acc = await db.scalar(stmt)
    if not acc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found or access unauthorized",
        )

    return BankAccountOut(
        account_id=acc.account_id,
        tenant_id=acc.tenant_id,
        entity_id=acc.entity_id,
        entity_name=acc.entity.name if acc.entity else "Unknown Entity",
        bank_name=acc.bank_name,
        bank_code=acc.bank_code, # type: ignore
        account_number_mask=acc.account_number_mask,
        ifsc_code=acc.ifsc_code,
        account_type=acc.account_type, # type: ignore
        custom_tag=acc.custom_tag,
        opening_balance=acc.opening_balance,
        current_cleared_balance=acc.current_cleared_balance,
    )


@router.post("/accounts", response_model=BankAccountOut, status_code=status.HTTP_201_CREATED)
async def create_bank_account(
    acc_in: BankAccountCreate,
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Link a new commercial bank account under an existing legal entity.
    """
    # Verify entity belongs to tenant
    entity = await db.scalar(
        select(Entity).where(
            and_(
                Entity.id == acc_in.entity_id,
                Entity.tenant_id == current_user.tenant_id,
            )
        )
    )
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent legal entity not found for this tenant",
        )

    # Derive mask if not explicit
    mask = acc_in.account_number_mask
    if not mask and acc_in.account_number_raw:
        mask = f"•••• {acc_in.account_number_raw[-4:]}"

    new_acc = BankAccount(
        account_id=uuid.uuid4(),
        tenant_id=current_user.tenant_id,
        entity_id=acc_in.entity_id,
        bank_name=acc_in.bank_name,
        bank_code=acc_in.bank_code,
        account_number_mask=mask,
        ifsc_code=acc_in.ifsc_code.upper(),
        account_type=acc_in.account_type,
        opening_balance=acc_in.opening_balance,
        current_cleared_balance=acc_in.opening_balance,
        custom_tag=acc_in.custom_tag,
    )
    db.add(new_acc)
    await db.commit()
    await db.refresh(new_acc)

    return BankAccountOut(
        account_id=new_acc.account_id,
        tenant_id=new_acc.tenant_id,
        entity_id=new_acc.entity_id,
        entity_name=entity.name,
        bank_name=new_acc.bank_name,
        bank_code=new_acc.bank_code, # type: ignore
        account_number_mask=new_acc.account_number_mask,
        ifsc_code=new_acc.ifsc_code,
        account_type=new_acc.account_type, # type: ignore
        custom_tag=new_acc.custom_tag,
        opening_balance=new_acc.opening_balance,
        current_cleared_balance=new_acc.current_cleared_balance,
    )


# --- Group Overview Summary ---

@router.get("/summary/group-liquidity", response_model=GroupLiquiditySummary)
async def get_group_liquidity_summary(
    current_user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Computes consolidated group-wide liquidity: total cleared positive cash,
    overdraft credit lines drawn, net liquidity, and account rosters.
    """
    # Fetch accounts with entities
    stmt = (
        select(BankAccount)
        .where(BankAccount.tenant_id == current_user.tenant_id)
        .options(selectinload(BankAccount.entity))
    )
    accounts = (await db.scalars(stmt)).all()

    total_cleared = Decimal("0.00")
    total_od = Decimal("0.00")

    account_outs = []
    for acc in accounts:
        bal = acc.current_cleared_balance
        if bal >= 0:
            total_cleared += bal
        else:
            total_od += abs(bal)

        account_outs.append(
            BankAccountOut(
                account_id=acc.account_id,
                tenant_id=acc.tenant_id,
                entity_id=acc.entity_id,
                entity_name=acc.entity.name if acc.entity else "Unknown Entity",
                bank_name=acc.bank_name,
                bank_code=acc.bank_code, # type: ignore
                account_number_mask=acc.account_number_mask,
                ifsc_code=acc.ifsc_code,
                account_type=acc.account_type, # type: ignore
                custom_tag=acc.custom_tag,
                opening_balance=acc.opening_balance,
                current_cleared_balance=acc.current_cleared_balance,
            )
        )

    # Entities count
    ent_count = await db.scalar(
        select(func.count(Entity.id)).where(Entity.tenant_id == current_user.tenant_id)
    ) or 0

    return GroupLiquiditySummary(
        total_cleared_cash=total_cleared,
        total_overdraft_utilized=total_od,
        net_group_liquidity=total_cleared - total_od,
        entities_count=ent_count,
        accounts_count=len(accounts),
        unreconciled_transactions_count=0,
        accounts=account_outs,
    )
