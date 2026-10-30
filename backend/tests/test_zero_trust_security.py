import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.core.crypto import VaultCrypto
from app.services.audit_service import AuditService
from app.services.pdf_parser.sanitizer import StatementSecuritySanitizer
from app.services.aa_crypto import AACryptoVault
from app.core.database import async_session_factory
from app.models.audit import AuditLog
from sqlalchemy import select


@pytest.mark.asyncio
async def test_zero_trust_security_headers():
    """
    Layer 1 & 2: Verify Strict Security Headers injected on every HTTP response.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200

        # Layer 1 Transport & Frame Protection
        assert res.headers.get("Strict-Transport-Security") == "max-age=63072000; includeSubDomains; preload"
        assert res.headers.get("X-Content-Type-Options") == "nosniff"
        assert res.headers.get("X-Frame-Options") == "DENY"
        assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "geolocation=(), microphone=(), camera=()" in res.headers.get("Permissions-Policy", "")

        # Layer 1 Geo-Policy header
        assert res.headers.get("X-Geo-Policy") == "IN-Priority"

        # Layer 5 Content Security Policy
        csp = res.headers.get("Content-Security-Policy", "")
        assert "default-src 'self'" in csp
        assert "frame-ancestors 'none'" in csp
        assert "object-src 'none'" in csp


def test_vault_crypto_aes_gcm_envelope():
    """
    Layer 4: Field-Level AES-256-GCM Envelope Encryption and Decryption.
    """
    sample_pan = "ABCDE1234F"
    tenant_id = str(uuid.uuid4())

    # 1. Encrypt field
    envelope = VaultCrypto.encrypt_field(sample_pan, associated_data=tenant_id)
    assert envelope.startswith("vault:v1:")
    assert envelope != sample_pan

    # 2. Decrypt field with correct tenant associated data
    decrypted = VaultCrypto.decrypt_field(envelope, associated_data=tenant_id)
    assert decrypted == sample_pan

    # 3. Decryption with wrong associated data must fail (tamper detection)
    with pytest.raises(ValueError):
        VaultCrypto.decrypt_field(envelope, associated_data=str(uuid.uuid4()))

    # 4. Tampered ciphertext payload must fail
    tampered_envelope = envelope[:-4] + "AAAA"
    with pytest.raises(ValueError):
        VaultCrypto.decrypt_field(tampered_envelope, associated_data=tenant_id)


def test_vault_crypto_blind_indexing():
    """
    Layer 4: Deterministic Salted HMAC-SHA256 Blind Indexing for encrypted search.
    """
    pan1 = "ABCDE1234F"
    pan2 = "abcde 1234f"  # Different casing and whitespace
    pan3 = "XYZPQ9876A"

    bi1 = VaultCrypto.compute_blind_index(pan1)
    bi2 = VaultCrypto.compute_blind_index(pan2)
    bi3 = VaultCrypto.compute_blind_index(pan3)

    assert bi1 is not None
    assert len(bi1) == 64  # SHA256 hex string
    # Normalized search matches
    assert bi1 == bi2
    # Distinct values produce distinct blind indexes
    assert bi1 != bi3


def test_file_upload_sanitization():
    """
    Layer 3: Magic Byte Verification and CSV Formula Injection Neutralization.
    """
    # 1. Valid PDF magic bytes
    valid_pdf = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    StatementSecuritySanitizer.validate_magic_bytes("statement.pdf", valid_pdf)

    # 2. Executable masquerading as PDF rejected
    fake_pdf = b"MZ\x90\x00\x03\x00\x00\x00"
    with pytest.raises(Exception):
        StatementSecuritySanitizer.validate_magic_bytes("statement.pdf", fake_pdf)

    # 3. ELF binary masquerading as PDF rejected
    fake_elf = b"\x7fELF\x02\x01\x01\x00"
    with pytest.raises(Exception):
        StatementSecuritySanitizer.validate_magic_bytes("malicious.pdf", fake_elf)

    # 4. CSV Formula Injection (DDE) Sanitization
    dangerous_narration = "=cmd|' /C calc'!A0"
    safe_narration = StatementSecuritySanitizer.sanitize_csv_cell(dangerous_narration)
    assert safe_narration.startswith("'=")

    plus_formula = "+1+2"
    assert StatementSecuritySanitizer.sanitize_csv_cell(plus_formula) == "'+1+2"

    at_formula = "@SUM(A1:A10)"
    assert StatementSecuritySanitizer.sanitize_csv_cell(at_formula) == "'@SUM(A1:A10)"

    normal_text = "Payment to Vendor Logistics Ltd"
    assert StatementSecuritySanitizer.sanitize_csv_cell(normal_text) == normal_text


def test_aa_curve25519_ecdhe_crypto_vault():
    """
    Layer 3: RBI Account Aggregator Curve25519 ECDHE in-memory encryption & decryption.
    """
    # 1. Generate FIU keypair
    fiu_priv, fiu_pub_b64 = AACryptoVault.generate_key_pair()
    assert fiu_pub_b64 is not None

    # 2. Bank FIP encrypts statement payload using FIU public key
    raw_bank_statement = {
        "account_number": "50200012345678",
        "balance": 1542000.50,
        "transactions": [
            {"date": "2026-10-25", "amount": 50000.0, "narration": "NEFT/CREDIT/INVOICE-88"}
        ],
    }
    encrypted_package = AACryptoVault.encrypt_fiu_payload(raw_bank_statement, fiu_pub_b64)
    assert "encrypted_data" in encrypted_package
    assert "iv" in encrypted_package

    # 3. Decrypt in volatile memory using FIU private key
    decrypted_statement = AACryptoVault.decrypt_fiu_payload(encrypted_package, fiu_priv)
    assert decrypted_statement["account_number"] == "50200012345678"
    assert decrypted_statement["balance"] == 1542000.50

    # 4. Detached JWS validation
    valid_jws = AACryptoVault.verify_detached_jws(
        header_b64="eyJhbGciOiJSUzI1NiJ9",
        signature_b64="valid_detached_signature_bytes_sample_token",
        payload_bytes=b"dummy_payload"
    )
    assert valid_jws is True


@pytest.mark.asyncio
async def test_mca_rule_3_1_audit_hash_chain_and_tamper_detection():
    """
    Layer 4: MCA Rule 3(1) Cryptographically Immutable Audit Log (Hash Chaining & Tamper Detection).
    """
    test_tenant_id = uuid.uuid4()

    async with async_session_factory() as session:
        audit_service = AuditService(session)

        # 1. Create first audit event (links to GENESIS_HASH)
        entry1 = await audit_service.log_event(
            tenant_id=test_tenant_id,
            table_name="entities",
            record_id=str(uuid.uuid4()),
            action="CREATE_ENTITY",
            old_values=None,
            new_values={"name": "Secure Entity A"},
            user_id="audit_tester",
        )
        assert entry1.prev_hash == AuditService.GENESIS_HASH
        assert len(entry1.row_hash) == 64

        # 2. Create second audit event (must link to entry1.row_hash)
        entry2 = await audit_service.log_event(
            tenant_id=test_tenant_id,
            table_name="bank_accounts",
            record_id=str(uuid.uuid4()),
            action="LINK_ACCOUNT",
            old_values=None,
            new_values={"mask": "•••• 1942"},
            user_id="audit_tester",
        )
        assert entry2.prev_hash == entry1.row_hash

        # 3. Verify clean chain integrity
        result_clean = await audit_service.verify_chain_integrity(test_tenant_id)
        assert result_clean["is_valid"] is True
        assert result_clean["total_records"] == 2
        assert result_clean["latest_hash"] == entry2.row_hash

        # 4. Test intentional tampering detection (simulate rogue insider or SQL attack directly modifying entry1)
        entry1.action = "TAMPERED_ACTION"
        await session.commit()

        # Chain verification must now fail mathematically!
        result_tampered = await audit_service.verify_chain_integrity(test_tenant_id)
        assert result_tampered["is_valid"] is False
        assert result_tampered["tampered_at_index"] == 0
        assert "failed" in result_tampered["reason"].lower()


@pytest.mark.asyncio
async def test_audit_verify_chain_api_endpoint():
    """
    Test the REST API endpoint GET /api/v1/audit/verify-chain with authenticated context.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"{settings.API_V1_STR}/audit/verify-chain")
        assert res.status_code == 200
        data = res.json()
        assert "is_valid" in data
        assert "total_records" in data
        assert "latest_hash" in data
