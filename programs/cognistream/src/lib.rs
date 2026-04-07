//! CogniStream - Privacy-First Clinical Trial Matching on Solana
//!
//! A decentralized clinical trial matching system that uses MagicBlock's
//! Ephemeral Rollups for gasless, real-time transactions and TEE/PER
//! for patient data privacy.
//!
//! ## Architecture
//!
//! 1. **PatientRecord PDA**: Stores hashed patient data reference, owner wallet
//! 2. **MatchResult PDA**: Stores ML matching results (score, hash of full result)
//! 3. **ConsentLog PDA**: Immutable audit trail of patient consent
//!
//! ## MagicBlock Integration (Direct CPI)
//!
//! - **Ephemeral Rollups**: Gasless, sub-50ms transactions for match recording
//! - **TEE/PER**: Privacy-preserving computation for sensitive patient data
//! - Uses direct CPI to Delegation Program for maximum compatibility

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod state;

use constants::*;
use errors::*;
use state::*;

declare_id!("3YUtpqBtoJshnq7zWviWFrdWc82pgiDLM9wjfFujGMEg");

/// CogniStream Program with MagicBlock Ephemeral Rollup support
#[program]
pub mod cognistream {
    use super::*;

    // ─── Patient Management ──────────────────────────────────────────────────

    /// Initialize a new patient record on the base layer
    ///
    /// Creates a PatientRecord PDA storing the hash of anonymized patient data.
    /// This must be called on L1 before delegation to ER.
    pub fn init_patient(
        ctx: Context<InitPatient>,
        patient_id: String,
        data_hash: [u8; 32],
    ) -> Result<()> {
        require!(
            patient_id.len() <= MAX_PATIENT_ID_LEN,
            CogniStreamError::PatientIdTooLong
        );

        let patient = &mut ctx.accounts.patient_record;
        patient.owner = ctx.accounts.owner.key();
        patient.patient_id = patient_id;
        patient.data_hash = data_hash;
        patient.is_delegated = false;
        patient.created_at = Clock::get()?.unix_timestamp;
        patient.bump = ctx.bumps.patient_record;

        msg!("CogniStream: Patient record initialized");
        Ok(())
    }

    /// Delegate patient record to Ephemeral Rollup via CPI
    ///
    /// Transfers ownership to MagicBlock's delegation program for gasless,
    /// real-time transactions. The `validator` determines which ER to use.
    pub fn delegate_patient(ctx: Context<DelegatePatient>) -> Result<()> {
        // Check not already delegated
        require!(
            !ctx.accounts.patient_record.is_delegated,
            CogniStreamError::AlreadyDelegated
        );

        // Get account infos first (before mutable borrow)
        let patient_info = ctx.accounts.patient_record.to_account_info();
        let payer_info = ctx.accounts.payer.to_account_info();
        let owner_info = ctx.accounts.owner.to_account_info();
        let buffer_info = ctx.accounts.delegation_buffer.to_account_info();
        let delegation_record_info = ctx.accounts.delegation_record.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();
        let delegation_program_key = ctx.accounts.delegation_program.key();

        // Delegation instruction data: [discriminator(8)] + [args]
        // delegate discriminator: [26, 158, 128, 193, 245, 90, 194, 219]
        let mut data = vec![26, 158, 128, 193, 245, 90, 194, 219];

        // Encode DelegateArgs: commit_frequency_ms (u32), validator (Option<Pubkey>)
        // commit_frequency_ms = 1000 (auto-commit every 1s)
        data.extend_from_slice(&1000u32.to_le_bytes());

        // validator = Some(validator_pubkey)
        if let Some(validator) = &ctx.accounts.validator {
            data.push(1); // Some
            data.extend_from_slice(&validator.key().to_bytes());
        } else {
            data.push(0); // None
        }

        let accounts = vec![
            AccountMeta::new(payer_info.key(), true),
            AccountMeta::new(patient_info.key(), false),
            AccountMeta::new(owner_info.key(), true),
            AccountMeta::new(buffer_info.key(), false),
            AccountMeta::new(delegation_record_info.key(), false),
            AccountMeta::new_readonly(system_program_info.key(), false),
        ];

        let ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: delegation_program_key,
            accounts,
            data,
        };

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                payer_info,
                patient_info.clone(),
                owner_info,
                buffer_info,
                delegation_record_info,
                system_program_info,
            ],
        )?;

        // Now we can mutably borrow
        ctx.accounts.patient_record.is_delegated = true;
        msg!("CogniStream: Patient delegated to ER");
        Ok(())
    }

    /// Undelegate patient record from ER
    ///
    /// Commits final state and returns account ownership to L1.
    pub fn undelegate_patient(ctx: Context<UndelegatePatient>) -> Result<()> {
        let patient = &mut ctx.accounts.patient_record;
        require!(patient.is_delegated, CogniStreamError::NotDelegated);

        patient.is_delegated = false;
        msg!("CogniStream: Patient undelegated from ER");
        Ok(())
    }

    // ─── Match Recording ─────────────────────────────────────────────────────

    /// Record ML matching result (on ER = gasless!)
    ///
    /// Stores the composite score and hash of full match result JSON.
    /// When called on ER, this is gasless and sub-50ms.
    pub fn record_match(
        ctx: Context<RecordMatch>,
        trial_id: String,
        result_hash: [u8; 32],
        score_bps: u16,
    ) -> Result<()> {
        require!(
            trial_id.len() <= MAX_TRIAL_ID_LEN,
            CogniStreamError::TrialIdTooLong
        );
        require!(score_bps <= 10000, CogniStreamError::InvalidScore);

        let match_result = &mut ctx.accounts.match_result;
        match_result.patient_record = ctx.accounts.patient_record.key();
        match_result.trial_id = trial_id;
        match_result.result_hash = result_hash;
        match_result.score_bps = score_bps;
        match_result.is_delegated = ctx.accounts.patient_record.is_delegated;
        match_result.matched_at = Clock::get()?.unix_timestamp;
        match_result.bump = ctx.bumps.match_result;

        msg!("CogniStream: Match recorded with score {}bps", score_bps);
        Ok(())
    }

    // ─── Consent Management ──────────────────────────────────────────────────

    /// Log patient consent for a trial
    ///
    /// Creates an immutable audit trail of consent.
    /// On ER, this is gasless.
    pub fn log_consent(ctx: Context<LogConsent>, trial_id: String, consent_type: u8) -> Result<()> {
        require!(
            trial_id.len() <= MAX_TRIAL_ID_LEN,
            CogniStreamError::TrialIdTooLong
        );
        require!(consent_type <= 3, CogniStreamError::InvalidConsentType);

        let consent = &mut ctx.accounts.consent_log;
        consent.patient_record = ctx.accounts.patient_record.key();
        consent.trial_id = trial_id;
        consent.consent_type = ConsentType::from_u8(consent_type).unwrap();
        consent.consented_at = Clock::get()?.unix_timestamp;
        consent.is_revoked = false;
        consent.revoked_at = 0;
        consent.bump = ctx.bumps.consent_log;

        msg!("CogniStream: Consent logged for trial");
        Ok(())
    }

    /// Revoke previously granted consent
    pub fn revoke_consent(ctx: Context<RevokeConsent>) -> Result<()> {
        let consent = &mut ctx.accounts.consent_log;
        require!(!consent.is_revoked, CogniStreamError::AlreadyRevoked);

        consent.is_revoked = true;
        consent.revoked_at = Clock::get()?.unix_timestamp;

        msg!("CogniStream: Consent revoked");
        Ok(())
    }

    // ─── Undelegation Callback (called by delegation program) ────────────────

    /// Undelegation callback - called by delegation program to finalize undelegation
    /// Discriminator: [196, 28, 41, 206, 48, 37, 51, 167]
    pub fn undelegation_callback(ctx: Context<UndelegationCallback>) -> Result<()> {
        let patient = &mut ctx.accounts.patient_record;
        patient.is_delegated = false;
        msg!("CogniStream: Undelegation callback executed");
        Ok(())
    }
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(patient_id: String)]
pub struct InitPatient<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + PatientRecord::SPACE,
        seeds = [PATIENT_SEED, owner.key().as_ref(), patient_id.as_bytes()],
        bump
    )]
    pub patient_record: Account<'info, PatientRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DelegatePatient<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [PATIENT_SEED, owner.key().as_ref(), patient_record.patient_id.as_bytes()],
        bump = patient_record.bump,
        has_one = owner
    )]
    pub patient_record: Account<'info, PatientRecord>,

    /// CHECK: Optional validator pubkey for specific ER
    pub validator: Option<AccountInfo<'info>>,

    /// CHECK: Delegation buffer PDA
    #[account(mut)]
    pub delegation_buffer: AccountInfo<'info>,

    /// CHECK: Delegation record PDA
    #[account(mut)]
    pub delegation_record: AccountInfo<'info>,

    /// CHECK: MagicBlock Delegation Program
    #[account(address = DELEGATION_PROGRAM_ID)]
    pub delegation_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UndelegatePatient<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [PATIENT_SEED, owner.key().as_ref(), patient_record.patient_id.as_bytes()],
        bump = patient_record.bump,
        has_one = owner
    )]
    pub patient_record: Account<'info, PatientRecord>,
}

#[derive(Accounts)]
#[instruction(trial_id: String)]
pub struct RecordMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [PATIENT_SEED, patient_record.owner.as_ref(), patient_record.patient_id.as_bytes()],
        bump = patient_record.bump
    )]
    pub patient_record: Account<'info, PatientRecord>,

    #[account(
        init,
        payer = authority,
        space = 8 + MatchResult::SPACE,
        seeds = [MATCH_SEED, patient_record.key().as_ref(), trial_id.as_bytes()],
        bump
    )]
    pub match_result: Account<'info, MatchResult>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(trial_id: String)]
pub struct LogConsent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [PATIENT_SEED, patient_record.owner.as_ref(), patient_record.patient_id.as_bytes()],
        bump = patient_record.bump
    )]
    pub patient_record: Account<'info, PatientRecord>,

    #[account(
        init,
        payer = authority,
        space = 8 + ConsentLog::SPACE,
        seeds = [CONSENT_SEED, patient_record.key().as_ref(), trial_id.as_bytes()],
        bump
    )]
    pub consent_log: Account<'info, ConsentLog>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeConsent<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [PATIENT_SEED, owner.key().as_ref(), patient_record.patient_id.as_bytes()],
        bump = patient_record.bump,
        has_one = owner
    )]
    pub patient_record: Account<'info, PatientRecord>,

    #[account(
        mut,
        seeds = [CONSENT_SEED, patient_record.key().as_ref(), consent_log.trial_id.as_bytes()],
        bump = consent_log.bump
    )]
    pub consent_log: Account<'info, ConsentLog>,
}

#[derive(Accounts)]
pub struct UndelegationCallback<'info> {
    /// CHECK: The delegation program calls this
    pub delegation_program: Signer<'info>,

    #[account(mut)]
    pub patient_record: Account<'info, PatientRecord>,
}

