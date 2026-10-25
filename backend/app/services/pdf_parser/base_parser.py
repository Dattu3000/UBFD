import re
from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ParsedLineItem(BaseModel):
    transaction_date: date
    transaction_time: Optional[time] = None
    reference_number: str
    counterparty_name: str
    narration: str
    debit_amount: Decimal
    credit_amount: Decimal
    running_balance: Decimal
    category: str = "Uncategorized"


class BaseStatementParser:
    """
    Abstract parser with utility methods for normalizing Indian currency formats,
    date strings, and transaction categorization.
    """

    @staticmethod
    def normalize_amount(raw: Any) -> Decimal:
        if raw is None:
            return Decimal("0.00")
        s = str(raw).strip()
        if not s or s == "-" or s.lower() == "nil" or s == "0":
            return Decimal("0.00")

        # Strip currency symbols, commas, quotes
        s = s.replace("₹", "").replace("Rs.", "").replace("Rs", "").replace(",", "").strip()

        # Handle parentheses for debits e.g. (100.00)
        is_negative = False
        if s.startswith("(") and s.endswith(")"):
            is_negative = True
            s = s[1:-1]
        elif s.endswith("Dr") or s.endswith("DR"):
            is_negative = True
            s = s[:-2].strip()
        elif s.endswith("Cr") or s.endswith("CR"):
            s = s[:-2].strip()

        try:
            val = Decimal(s)
            return -val if is_negative else val
        except Exception:
            return Decimal("0.00")

    @staticmethod
    def parse_indian_date(raw: str) -> date:
        s = raw.strip()
        formats = [
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%d/%m/%y",
            "%d-%m-%y",
            "%Y-%m-%d",
            "%d %b %Y",
            "%d-%b-%Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        # Fallback to today if unparseable
        return datetime.now().date()

    @staticmethod
    def categorize_narration(narration: str) -> str:
        upper = narration.upper()
        if "SISTER" in upper or "INTERCO" in upper or "INTER-CO" in upper or "CONTRA" in upper:
            return "Inter-Company Fund"
        if "SALARY" in upper or "PAYROLL" in upper or "WAGES" in upper:
            return "Payroll"
        if "GST" in upper or "TAX" in upper or "TDS" in upper or "CHALLAN" in upper:
            return "Tax & Statutory"
        if "CHG" in upper or "CHARGE" in upper or "FEE" in upper or "ANNUAL" in upper:
            return "Bank Charges"
        if "SWEEP" in upper or "QR" in upper or "POS" in upper or "SETTLE" in upper or "CMS" in upper:
            return "Customer Receipt"
        if "NEFT CR" in upper or "RTGS CR" in upper or "IMPS CR" in upper or "UPI/CR" in upper:
            return "Customer Receipt"
        if "NEFT DR" in upper or "RTGS DR" in upper or "IMPS DR" in upper or "UPI/DR" in upper:
            return "Vendor Payout"
        return "Operating Expense"

    @staticmethod
    def extract_counterparty(narration: str) -> str:
        # Common patterns: NEFT CR-REF-NAME-IFSC or RTGS DR-REF-NAME-IFSC
        parts = narration.split("-")
        if len(parts) >= 3:
            candidate = parts[2].strip()
            if candidate and not candidate.isdigit():
                return candidate.title()
        
        # UPI patterns: UPI-NAME-VPA
        if narration.startswith("UPI"):
            upi_parts = narration.split("/")
            if len(upi_parts) >= 2:
                return upi_parts[1].strip().title()

        # Fallback to truncated narration
        return narration[:30].strip().title()
