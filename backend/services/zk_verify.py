"""
ZK-TLS Proof Verification Service for CogniStream
Verifies Reclaim Protocol ZK proofs for diagnosis data provenance

This is a demonstration/mock implementation for hackathon purposes.
In production, you would integrate with Reclaim Protocol's actual verification API.
"""

import hashlib
import json
import time
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum


class VerificationStatus(Enum):
    VALID = "valid"
    INVALID = "invalid"
    EXPIRED = "expired"
    MALFORMED = "malformed"
    UNKNOWN_PROVIDER = "unknown_provider"


@dataclass
class ZKProofData:
    """Structure of a ZK proof from the frontend"""

    proof_hash: str
    provider: str
    claimed_fields: Dict[str, Any]
    signature: str
    is_valid: bool
    confidence: float


@dataclass
class VerificationResult:
    """Result of ZK proof verification"""

    status: VerificationStatus
    is_verified: bool
    message: str
    proof_hash: Optional[str] = None
    provider: Optional[str] = None
    claimed_diagnosis: Optional[str] = None
    verification_time: Optional[int] = None
    confidence: Optional[float] = None


# Supported healthcare providers (must match frontend HEALTHCARE_PROVIDERS)
SUPPORTED_PROVIDERS = {
    "APOLLO": {
        "name": "Apollo Patient Portal",
        "valid_domains": ["apollo.healthportal.in", "myhealth.apollohospitals.com"],
    },
    "AIIMS": {
        "name": "AIIMS Patient Portal",
        "valid_domains": ["aiims.portal.gov.in", "patient.aiims.edu"],
    },
    "MAX": {
        "name": "Max Healthcare Portal",
        "valid_domains": ["maxhealthcare.in", "patient.maxhealthcare.com"],
    },
    "GENERIC": {
        "name": "Medical Record Verification",
        "valid_domains": [],
    },
}

# Demo constants (match frontend)
DEMO_APP_ID = "0x8b9E85f8FfE4eCc65B0B30b70f6D2f9C7C0D9e3A"

# Proof expiration time (24 hours in milliseconds)
PROOF_EXPIRATION_MS = 24 * 60 * 60 * 1000


def sha256_hash(data: str) -> str:
    """Generate SHA-256 hash of input string"""
    return hashlib.sha256(data.encode()).hexdigest()


def verify_proof_hash_format(proof_hash: str) -> bool:
    """Validate proof hash format (0x + 64 hex chars)"""
    if not proof_hash:
        return False
    if not proof_hash.startswith("0x"):
        return False
    hex_part = proof_hash[2:]
    if len(hex_part) < 64:
        return False
    try:
        int(hex_part[:64], 16)
        return True
    except ValueError:
        return False


def verify_signature_format(signature: str) -> bool:
    """Validate signature format (0x + hex chars)"""
    if not signature:
        return False
    if not signature.startswith("0x"):
        return False
    hex_part = signature[2:]
    if len(hex_part) < 64:
        return False
    try:
        int(hex_part[:64], 16)
        return True
    except ValueError:
        return False


def verify_proof_freshness(verification_time: Optional[int]) -> bool:
    """Check if proof is within valid time window (24 hours)"""
    if verification_time is None:
        return False
    now = int(time.time() * 1000)
    age_ms = now - verification_time
    return age_ms < PROOF_EXPIRATION_MS and age_ms >= 0


def verify_provider(provider: str) -> bool:
    """Check if provider is supported"""
    return provider.upper() in SUPPORTED_PROVIDERS


def verify_zk_proof(proof_data: Dict[str, Any]) -> VerificationResult:
    """
    Verify a ZK-TLS proof from Reclaim Protocol

    In production, this would:
    1. Call Reclaim Protocol's verification API
    2. Validate the cryptographic proof
    3. Check the proof was generated from a valid healthcare portal

    For demo, we validate structure and simulate verification.

    Args:
        proof_data: Dictionary containing proof_hash, provider, claimed_fields, signature, etc.

    Returns:
        VerificationResult with status and details
    """
    try:
        # Extract fields
        proof_hash = proof_data.get("proofHash") or proof_data.get("proof_hash")
        provider = proof_data.get("provider", "")
        claimed_fields = proof_data.get("claimedFields") or proof_data.get(
            "claimed_fields", {}
        )
        signature = proof_data.get("signature", "")
        confidence = proof_data.get("confidence", 0)

        # Basic structure validation
        if not proof_hash:
            return VerificationResult(
                status=VerificationStatus.MALFORMED,
                is_verified=False,
                message="Missing proof hash",
            )

        # Validate proof hash format
        if not verify_proof_hash_format(proof_hash):
            return VerificationResult(
                status=VerificationStatus.MALFORMED,
                is_verified=False,
                message="Invalid proof hash format",
            )

        # Validate signature format
        if not verify_signature_format(signature):
            return VerificationResult(
                status=VerificationStatus.MALFORMED,
                is_verified=False,
                message="Invalid signature format",
            )

        # Validate provider
        if not verify_provider(provider):
            return VerificationResult(
                status=VerificationStatus.UNKNOWN_PROVIDER,
                is_verified=False,
                message=f"Unknown healthcare provider: {provider}",
                proof_hash=proof_hash,
            )

        # Check diagnosis is present
        diagnosis = claimed_fields.get("diagnosis")
        if not diagnosis:
            return VerificationResult(
                status=VerificationStatus.MALFORMED,
                is_verified=False,
                message="Missing diagnosis in claimed fields",
                proof_hash=proof_hash,
                provider=provider,
            )

        # Check proof freshness
        verification_time = claimed_fields.get("verificationTime")
        if not verify_proof_freshness(verification_time):
            return VerificationResult(
                status=VerificationStatus.EXPIRED,
                is_verified=False,
                message="Proof has expired (>24 hours old)",
                proof_hash=proof_hash,
                provider=provider,
                verification_time=verification_time,
            )

        # In production: Call Reclaim API to verify cryptographic proof
        # For demo: Simulate successful verification

        # Reconstruct expected signature hash for basic validation
        # This mimics what the frontend generates
        expected_sig_input = f"{proof_hash[2:]}:{DEMO_APP_ID}"
        expected_sig = sha256_hash(expected_sig_input)

        # Check if signature matches (first 128 chars of hex, with 0x prefix)
        provided_sig_hex = signature[2:130] if len(signature) > 130 else signature[2:]

        # For demo: accept any well-formed signature
        # In production: strict cryptographic verification
        is_signature_valid = len(provided_sig_hex) >= 64

        if not is_signature_valid:
            return VerificationResult(
                status=VerificationStatus.INVALID,
                is_verified=False,
                message="Invalid signature verification",
                proof_hash=proof_hash,
                provider=provider,
            )

        # All checks passed
        return VerificationResult(
            status=VerificationStatus.VALID,
            is_verified=True,
            message="ZK proof verified successfully",
            proof_hash=proof_hash,
            provider=provider,
            claimed_diagnosis=diagnosis,
            verification_time=verification_time,
            confidence=confidence,
        )

    except Exception as e:
        return VerificationResult(
            status=VerificationStatus.MALFORMED,
            is_verified=False,
            message=f"Verification error: {str(e)}",
        )


def get_provider_info(provider: str) -> Optional[Dict[str, Any]]:
    """Get information about a healthcare provider"""
    provider_upper = provider.upper()
    if provider_upper in SUPPORTED_PROVIDERS:
        return SUPPORTED_PROVIDERS[provider_upper]
    return None


def format_verification_for_display(result: VerificationResult) -> Dict[str, Any]:
    """Format verification result for API response"""
    return {
        "verified": result.is_verified,
        "status": result.status.value,
        "message": result.message,
        "details": {
            "proofHash": result.proof_hash,
            "provider": result.provider,
            "diagnosis": result.claimed_diagnosis,
            "verificationTime": result.verification_time,
            "confidence": result.confidence,
        }
        if result.is_verified
        else None,
    }


# Example usage and testing
if __name__ == "__main__":
    # Test with a mock proof
    test_proof = {
        "proofHash": "0x" + "a" * 64,
        "provider": "APOLLO",
        "claimedFields": {
            "diagnosis": "Non-Small Cell Lung Cancer",
            "diagnosisCategory": "lung_cancer",
            "patientAge": "61",
            "patientGender": "Male",
            "verificationTime": int(time.time() * 1000),
        },
        "signature": "0x" + "b" * 128,
        "isValid": True,
        "confidence": 97.5,
    }

    result = verify_zk_proof(test_proof)
    print(f"Verification Result: {result}")
    print(f"Formatted: {json.dumps(format_verification_for_display(result), indent=2)}")
