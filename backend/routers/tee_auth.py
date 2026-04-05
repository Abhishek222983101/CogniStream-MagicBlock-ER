"""
TEE Authentication Router
Provides endpoints for MagicBlock TEE (Trusted Execution Environment) authentication.
Used for private ephemeral rollup operations.
"""

import hashlib
import hmac
import time
import base64
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

# ─── Configuration ────────────────────────────────────────────────────────────

# TEE Validator pubkey (MagicBlock Devnet TEE)
TEE_VALIDATOR = "FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA"

# TEE RPC endpoint
TEE_ENDPOINT = "https://devnet-tee.magicblock.app"

# Token expiry in seconds (1 hour)
TOKEN_EXPIRY_SECONDS = 3600

# Secret for HMAC signing (in production, use env var)
# For hackathon demo purposes, we use a fixed secret
TEE_SECRET = "cognistream_tee_secret_v1_magicblock_hackathon"


# ─── Models ───────────────────────────────────────────────────────────────────


class TEEAuthRequest(BaseModel):
    """Request for TEE authentication token"""

    wallet_address: str = Field(..., description="Wallet public key (base58)")
    signature: str = Field(..., description="Signature of auth message")
    message: str = Field(..., description="Original message that was signed")
    timestamp: int = Field(..., description="Unix timestamp when message was created")


class TEEAuthResponse(BaseModel):
    """TEE authentication token response"""

    success: bool
    token: Optional[str] = None
    expires_at: Optional[int] = None  # Unix timestamp
    tee_endpoint: str = TEE_ENDPOINT
    tee_validator: str = TEE_VALIDATOR
    error: Optional[str] = None


class TEEVerifyRequest(BaseModel):
    """Request to verify TEE RPC integrity"""

    token: str = Field(..., description="TEE auth token")


class TEEVerifyResponse(BaseModel):
    """TEE RPC integrity verification response"""

    valid: bool
    integrity_hash: Optional[str] = None
    attestation: Optional[str] = None
    error: Optional[str] = None


# ─── Router ───────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/tee")


def generate_tee_token(wallet_address: str) -> tuple[str, int]:
    """
    Generate a TEE authentication token for a wallet.
    Returns (token, expiry_timestamp)
    """
    expiry = int(time.time()) + TOKEN_EXPIRY_SECONDS

    # Create token payload
    payload = f"{wallet_address}:{expiry}:{secrets.token_hex(16)}"

    # Sign with HMAC-SHA256
    signature = hmac.new(
        TEE_SECRET.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()

    # Combine payload and signature
    token = base64.urlsafe_b64encode(f"{payload}:{signature}".encode()).decode()

    return token, expiry


def verify_tee_token(token: str) -> tuple[bool, Optional[str]]:
    """
    Verify a TEE authentication token.
    Returns (is_valid, wallet_address)
    """
    try:
        # Decode token
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        parts = decoded.rsplit(":", 1)

        if len(parts) != 2:
            return False, None

        payload, signature = parts

        # Verify signature
        expected_sig = hmac.new(
            TEE_SECRET.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            return False, None

        # Parse payload
        payload_parts = payload.split(":")
        if len(payload_parts) < 2:
            return False, None

        wallet_address = payload_parts[0]
        expiry = int(payload_parts[1])

        # Check expiry
        if time.time() > expiry:
            return False, None

        return True, wallet_address

    except Exception:
        return False, None


@router.post("/auth", response_model=TEEAuthResponse)
async def authenticate_for_tee(request: TEEAuthRequest) -> TEEAuthResponse:
    """
    Authenticate a wallet for TEE operations.

    The client should:
    1. Create a message: "CogniStream TEE Auth: {wallet_address} at {timestamp}"
    2. Sign it with their wallet
    3. Send the signature, message, and timestamp

    Returns a token valid for 1 hour.
    """
    try:
        # Verify timestamp is recent (within 5 minutes)
        current_time = int(time.time())
        if abs(current_time - request.timestamp) > 300:
            return TEEAuthResponse(
                success=False, error="Timestamp too old or in future"
            )

        # Verify message format
        expected_message = (
            f"CogniStream TEE Auth: {request.wallet_address} at {request.timestamp}"
        )
        if request.message != expected_message:
            return TEEAuthResponse(success=False, error="Invalid message format")

        # NOTE: In production, we would verify the signature on-chain
        # For hackathon, we trust the client's signature
        # Real implementation would use:
        # - nacl.signing.VerifyKey(pubkey).verify(message, signature)
        # - Or call Solana RPC to verify

        # Generate token
        token, expiry = generate_tee_token(request.wallet_address)

        return TEEAuthResponse(
            success=True,
            token=token,
            expires_at=expiry,
            tee_endpoint=TEE_ENDPOINT,
            tee_validator=TEE_VALIDATOR,
        )

    except Exception as e:
        return TEEAuthResponse(success=False, error=str(e))


@router.post("/verify", response_model=TEEVerifyResponse)
async def verify_tee_rpc_integrity(request: TEEVerifyRequest) -> TEEVerifyResponse:
    """
    Verify TEE RPC integrity.

    This endpoint simulates the MagicBlock verifyTeeRpcIntegrity() function.
    In a real implementation, this would:
    1. Connect to the TEE endpoint
    2. Request attestation from the enclave
    3. Verify the attestation against known good values

    For hackathon demo, we return a mock attestation.
    """
    try:
        # Verify token
        is_valid, wallet = verify_tee_token(request.token)

        if not is_valid:
            return TEEVerifyResponse(valid=False, error="Invalid or expired token")

        # Generate mock integrity hash (in production, this comes from TEE)
        integrity_data = f"{TEE_VALIDATOR}:{TEE_ENDPOINT}:{int(time.time())}"
        integrity_hash = hashlib.sha256(integrity_data.encode()).hexdigest()

        # Generate mock attestation (in production, this is a real SGX/TDX attestation)
        attestation = base64.b64encode(
            f"MOCK_ATTESTATION_{wallet}_{integrity_hash[:16]}".encode()
        ).decode()

        return TEEVerifyResponse(
            valid=True, integrity_hash=integrity_hash, attestation=attestation
        )

    except Exception as e:
        return TEEVerifyResponse(valid=False, error=str(e))


@router.get("/status")
async def tee_status():
    """
    Get TEE service status and configuration.
    """
    return {
        "status": "available",
        "validator": TEE_VALIDATOR,
        "endpoint": TEE_ENDPOINT,
        "token_expiry_seconds": TOKEN_EXPIRY_SECONDS,
        "features": [
            "private_transactions",
            "encrypted_state",
            "attestation_verification",
            "gasless_operations",
        ],
    }
