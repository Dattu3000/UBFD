from app.services.pdf_parser.base_parser import BaseStatementParser, ParsedLineItem
from app.services.pdf_parser.hdfc_parser import HDFCParser
from app.services.pdf_parser.icici_parser import ICICIParser
from app.services.pdf_parser.sbi_parser import SBIParser
from app.services.pdf_parser.yes_parser import YESBankParser


def get_parser_for_bank(bank_code: str) -> BaseStatementParser:
    code = bank_code.upper()
    if "HDFC" in code:
        return HDFCParser()
    elif "ICICI" in code:
        return ICICIParser()
    elif "SBI" in code:
        return SBIParser()
    elif "YES" in code:
        return YESBankParser()
    # Default to generic / HDFC parser for other commercial banks
    return HDFCParser()


__all__ = [
    "BaseStatementParser",
    "ParsedLineItem",
    "HDFCParser",
    "ICICIParser",
    "SBIParser",
    "YESBankParser",
    "get_parser_for_bank",
]

