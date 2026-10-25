import uuid
from decimal import Decimal
from datetime import date, time, datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.tenant import Tenant
from app.models.entity import Entity
from app.models.account import BankAccount, DailyAccountSummary
from app.models.transaction import Transaction
from app.api.dependencies import DEMO_TENANT_ID, DEMO_TENANT_NAME, DEMO_TENANT_SLUG


async def seed_demo_data_if_empty(db: AsyncSession) -> None:
    """
    Populates realistic multi-entity accounts, transactions, and daily summaries
    for Rajesh Verma (Group Promoter, 3 Entities, 6 Commercial Bank Accounts).
    """
    existing_tenant = await db.scalar(select(Tenant).where(Tenant.id == DEMO_TENANT_ID))
    if existing_tenant:
        return  # Already seeded

    # 1. Create Demo Tenant
    tenant = Tenant(
        id=DEMO_TENANT_ID,
        name=DEMO_TENANT_NAME,
        slug=DEMO_TENANT_SLUG,
    )
    db.add(tenant)
    await db.flush()

    # 2. Create 3 Legal Entities
    entity_retail = Entity(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        tenant_id=DEMO_TENANT_ID,
        name="Alpha Retailers Pvt Ltd",
        entity_type="PVT_LTD",
        gstin="27AABCA1234F1Z5",
        pan="AABCA1234F",
        base_currency="INR",
    )
    entity_logistics = Entity(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        tenant_id=DEMO_TENANT_ID,
        name="Sister Logistics LLP",
        entity_type="LLP",
        gstin="27AAACL5678B1Z2",
        pan="AAACL5678B",
        base_currency="INR",
    )
    entity_infra = Entity(
        id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
        tenant_id=DEMO_TENANT_ID,
        name="Apex Infra Projects Ltd",
        entity_type="PVT_LTD",
        gstin="27AAACA9999K1Z9",
        pan="AAACA9999K",
        base_currency="INR",
    )
    db.add_all([entity_retail, entity_logistics, entity_infra])
    await db.flush()

    # 3. Create 6 Bank Accounts
    acc_hdfc_retail = BankAccount(
        account_id=uuid.UUID("f81d4fae-7dec-11d0-a765-00a0c91e6bf6"),
        tenant_id=DEMO_TENANT_ID,
        entity_id=entity_retail.id,
        bank_name="HDFC Bank",
        bank_code="HDFC",
        account_number_mask="•••• 9482",
        ifsc_code="HDFC0000240",
        account_type="CURRENT",
        opening_balance=Decimal("1850420.50"),
        current_cleared_balance=Decimal("2179920.50"),
        custom_tag="PRIMARY OPERATING",
    )
    acc_icici_retail = BankAccount(
        account_id=uuid.UUID("a2222222-2222-2222-2222-222222222222"),
        tenant_id=DEMO_TENANT_ID,
        entity_id=entity_retail.id,
        bank_name="ICICI Bank",
        bank_code="ICICI",
        account_number_mask="•••• 1029",
        ifsc_code="ICIC0000102",
        account_type="OVERDRAFT",
        opening_balance=Decimal("3500000.00"),
        current_cleared_balance=Decimal("3420000.00"),
        custom_tag="WORKING CAPITAL OD",
    )
    acc_icici_logistics = BankAccount(
        account_id=uuid.UUID("b3333333-3333-3333-3333-333333333333"),
        tenant_id=DEMO_TENANT_ID,
        entity_id=entity_logistics.id,
        bank_name="ICICI Bank",
        bank_code="ICICI",
        account_number_mask="•••• 7712",
        ifsc_code="ICIC0000102",
        account_type="CURRENT",
        opening_balance=Decimal("1240000.00"),
        current_cleared_balance=Decimal("1340000.00"),
        custom_tag="FREIGHT COLLECTIONS",
    )
    acc_sbi_logistics = BankAccount(
        account_id=uuid.UUID("c4444444-4444-4444-4444-444444444444"),
        tenant_id=DEMO_TENANT_ID,
        entity_id=entity_logistics.id,
        bank_name="State Bank of India",
        bank_code="SBI",
        account_number_mask="•••• 4431",
        ifsc_code="SBIN0000300",
        account_type="CURRENT",
        opening_balance=Decimal("815000.00"),
        current_cleared_balance=Decimal("815000.00"),
        custom_tag="TAX & STATUTORY",
    )
    acc_axis_infra = BankAccount(
        account_id=uuid.UUID("d5555555-5555-5555-5555-555555555555"),
        tenant_id=DEMO_TENANT_ID,
        entity_id=entity_infra.id,
        bank_name="Axis Bank",
        bank_code="AXIS",
        account_number_mask="•••• 6003",
        ifsc_code="UTIB0000004",
        account_type="CASH_CREDIT",
        opening_balance=Decimal("2250000.00"),
        current_cleared_balance=Decimal("2250000.00"),
        custom_tag="PROJECT ESCROW CC",
    )
    acc_kotak_infra = BankAccount(
        account_id=uuid.UUID("e6666666-6666-6666-6666-666666666666"),
        tenant_id=DEMO_TENANT_ID,
        entity_id=entity_infra.id,
        bank_name="Kotak Mahindra Bank",
        bank_code="KOTAK",
        account_number_mask="•••• 3390",
        ifsc_code="KKBK0000958",
        account_type="CURRENT",
        opening_balance=Decimal("1480000.00"),
        current_cleared_balance=Decimal("1480000.00"),
        custom_tag="VENDOR PAYOUTS",
    )
    db.add_all([
        acc_hdfc_retail,
        acc_icici_retail,
        acc_icici_logistics,
        acc_sbi_logistics,
        acc_axis_infra,
        acc_kotak_infra,
    ])
    await db.flush()

    # 4. Seed Target Date Transactions (2026-10-25)
    target_date = date(2026, 10, 25)

    # Inter-company contra pair:
    # Retail HDFC debits 1,00,000 sent to Logistics ICICI (inter-co fund)
    # Logistics ICICI credits 1,00,000 received from Retail
    tx_retail_debit_id = uuid.UUID("c9a646d3-9c61-4cfa-89a3-05c0ff899a7b")
    tx_logistics_credit_id = uuid.UUID("a18b7623-2894-47c1-bf61-68beaf59cd12")

    tx_retail_cr1 = Transaction(
        transaction_id=uuid.UUID("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"),
        tenant_id=DEMO_TENANT_ID,
        account_id=acc_hdfc_retail.account_id,
        transaction_date=target_date,
        transaction_time=time(10, 14, 22),
        reference_number="CMS2948201948",
        counterparty_name="Alpha Retailers Pvt Ltd",
        narration="NEFT CR-CMS2948201948-ALPHA RET-HDF0000240",
        debit_amount=Decimal("0.00"),
        credit_amount=Decimal("250000.00"),
        running_balance=Decimal("2100420.50"),
        category="Customer Receipt",
        is_intercompany=False,
    )
    tx_retail_cr2 = Transaction(
        transaction_id=uuid.UUID("8a0deb3c-2a6c-3abc-8acc-1a0c6a2cba5c"),
        tenant_id=DEMO_TENANT_ID,
        account_id=acc_hdfc_retail.account_id,
        transaction_date=target_date,
        transaction_time=time(11, 45, 10),
        reference_number="UPI202610259901",
        counterparty_name="Store QR Swarm Settlements",
        narration="UPI-SWEEP-STORE-SETTLE-QR99",
        debit_amount=Decimal("0.00"),
        credit_amount=Decimal("200000.00"),
        running_balance=Decimal("2300420.50"),
        category="Customer Receipt",
        is_intercompany=False,
    )
    tx_retail_dr_interco = Transaction(
        transaction_id=tx_retail_debit_id,
        tenant_id=DEMO_TENANT_ID,
        account_id=acc_hdfc_retail.account_id,
        transaction_date=target_date,
        transaction_time=time(14, 20, 5),
        reference_number="HDFC0092841029",
        counterparty_name="Sister Logistics LLP",
        narration="RTGS DR-HDFC0092841029-SISTER LOGISTICS-ICIC0000102",
        debit_amount=Decimal("100000.00"),
        credit_amount=Decimal("0.00"),
        running_balance=Decimal("2200420.50"),
        category="Inter-Company Fund",
        is_intercompany=True,
        intercompany_pair_id=tx_logistics_credit_id,
    )
    tx_retail_dr_vendor = Transaction(
        transaction_id=uuid.UUID("7f9cda2b-1f5b-2fba-7fbb-0f9b5f1ba94b"),
        tenant_id=DEMO_TENANT_ID,
        account_id=acc_hdfc_retail.account_id,
        transaction_date=target_date,
        transaction_time=time(16, 50, 30),
        reference_number="NEFT9928172611",
        counterparty_name="Packaging Supplies Corp",
        narration="NEFT DR-PACKAGING-SUPPLIES-INV9481",
        debit_amount=Decimal("20500.00"),
        credit_amount=Decimal("0.00"),
        running_balance=Decimal("2179920.50"),
        category="Vendor Payout",
        is_intercompany=False,
    )

    # Logistics counterpart credit transaction
    tx_logistics_cr_interco = Transaction(
        transaction_id=tx_logistics_credit_id,
        tenant_id=DEMO_TENANT_ID,
        account_id=acc_icici_logistics.account_id,
        transaction_date=target_date,
        transaction_time=time(14, 21, 15),
        reference_number="ICIC9928192800",
        counterparty_name="Alpha Retailers Pvt Ltd",
        narration="RTGS CR-HDFC0092841029-ALPHA RETAILERS-HDF0000240",
        debit_amount=Decimal("0.00"),
        credit_amount=Decimal("100000.00"),
        running_balance=Decimal("1340000.00"),
        category="Inter-Company Fund",
        is_intercompany=True,
        intercompany_pair_id=tx_retail_debit_id,
    )

    db.add_all([
        tx_retail_cr1,
        tx_retail_cr2,
        tx_retail_dr_interco,
        tx_retail_dr_vendor,
        tx_logistics_cr_interco,
    ])

    # 5. Pre-aggregated Daily Summary for HDFC Retail on 2026-10-25
    summary_hdfc = DailyAccountSummary(
        summary_id=uuid.uuid4(),
        account_id=acc_hdfc_retail.account_id,
        summary_date=target_date,
        opening_balance=Decimal("1850420.50"),
        total_credited=Decimal("450000.00"),
        total_debited=Decimal("120500.00"),
        closing_balance=Decimal("2179920.50"),
    )
    db.add(summary_hdfc)

    await db.commit()
