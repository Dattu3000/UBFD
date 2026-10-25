from decimal import Decimal
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.services.pdf_parser import HDFCParser, ICICIParser, SBIParser, YESBankParser, get_parser_for_bank


def test_hdfc_parser():
    sample_hdfc_csv = """Date,Narration,Chq/Ref No,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
25/10/2026,NEFT CR-CMS998822-DELTA CORP-HDF0000240,CMS998822,25/10/2026,,150000.00,2329920.50
25/10/2026,RTGS DR-HDFC112233-SISTER LOGISTICS-ICIC0000102,HDFC112233,25/10/2026,50000.00,,2279920.50
"""
    parser = HDFCParser()
    items = parser.parse_csv(sample_hdfc_csv)
    assert len(items) == 2
    assert items[0].credit_amount == Decimal("150000.00")
    assert items[0].running_balance == Decimal("2329920.50")
    assert items[1].debit_amount == Decimal("50000.00")
    assert items[1].category == "Inter-Company Fund"


def test_icici_parser():
    sample_icici_csv = """Value Date,Transaction Date,Cheque No,Transaction Remarks,Debit Amount,Credit Amount,Balance
25/10/2026,25/10/2026,009911,UPI/STORE-PAYMENT/QR102,0.00,12500.50,1352500.50
25/10/2026,25/10/2026,009912,NEFT DR-TAX-CHALLAN-OCT26,3500.00,0.00,1349000.50
"""
    parser = ICICIParser()
    items = parser.parse_csv(sample_icici_csv)
    assert len(items) == 2
    assert items[0].credit_amount == Decimal("12500.50")
    assert items[1].category == "Tax & Statutory"


def test_sbi_parser():
    sample_sbi_csv = """Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
25/10/2026,25/10/2026,INTEREST CREDIT FY26,SBIN998811,0.00,4250.00,819250.00
"""
    parser = SBIParser()
    items = parser.parse_csv(sample_sbi_csv)
    assert len(items) == 1
    assert items[0].credit_amount == Decimal("4250.00")
    assert items[0].running_balance == Decimal("819250.00")


def test_yes_bank_parser():
    sample_yes_csv = """Txn Date,Value Date,Description,Cheque/Reference No,Debit,Credit,Running Balance
25/10/2026,25/10/2026,NEFT CR-ESCROW992-PAYMENTS-YESB0000001,UTR99881100,0.00,480000.00,1480000.00
25/10/2026,25/10/2026,RTGS DR-FLEET-EXPENSE-IDFB0000001,UTR99881101,65000.00,0.00,1415000.00
"""
    parser = get_parser_for_bank("YESB")
    assert isinstance(parser, YESBankParser)
    items = parser.parse_csv(sample_yes_csv)
    assert len(items) == 2
    assert items[0].credit_amount == Decimal("480000.00")
    assert items[0].running_balance == Decimal("1480000.00")
    assert items[1].debit_amount == Decimal("65000.00")



@pytest.mark.asyncio
async def test_upload_statement_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        account_id = "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
        sample_csv = b"""Date,Narration,Chq/Ref No,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
26/10/2026,NEFT CR-CMS771122-CLIENT PAYMENT-HDF0000240,CMS771122,26/10/2026,,88000.00,2267920.50
"""
        files = {
            "file": ("statement_oct2026.csv", sample_csv, "text/csv"),
        }
        data = {
            "account_id": account_id,
        }
        res = await ac.post(f"{settings.API_V1_STR}/ingestion/upload", data=data, files=files)
        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "success"
        assert res_data["ingested_count"] == 1
        assert res_data["latest_cleared_balance"] == 2267920.50
