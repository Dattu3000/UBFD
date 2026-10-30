import os
import base64
import hmac
import hashlib
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from app.core.config import settings


class VaultCrypto:
    """
    Layer 4 Cryptographic Vault:
    - AES-256-GCM Field-Level Envelope Encryption for sensitive Indian financial & statutory identifiers (PAN, GSTIN, Bank Account Numbers).
    - Salted HMAC-SHA256 Blind Indexing to enable deterministic, indexed lookups on encrypted columns without table decryption.
    """

    _cached_dek: Optional[bytes] = None
    _cached_hmac_key: Optional[bytes] = None

    @classmethod
    def get_data_encryption_key(cls) -> bytes:
        """
        Derives a 256-bit Data Encryption Key (DEK) from the master secret using HKDF-SHA256.
        In enterprise cloud environments, this connects to Google Cloud KMS / AWS KMS.
        """
        if cls._cached_dek is None:
            master_secret = settings.SECRET_KEY.encode("utf-8")
            hkdf = HKDF(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"ubfd-aes256-gcm-master-salt-india",
                info=b"ubfd-field-level-envelope-encryption-dek",
            )
            cls._cached_dek = hkdf.derive(master_secret)
        return cls._cached_dek

    @classmethod
    def get_blind_index_key(cls) -> bytes:
        """
        Derives a distinct HMAC key specifically for Blind Indexing.
        Kept strictly separated from the encryption DEK.
        """
        if cls._cached_hmac_key is None:
            master_secret = settings.SECRET_KEY.encode("utf-8")
            hkdf = HKDF(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"ubfd-blind-index-salt-pan-gstin",
                info=b"ubfd-deterministic-blind-indexing",
            )
            cls._cached_hmac_key = hkdf.derive(master_secret)
        return cls._cached_hmac_key

    @classmethod
    def encrypt_field(cls, plaintext: Optional[str], associated_data: Optional[str] = None) -> Optional[str]:
        """
        Encrypts a string field using AES-256-GCM with a 96-bit cryptographically random nonce.
        Returns a versioned Base64 envelope: 'vault:v1:<base64_payload>'.
        """
        if plaintext is None:
            return None
        if not plaintext:
            return ""

        key = cls.get_data_encryption_key()
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)  # 96-bit recommended nonce for AES-GCM
        ad = associated_data.encode("utf-8") if associated_data else None

        ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), ad)
        payload = nonce + ciphertext
        b64 = base64.b64encode(payload).decode("ascii")
        return f"vault:v1:{b64}"

    @classmethod
    def decrypt_field(cls, envelope: Optional[str], associated_data: Optional[str] = None) -> Optional[str]:
        """
        Decrypts an AES-256-GCM envelope. Validates authenticity tag.
        Handles plaintext backward-compatibility gracefully if not yet migrated.
        """
        if envelope is None:
            return None
        if not envelope.startswith("vault:v1:"):
            # Plaintext fallback for legacy unmigrated data
            return envelope

        b64_payload = envelope[len("vault:v1:"):]
        try:
            payload = base64.b64decode(b64_payload)
            if len(payload) < 28:  # 12 nonce + at least 16 tag
                return envelope
            nonce = payload[:12]
            ciphertext = payload[12:]

            key = cls.get_data_encryption_key()
            aesgcm = AESGCM(key)
            ad = associated_data.encode("utf-8") if associated_data else None

            plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, ad)
            return plaintext_bytes.decode("utf-8")
        except Exception:
            # If decryption fails (e.g., tampered data or wrong key), raise or return None
            raise ValueError("Cryptographic verification failed: ciphertext tampered or invalid key")

    @classmethod
    def compute_blind_index(cls, value: Optional[str]) -> Optional[str]:
        """
        Computes a salted HMAC-SHA256 blind index for exact search on sensitive fields (e.g. PAN / GSTIN / Account).
        Normalizes input (trimmed, uppercase) before hashing so searching is case-insensitive.
        """
        if not value:
            return None
        normalized = value.strip().upper().replace(" ", "").replace("-", "")
        key = cls.get_blind_index_key()
        h = hmac.new(key, normalized.encode("utf-8"), hashlib.sha256)
        return h.hexdigest()
