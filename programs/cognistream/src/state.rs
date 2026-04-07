//! CogniStream - State Accounts
//! All PDA account structures for patient records, match results, and consent logs.

use anchor_lang::prelude::*;

/// PatientRecord PDA - stores hashed patient data reference
/// Seeds: [b"patient", owner.key(), patient_id.as_bytes()]
#[account]
#[derive(Default)]
pub struct PatientRecord {
    /// Owner wallet that created this record
    pub owner: Pubkey,

    /// Unique patient identifier (e.g., "ANON_MH_0024")
    pub patient_id: String,

    /// SHA-256 hash of the anonymized patient data (stored off-chain)
    pub data_hash: [u8; 32],

    /// Whether this account is currently delegated to ER
    pub is_delegated: bool,

    /// Unix timestamp when record was created
    pub created_at: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl PatientRecord {
    // 32 (owner) + 4+32 (string) + 32 (hash) + 1 (bool) + 8 (i64) + 1 (bump) = 110
    pub const SPACE: usize = 32 + (4 + 32) + 32 + 1 + 8 + 1;
}

/// MatchResult PDA - stores ML matching results on-chain
/// Seeds: [b"match", patient_record.key(), trial_id.as_bytes()]
#[account]
#[derive(Default)]
pub struct MatchResult {
    /// Reference to the patient record PDA
    pub patient_record: Pubkey,

    /// Clinical trial ID (e.g., "NCT05374538")
    pub trial_id: String,

    /// SHA-256 hash of the full match result JSON (stored off-chain)
    pub result_hash: [u8; 32],

    /// Composite match score (0-10000, representing 0.00-100.00%)
    pub score_bps: u16,

    /// Whether this account is currently delegated to ER
    pub is_delegated: bool,

    /// Unix timestamp when match was recorded
    pub matched_at: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl MatchResult {
    // 32 (pubkey) + 4+20 (string) + 32 (hash) + 2 (u16) + 1 (bool) + 8 (i64) + 1 (bump) = 100
    pub const SPACE: usize = 32 + (4 + 20) + 32 + 2 + 1 + 8 + 1;

    /// Get score as percentage (0.00 - 100.00)
    pub fn score_percent(&self) -> f64 {
        self.score_bps as f64 / 100.0
    }
}

/// ConsentLog PDA - immutable audit trail of patient consent
/// Seeds: [b"consent", patient_record.key(), trial_id.as_bytes()]
#[account]
#[derive(Default)]
pub struct ConsentLog {
    /// Reference to the patient record PDA
    pub patient_record: Pubkey,

    /// Clinical trial ID this consent applies to
    pub trial_id: String,

    /// Type of consent granted
    pub consent_type: ConsentType,

    /// Unix timestamp when consent was logged
    pub consented_at: i64,

    /// Whether consent has been revoked
    pub is_revoked: bool,

    /// Unix timestamp when consent was revoked (0 if not revoked)
    pub revoked_at: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl ConsentLog {
    // 32 (pubkey) + 4+20 (string) + 1 (enum) + 8 (i64) + 1 (bool) + 8 (i64) + 1 (bump) = 75
    pub const SPACE: usize = 32 + (4 + 20) + 1 + 8 + 1 + 8 + 1;
}

/// Types of consent a patient can grant
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum ConsentType {
    /// Consent to view match results
    #[default]
    ViewResults,

    /// Consent to contact about trial enrollment
    ContactForEnrollment,

    /// Consent to share data with trial coordinator
    ShareWithCoordinator,

    /// Full consent for trial participation
    FullParticipation,
}

impl ConsentType {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(ConsentType::ViewResults),
            1 => Some(ConsentType::ContactForEnrollment),
            2 => Some(ConsentType::ShareWithCoordinator),
            3 => Some(ConsentType::FullParticipation),
            _ => None,
        }
    }

    pub fn to_u8(&self) -> u8 {
        match self {
            ConsentType::ViewResults => 0,
            ConsentType::ContactForEnrollment => 1,
            ConsentType::ShareWithCoordinator => 2,
            ConsentType::FullParticipation => 3,
        }
    }
}

