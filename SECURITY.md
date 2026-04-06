# Security Model — CogniStream

This document outlines the security considerations, trust assumptions, and privacy guarantees of CogniStream's clinical trial matching platform.

---

## Trust Model

### 1. Patient Data Privacy

| Data Layer | Protection | Trust Assumption |
|------------|------------|------------------|
| **Raw Patient Data** | Never stored on-chain | User's device only |
| **Anonymized Data** | BERT NER removes PII | Backend processes ephemerally |
| **Data Hash** | SHA-256 stored on-chain | Hash is irreversible |
| **ZK Proof** | Reclaim Protocol signature | Witness nodes are honest |

### 2. On-Chain State

| Account | Contains | Privacy Level |
|---------|----------|---------------|
| `PatientRecord` | `data_hash`, `owner`, `is_delegated` | Public (but hash is opaque) |
| `MatchResult` | `trial_id`, `score_bps`, `result_hash` | Public |
| `ConsentLog` | `trial_id`, `consent_type`, `timestamp` | Public (HIPAA audit trail) |

**Key Insight**: The on-chain state contains **no PII**. The `data_hash` is a SHA-256 hash of the anonymized patient record, making it computationally infeasible to reverse.

### 3. MagicBlock TEE Mode

When TEE mode is enabled:
- Transactions are routed through `devnet-tee.magicblock.app`
- Validator runs in a Trusted Execution Environment
- Transaction data is encrypted in transit and at rest within the enclave
- Even MagicBlock operators cannot read transaction contents

**Trust Assumption**: Intel SGX/AMD SEV enclaves are secure and uncompromised.

---

## Threat Model

### Threats Mitigated

| Threat | Mitigation |
|--------|------------|
| **PII Exposure** | BERT NER anonymization + SHA-256 hashing |
| **Replay Attacks** | Solana's blockhash expiration + PDA uniqueness |
| **Consent Forgery** | Wallet signature required for all consent logs |
| **Front-running** | MagicBlock ER mempool is private |
| **Data Tampering** | Immutable on-chain state |

### Threats NOT Mitigated (Out of Scope)

| Threat | Status |
|--------|--------|
| **Compromised User Device** | Out of scope (user responsibility) |
| **Malicious Wallet Extension** | Out of scope (use trusted wallets) |
| **Backend Server Compromise** | Partially mitigated (data is ephemeral) |
| **ML Model Poisoning** | Out of scope (models are pre-trained) |

---

## Reclaim Protocol ZK Verification

### What We Prove

```
ZK Proof guarantees:
1. Patient data was fetched from `api.apollo.com` (or configured provider)
2. The TLS certificate chain is valid
3. The data was fetched within the last N minutes (freshness)
4. The data matches the extracted parameters shown to the user
```

### What We DON'T Prove

- That the patient is who they claim to be (requires KYC)
- That the medical data is accurate (depends on provider)
- That the patient hasn't modified their portal data

### Witness Network

Reclaim uses a network of witness nodes to co-sign proofs. We trust that:
- At least one witness is honest
- The witness protocol implementation is correct

---

## Solana Program Security

### Access Control

| Instruction | Who Can Call | Constraint |
|-------------|--------------|------------|
| `init_patient` | Any wallet | Creates new PDA (fails if exists) |
| `delegate_patient` | `owner` only | `has_one = owner` check |
| `record_match` | `authority` (signer) | Patient PDA must exist |
| `log_consent` | `authority` (signer) | Patient PDA must exist |
| `revoke_consent` | `owner` only | `has_one = owner` check |

### PDA Collision Resistance

```rust
// Patient PDA
seeds = [b"patient", owner.key().as_ref(), patient_id.as_bytes()]

// Match PDA
seeds = [b"match", patient_pda.key().as_ref(), trial_id.as_bytes()]

// Consent PDA
seeds = [b"consent", patient_pda.key().as_ref(), trial_id.as_bytes()]
```

Each PDA is uniquely derived from:
- A constant seed prefix
- The owner's public key
- User-provided identifiers (patient_id, trial_id)

**Collision Risk**: Negligible (SHA-256 + ed25519)

### Reentrancy

Anchor's account model prevents reentrancy by design. All account borrows are checked at instruction start.

---

## Production Checklist

Before deploying to mainnet:

- [ ] **Audit**: Professional security audit of Anchor program
- [ ] **Rate Limiting**: Add rate limits to backend API
- [ ] **HTTPS Only**: Enforce HTTPS for all endpoints
- [ ] **Key Management**: Use HSM for production keypairs
- [ ] **Monitoring**: Set up on-chain monitoring for suspicious patterns
- [ ] **Bug Bounty**: Establish bug bounty program
- [ ] **HIPAA Compliance**: Full HIPAA compliance review
- [ ] **Data Retention**: Implement data retention policies
- [ ] **Incident Response**: Document incident response procedures

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email: abhishekrahul1445@gmail.com
3. Include: Description, reproduction steps, impact assessment
4. We will respond within 48 hours

---

## Disclaimer

This software is provided "as is" for hackathon demonstration purposes. It has not been audited for production use. Do not use with real patient data without proper compliance review.
