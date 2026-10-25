import csv
import io
from decimal import Decimal
from typing import List
from app.services.pdf_parser.base_parser import BaseStatementParser, ParsedLineItem


class YESBankParser(BaseStatementParser):
    """
    Parser for YES Bank Corporate & Commercial Account Statements.
    Expected tabular columns:
    Txn Date, Value Date, Description, Cheque/Reference No, Debit, Credit, Running Balance
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
                if (
                    ("txn" in row_str or "date" in row_str)
                    and ("description" in row_str or "narration" in row_str or "particulars" in row_str)
                    and ("debit" in row_str or "credit" in row_str or "balance" in row_str)
                ):
                    header_found = True
                    for idx, col in enumerate(row):
                        c = col.strip().lower()
                        if "txn" in c or ("date" in c and "value" not in c):
                            col_map["date"] = idx
                        elif "description" in c or "narration" in c or "particulars" in c:
                            col_map["narration"] = idx
                        elif "ref" in c or "chq" in c or "cheque" in c or "utr" in c:
                            col_map["ref"] = idx
                        elif "debit" in c or "withdrawal" in c or "dr" in c:
                            col_map["debit"] = idx
                        elif "credit" in c or "deposit" in c or "cr" in c:
                            col_map["credit"] = idx
                        elif "balance" in c:
                            col_map["balance"] = idx
                    continue
                else:
                    continue

            # Parse transaction row
            try:
                date_str = row[col_map.get("date", 0)].strip()
                date_val = self.parse_indian_date(date_str)
                narration = row[col_map.get("narration", 1)].strip()
                ref_no = row[col_map.get("ref", 2)].strip() if "ref" in col_map and len(row) > col_map["ref"] else ""
                if not ref_no:
                    ref_no = f"YESB{date_val.strftime('%y%m%d%H%M')}"

                debit = (
                    self.normalize_amount(row[col_map.get("debit", 3)])
                    if "debit" in col_map and len(row) > col_map["debit"]
                    else Decimal("0.00")
                )
                credit = (
                    self.normalize_amount(row[col_map.get("credit", 4)])
                    if "credit" in col_map and len(row) > col_map["credit"]
                    else Decimal("0.00")
                )
                balance = (
                    self.normalize_amount(row[col_map.get("balance", 5)])
                    if "balance" in col_map and len(row) > col_map["balance"]
                    else Decimal("0.00")
                )

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
