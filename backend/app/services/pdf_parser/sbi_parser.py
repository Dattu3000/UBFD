import csv
import io
from decimal import Decimal
from typing import List
from app.services.pdf_parser.base_parser import BaseStatementParser, ParsedLineItem


class SBIParser(BaseStatementParser):
    """
    Parser for State Bank of India (SBI) Statements.
    Expected tabular columns:
    Txn Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance
    """

    def parse_csv(self, content: str) -> List[ParsedLineItem]:
        items: List[ParsedLineItem] = []
        reader = csv.reader(io.StringIO(content))

        header_found = False
        col_map = {}

        for row in reader:
            if not row or not any(row):
                continue

            row_str = " ".join(row).lower()
            if not header_found:
                if "description" in row_str and ("debit" in row_str or "credit" in row_str):
                    header_found = True
                    for idx, col in enumerate(row):
                        c = col.strip().lower()
                        if "txn date" in c or ("date" in c and "value" not in c):
                            col_map["date"] = idx
                        elif "description" in c or "narration" in c:
                            col_map["narration"] = idx
                        elif "ref" in c or "cheque" in c:
                            col_map["ref"] = idx
                        elif "debit" in c:
                            col_map["debit"] = idx
                        elif "credit" in c:
                            col_map["credit"] = idx
                        elif "balance" in c:
                            col_map["balance"] = idx
                    continue
                else:
                    continue

            try:
                date_val = self.parse_indian_date(row[col_map.get("date", 0)])
                narration = row[col_map.get("narration", 2)].strip()
                ref_no = row[col_map.get("ref", 3)].strip() if "ref" in col_map else ""
                if not ref_no:
                    ref_no = f"SBI{date_val.strftime('%y%m%d%H%M')}"

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
