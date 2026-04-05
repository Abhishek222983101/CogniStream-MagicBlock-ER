/**
 * PDA Derivation Helpers for CogniStream
 * Provides type-safe PDA derivation matching the on-chain program
 */

import { PublicKey } from "@solana/web3.js";

// Program ID - deployed on devnet
export const PROGRAM_ID = new PublicKey("3YUtpqBtoJshnq7zWviWFrdWc82pgiDLM9wjfFujGMEg");

// MagicBlock Delegation Program
export const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

// PDA Seeds (must match on-chain constants)
export const PATIENT_SEED = Buffer.from("patient");
export const MATCH_SEED = Buffer.from("match");
export const CONSENT_SEED = Buffer.from("consent");

/**
 * Derive PatientRecord PDA
 * Seeds: [b"patient", owner.key(), patient_id.as_bytes()]
 */
export function derivePatientPda(
  owner: PublicKey,
  patientId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PATIENT_SEED, owner.toBuffer(), Buffer.from(patientId)],
    PROGRAM_ID
  );
}

/**
 * Derive MatchResult PDA
 * Seeds: [b"match", patient_record.key(), trial_id.as_bytes()]
 */
export function deriveMatchPda(
  patientRecord: PublicKey,
  trialId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MATCH_SEED, patientRecord.toBuffer(), Buffer.from(trialId)],
    PROGRAM_ID
  );
}

/**
 * Derive ConsentLog PDA
 * Seeds: [b"consent", patient_record.key(), trial_id.as_bytes()]
 */
export function deriveConsentPda(
  patientRecord: PublicKey,
  trialId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CONSENT_SEED, patientRecord.toBuffer(), Buffer.from(trialId)],
    PROGRAM_ID
  );
}

/**
 * Derive Delegation Buffer PDA (from MagicBlock Delegation Program)
 */
export function deriveDelegationBufferPda(
  delegatedAccount: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("buffer"), delegatedAccount.toBuffer()],
    DELEGATION_PROGRAM_ID
  );
}

/**
 * Derive Delegation Record PDA (from MagicBlock Delegation Program)
 */
export function deriveDelegationRecordPda(
  delegatedAccount: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), delegatedAccount.toBuffer()],
    DELEGATION_PROGRAM_ID
  );
}

/**
 * Get all PDAs for a patient in one call
 */
export function getPatientPdas(owner: PublicKey, patientId: string) {
  const [patientPda, patientBump] = derivePatientPda(owner, patientId);
  const [delegationBuffer] = deriveDelegationBufferPda(patientPda);
  const [delegationRecord] = deriveDelegationRecordPda(patientPda);

  return {
    patientPda,
    patientBump,
    delegationBuffer,
    delegationRecord,
  };
}

/**
 * Get all PDAs for a match in one call
 */
export function getMatchPdas(
  owner: PublicKey,
  patientId: string,
  trialId: string
) {
  const [patientPda] = derivePatientPda(owner, patientId);
  const [matchPda, matchBump] = deriveMatchPda(patientPda, trialId);

  return {
    patientPda,
    matchPda,
    matchBump,
  };
}

/**
 * Get all PDAs for consent in one call
 */
export function getConsentPdas(
  owner: PublicKey,
  patientId: string,
  trialId: string
) {
  const [patientPda] = derivePatientPda(owner, patientId);
  const [consentPda, consentBump] = deriveConsentPda(patientPda, trialId);

  return {
    patientPda,
    consentPda,
    consentBump,
  };
}
