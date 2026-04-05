//! CogniStream - Custom Errors
//! All error codes for the CogniStream program.

use anchor_lang::prelude::*;

#[error_code]
pub enum CogniStreamError {
    // ─── Patient Errors ──────────────────────────────────────────────────────
    #[msg("Patient ID exceeds maximum length of 32 characters")]
    PatientIdTooLong,

    #[msg("Patient record already exists")]
    PatientAlreadyExists,

    #[msg("Patient record not found")]
    PatientNotFound,

    #[msg("Not authorized to access this patient record")]
    UnauthorizedPatientAccess,

    // ─── Match Errors ────────────────────────────────────────────────────────
    #[msg("Trial ID exceeds maximum length of 20 characters")]
    TrialIdTooLong,

    #[msg("Match result already recorded for this patient-trial pair")]
    MatchAlreadyRecorded,

    #[msg("Invalid score - must be between 0 and 10000 (basis points)")]
    InvalidScore,

    #[msg("Match result not found")]
    MatchNotFound,

    // ─── Consent Errors ──────────────────────────────────────────────────────
    #[msg("Consent already logged for this patient-trial pair")]
    ConsentAlreadyLogged,

    #[msg("Consent has already been revoked")]
    AlreadyRevoked,

    #[msg("Invalid consent type - must be 0-3")]
    InvalidConsentType,

    // ─── Delegation Errors ───────────────────────────────────────────────────
    #[msg("Account is already delegated to Ephemeral Rollup")]
    AlreadyDelegated,

    #[msg("Account is not delegated - cannot perform ER operation")]
    NotDelegated,

    #[msg("Invalid validator pubkey for delegation")]
    InvalidValidator,

    #[msg("Delegation failed - see logs for details")]
    DelegationFailed,

    #[msg("Undelegation failed - see logs for details")]
    UndelegationFailed,

    // ─── Permission Errors ───────────────────────────────────────────────────
    #[msg("Permission denied - not a member of this permission group")]
    PermissionDenied,

    #[msg("Permission account not found")]
    PermissionNotFound,

    #[msg("Invalid permission flags")]
    InvalidPermissionFlags,

    // ─── General Errors ──────────────────────────────────────────────────────
    #[msg("Invalid data hash - must be exactly 32 bytes")]
    InvalidDataHash,

    #[msg("Timestamp is invalid or in the future")]
    InvalidTimestamp,

    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,

    #[msg("Account data is corrupted")]
    CorruptedData,
}
