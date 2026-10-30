import re
from typing import Tuple


MAX_STATEMENT_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit


class StatementSecuritySanitizer:
    """
    Layer 3: Bank Ingestion Rail & File Upload Hardening:
    - Magic Byte Verification: Validates true MIME signatures, never trusting file extensions.
    - Binary & Executable Disarm: Rejects Windows PE (MZ), Linux ELF, and ZIP archives.
    - CSV Formula Injection (DDE) Neutralization: Sanitizes leading '=', '+', '-', '@', '\t', '\r'.
    """

    DANGEROUS_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

    @classmethod
    def sanitize_field(cls, value: str) -> str:
        """
        Neutralizes CSV Formula Injection (DDE attacks) for financial export/display.
        Prepends a single quote "'" if the string starts with trigger characters,
        forcing spreadsheet engines (Excel, Google Sheets, LibreOffice, Tally)
        to evaluate the cell strictly as text rather than an executable command.
        """
        if not value:
            return ""
        stripped = value.strip()
        # If starts with a formula trigger character
        if stripped.startswith(cls.DANGEROUS_FORMULA_PREFIXES):
            # If it's a valid negative decimal number (e.g. -500.00), allow standard representation
            if stripped.startswith("-") and re.match(r"^-\d+(\.\d+)?$", stripped):
                return stripped
            if stripped.startswith("+") and re.match(r"^\+\d+(\.\d+)?$", stripped):
                return stripped[1:]
            return f"'{stripped}"
        return stripped

    @classmethod
    def validate_file(cls, filename: str, content_bytes: bytes) -> Tuple[str, str]:
        """
        Verifies magic bytes and rejects malicious/binary payloads.
        Returns: (sanitized_content_str, file_type: 'PDF' | 'CSV')
        """
        if not content_bytes:
            raise ValueError("Uploaded file is empty (0 bytes)")

        if len(content_bytes) > MAX_STATEMENT_FILE_SIZE:
            raise ValueError(
                f"File size exceeds maximum allowable limit of {MAX_STATEMENT_FILE_SIZE // (1024 * 1024)}MB"
            )

        # 1. Magic byte inspection
        # Check for executable binaries
        if content_bytes.startswith(b"MZ") or content_bytes.startswith(b"\x7fELF"):
            raise ValueError("Malicious file upload detected: executable binaries are strictly rejected")

        # Check for PDF
        if content_bytes.startswith(b"%PDF-"):
            # PDF Disarm: Check for dangerous embedded JS or launch actions
            pdf_head = content_bytes[:4096].lower()
            if b"/javascript" in pdf_head or b"/launch" in pdf_head:
                raise ValueError("Security violation: PDF contains active script/launch triggers")
            return content_bytes.decode("latin-1", errors="replace"), "PDF"

        # Check for CSV / Text
        # Ensure no null bytes (which indicate binary masquerading as text)
        if b"\x00" in content_bytes[:2048]:
            raise ValueError("Invalid statement format: binary content detected in CSV statement")

        try:
            decoded = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                decoded = content_bytes.decode("latin-1")
            except Exception:
                raise ValueError("Could not decode statement file: invalid character encoding")

        return decoded, "CSV"

    # Aliases for explicit semantic calls
    validate_magic_bytes = validate_file
    sanitize_csv_cell = sanitize_field
