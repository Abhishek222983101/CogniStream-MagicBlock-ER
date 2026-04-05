/**
 * On-Chain Patient Loading for CogniStream
 * Veil-style typed result handling
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { programReadOnly, PROGRAM_ID } from "./program";
import { derivePatientPda, deriveMatchPda, deriveConsentPda } from "./pdas";
import type { LoadPatientFailure, LoadMatchFailure } from "./errors";
import { bytesToHex } from "./format";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatientSnapshot {
  address: PublicKey;
  owner: PublicKey;
  patientId: string;
  dataHash: string;
  isDelegated: boolean;
  createdAt: Date;
  bump: number;
}

export interface MatchSnapshot {
  address: PublicKey;
  patientRecord: PublicKey;
  trialId: string;
  resultHash: string;
  scoreBps: number;
  scorePercent: number;
  isDelegated: boolean;
  matchedAt: Date;
  bump: number;
}

export interface ConsentSnapshot {
  address: PublicKey;
  patientRecord: PublicKey;
  trialId: string;
  consentType: number;
  consentedAt: Date;
  isRevoked: boolean;
  revokedAt: Date | null;
  bump: number;
}

// ─── Result Types (Veil-style) ────────────────────────────────────────────────

export type LoadPatientResult =
  | { ok: true; snapshot: PatientSnapshot }
  | { ok: false; failure: LoadPatientFailure };

export type LoadMatchResult =
  | { ok: true; snapshot: MatchSnapshot }
  | { ok: false; failure: LoadMatchFailure };

export type LoadConsentResult =
  | { ok: true; snapshot: ConsentSnapshot }
  | { ok: false; failure: { reason: string; error?: string } };

// ─── Patient Loading ──────────────────────────────────────────────────────────

/**
 * Load patient record from chain with typed result
 */
export async function loadOnchainPatient(
  connection: Connection,
  owner: PublicKey,
  patientId: string
): Promise<LoadPatientResult> {
  try {
    const [patientPda] = derivePatientPda(owner, patientId);
    const program = programReadOnly(connection);

    const account = await connection.getAccountInfo(patientPda);
    if (!account) {
      return { ok: false, failure: { reason: "no_account", patientId } };
    }

    // Decode using Anchor
    try {
      const decoded = program.coder.accounts.decode("PatientRecord", account.data);

      const snapshot: PatientSnapshot = {
        address: patientPda,
        owner: decoded.owner,
        patientId: decoded.patientId,
        dataHash: bytesToHex(decoded.dataHash),
        isDelegated: decoded.isDelegated,
        createdAt: new Date(decoded.createdAt.toNumber() * 1000),
        bump: decoded.bump,
      };

      // Verify owner matches
      if (!decoded.owner.equals(owner)) {
        return {
          ok: false,
          failure: {
            reason: "wrong_owner",
            expected: owner.toBase58(),
            actual: decoded.owner.toBase58(),
          },
        };
      }

      return { ok: true, snapshot };
    } catch (decodeError) {
      return {
        ok: false,
        failure: { reason: "decode_failed", error: String(decodeError) },
      };
    }
  } catch (error) {
    return {
      ok: false,
      failure: { reason: "network_error", error: String(error) },
    };
  }
}

/**
 * Load patient by PDA address directly
 */
export async function loadPatientByAddress(
  connection: Connection,
  patientPda: PublicKey
): Promise<LoadPatientResult> {
  try {
    const program = programReadOnly(connection);
    const account = await connection.getAccountInfo(patientPda);

    if (!account) {
      return { ok: false, failure: { reason: "no_account", patientId: patientPda.toBase58() } };
    }

    try {
      const decoded = program.coder.accounts.decode("PatientRecord", account.data);

      const snapshot: PatientSnapshot = {
        address: patientPda,
        owner: decoded.owner,
        patientId: decoded.patientId,
        dataHash: bytesToHex(decoded.dataHash),
        isDelegated: decoded.isDelegated,
        createdAt: new Date(decoded.createdAt.toNumber() * 1000),
        bump: decoded.bump,
      };

      return { ok: true, snapshot };
    } catch (decodeError) {
      return {
        ok: false,
        failure: { reason: "decode_failed", error: String(decodeError) },
      };
    }
  } catch (error) {
    return {
      ok: false,
      failure: { reason: "network_error", error: String(error) },
    };
  }
}

// ─── Match Loading ────────────────────────────────────────────────────────────

/**
 * Load match result from chain
 */
export async function loadOnchainMatch(
  connection: Connection,
  patientPda: PublicKey,
  trialId: string
): Promise<LoadMatchResult> {
  try {
    const [matchPda] = deriveMatchPda(patientPda, trialId);
    const program = programReadOnly(connection);

    const account = await connection.getAccountInfo(matchPda);
    if (!account) {
      return { ok: false, failure: { reason: "no_account", trialId } };
    }

    try {
      const decoded = program.coder.accounts.decode("MatchResult", account.data);

      const snapshot: MatchSnapshot = {
        address: matchPda,
        patientRecord: decoded.patientRecord,
        trialId: decoded.trialId,
        resultHash: bytesToHex(decoded.resultHash),
        scoreBps: decoded.scoreBps,
        scorePercent: decoded.scoreBps / 100,
        isDelegated: decoded.isDelegated,
        matchedAt: new Date(decoded.matchedAt.toNumber() * 1000),
        bump: decoded.bump,
      };

      return { ok: true, snapshot };
    } catch (decodeError) {
      return {
        ok: false,
        failure: { reason: "decode_failed", error: String(decodeError) },
      };
    }
  } catch (error) {
    return {
      ok: false,
      failure: { reason: "network_error", error: String(error) },
    };
  }
}

// ─── Consent Loading ──────────────────────────────────────────────────────────

/**
 * Load consent log from chain
 */
export async function loadOnchainConsent(
  connection: Connection,
  patientPda: PublicKey,
  trialId: string
): Promise<LoadConsentResult> {
  try {
    const [consentPda] = deriveConsentPda(patientPda, trialId);
    const program = programReadOnly(connection);

    const account = await connection.getAccountInfo(consentPda);
    if (!account) {
      return { ok: false, failure: { reason: "no_account" } };
    }

    try {
      const decoded = program.coder.accounts.decode("ConsentLog", account.data);

      const snapshot: ConsentSnapshot = {
        address: consentPda,
        patientRecord: decoded.patientRecord,
        trialId: decoded.trialId,
        consentType: Object.keys(decoded.consentType)[0] === "viewResults" ? 0 :
                     Object.keys(decoded.consentType)[0] === "contactForEnrollment" ? 1 :
                     Object.keys(decoded.consentType)[0] === "shareWithCoordinator" ? 2 : 3,
        consentedAt: new Date(decoded.consentedAt.toNumber() * 1000),
        isRevoked: decoded.isRevoked,
        revokedAt: decoded.revokedAt.toNumber() > 0 
          ? new Date(decoded.revokedAt.toNumber() * 1000) 
          : null,
        bump: decoded.bump,
      };

      return { ok: true, snapshot };
    } catch (decodeError) {
      return {
        ok: false,
        failure: { reason: "decode_failed", error: String(decodeError) },
      };
    }
  } catch (error) {
    return {
      ok: false,
      failure: { reason: "network_error", error: String(error) },
    };
  }
}

// ─── Fetch All Patients (Discovery) ───────────────────────────────────────────

/**
 * Fetch all patient records for an owner
 */
export async function fetchAllPatients(
  connection: Connection,
  owner?: PublicKey
): Promise<PatientSnapshot[]> {
  try {
    const program = programReadOnly(connection);
    
    // Get all accounts with PatientRecord discriminator
    const discriminator = Buffer.from([66, 65, 121, 175, 222, 160, 195, 11]);
    
    const filters = [
      { memcmp: { offset: 0, bytes: discriminator.toString("base64") } },
    ];

    // If owner specified, also filter by owner
    if (owner) {
      filters.push({
        memcmp: { offset: 8, bytes: owner.toBase58() },
      });
    }

    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters,
    });

    const patients: PatientSnapshot[] = [];

    for (const { pubkey, account } of accounts) {
      try {
        const decoded = program.coder.accounts.decode("PatientRecord", account.data);
        patients.push({
          address: pubkey,
          owner: decoded.owner,
          patientId: decoded.patientId,
          dataHash: bytesToHex(decoded.dataHash),
          isDelegated: decoded.isDelegated,
          createdAt: new Date(decoded.createdAt.toNumber() * 1000),
          bump: decoded.bump,
        });
      } catch {
        // Skip malformed accounts
        continue;
      }
    }

    // Sort by creation date (newest first)
    patients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return patients;
  } catch (error) {
    console.error("Failed to fetch patients:", error);
    return [];
  }
}

/**
 * Fetch all matches for a patient
 */
export async function fetchAllMatches(
  connection: Connection,
  patientPda: PublicKey
): Promise<MatchSnapshot[]> {
  try {
    const program = programReadOnly(connection);
    
    // Get all accounts with MatchResult discriminator
    const discriminator = Buffer.from([234, 166, 33, 250, 153, 92, 223, 196]);
    
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 0, bytes: discriminator.toString("base64") } },
        { memcmp: { offset: 8, bytes: patientPda.toBase58() } },
      ],
    });

    const matches: MatchSnapshot[] = [];

    for (const { pubkey, account } of accounts) {
      try {
        const decoded = program.coder.accounts.decode("MatchResult", account.data);
        matches.push({
          address: pubkey,
          patientRecord: decoded.patientRecord,
          trialId: decoded.trialId,
          resultHash: bytesToHex(decoded.resultHash),
          scoreBps: decoded.scoreBps,
          scorePercent: decoded.scoreBps / 100,
          isDelegated: decoded.isDelegated,
          matchedAt: new Date(decoded.matchedAt.toNumber() * 1000),
          bump: decoded.bump,
        });
      } catch {
        continue;
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.scoreBps - a.scoreBps);

    return matches;
  } catch (error) {
    console.error("Failed to fetch matches:", error);
    return [];
  }
}
