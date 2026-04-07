//! CogniStream - Constants
//! All PDA seeds, program IDs, and validator pubkeys for MagicBlock integration.

use anchor_lang::prelude::*;

// ─── PDA Seeds ───────────────────────────────────────────────────────────────
pub const PATIENT_SEED: &[u8] = b"patient";
pub const MATCH_SEED: &[u8] = b"match";
pub const CONSENT_SEED: &[u8] = b"consent";
pub const VAULT_SEED: &[u8] = b"vault";

// ─── MagicBlock Program IDs ──────────────────────────────────────────────────
/// Delegation Program - handles ER delegation/undelegation
pub const DELEGATION_PROGRAM_ID: Pubkey = pubkey!("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

/// Permission Program - handles TEE/PER access control
pub const PERMISSION_PROGRAM_ID: Pubkey = pubkey!("ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1");

// ─── Validator Pubkeys (Devnet) ──────────────────────────────────────────────
/// US Ephemeral Rollup Validator
pub const ER_VALIDATOR_US: Pubkey = pubkey!("MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd");

/// TEE (Private ER) Validator - for sensitive patient data
pub const TEE_VALIDATOR: Pubkey = pubkey!("FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA");

/// Asia ER Validator (backup)
pub const ER_VALIDATOR_ASIA: Pubkey = pubkey!("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57");

/// EU ER Validator (backup)
pub const ER_VALIDATOR_EU: Pubkey = pubkey!("MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e");

// ─── Account Sizes ───────────────────────────────────────────────────────────
/// Maximum length for patient_id string (e.g., "ANON_MH_0024")
pub const MAX_PATIENT_ID_LEN: usize = 32;

/// Maximum length for trial_id string (e.g., "NCT05374538")
pub const MAX_TRIAL_ID_LEN: usize = 20;

/// Maximum length for data hash (SHA-256 = 32 bytes)
pub const HASH_LEN: usize = 32;

/// PatientRecord account size
/// 8 (discriminator) + 32 (owner) + 4+32 (patient_id) + 32 (data_hash) + 1 (delegated) + 8 (ts) + 1 (bump)
pub const PATIENT_RECORD_SIZE: usize = 8 + 32 + (4 + MAX_PATIENT_ID_LEN) + HASH_LEN + 1 + 8 + 1;

/// MatchResult account size  
/// 8 + 32 (patient) + 4+20 (trial_id) + 32 (result_hash) + 2 (score) + 1 (delegated) + 8 (ts) + 1 (bump)
pub const MATCH_RESULT_SIZE: usize = 8 + 32 + (4 + MAX_TRIAL_ID_LEN) + HASH_LEN + 2 + 1 + 8 + 1;

/// ConsentLog account size
/// 8 + 32 (patient) + 4+20 (trial_id) + 1 (consent_type) + 8 (ts) + 1 (revoked) + 1 (bump)
pub const CONSENT_LOG_SIZE: usize = 8 + 32 + (4 + MAX_TRIAL_ID_LEN) + 1 + 8 + 1 + 1;

