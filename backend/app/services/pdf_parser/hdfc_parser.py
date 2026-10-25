import csv
import io
from decimal import Decimal
from typing import List
from app.services.pdf_parser.base_parser import BaseStatementParser, ParsedLineItem


class HDFCParser(BaseStatementParser):
    """
    Parser for HDFC Bank Commercial Account Statements.
    Expected tabular columns:
    Date, Narration, Chq/Ref No, Value Dt, Withdrawal Amt, Deposit Amt, Closing Balance
    """

    def parse_csv(self, content: str) -> List[ParsedLineItem]:
        items: List[ParsedLineItem] = []
        reader = csv.reader(io.StringIO(content))

        header_found = False
        col_map = {}

        for row in reader:
            if not row or not any(row):
                continue

            # Identify header row
            row_str = " ".join(row).lower()
            if not header_found:
                if "narration" in row_str and ("withdrawal" in row_str or "deposit" in row_str or "closing" in row_str):
                    header_found = True
                    for idx, col in enumerate(row):
                        c = col.strip().lower()
                        if "date" in c and "value" not in c:
                            col_map["date"] = idx
                        elif "narration" in c or "description" in c:
                            col_map["narration"] = idx
                        elif "chq" in c or "ref" in c:
                            col_map["ref"] = idx
                        elif "withdrawal" in c or "debit" in c:
                            col_map["debit"] = idx
                        elif "deposit" in c or "credit" in c:
                            col_map["credit"] = idx
                        elif "closing" in c or "balance" in c:
                            col_map["balance"] = idx
                    continue
                else:
                    continue

            # Parse transaction row
            try:
                date_val = self.parse_indian_date(row[col_map.get("date", 0)])
                narration = row[col_map.get("narration", 1)].strip()
                ref_no = row[col_map.get("ref", 2)].strip() if "ref" in col_map else f"HDFC{date_val.strftime('%y%m%d%H%M')}"
                if not ref_no:
                    ref_no = f"HDFC{date_val.strftime('%y%m%d%H%M')}"

                debit = self.normalize_amount(row[col_map.get("debit", 4)]) if "debit" in col_map else Decimal("0.00")
                credit = self.normalize_amount(row[col_map.get("credit", 5)]) if "credit" in col_map else Decimal("0.00")
                balance = self.normalize_amount(row[col_map.get("balance", 6)]) if "balance" in col_map else Decimal("0.00")

                counterparty = self.extract_counterparty(narration)
                category = self.categorize_narration(narration)

                items.append(
                    ParsedLineItem(
                        transaction_date=date_val,
                        reference_number=ref_no,
                        counterparty_name=counterparty,
                        narration=narration,
                        debit_amount=debit,
                        credit_amount=credit,
                        running_balance=balance,
                        category=category,
                    )
                )
            except Exception:
                continue

        return items
