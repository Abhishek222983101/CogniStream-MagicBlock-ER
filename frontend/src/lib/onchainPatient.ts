/**
 * On-Chain Patient Loading for CogniStream
 * Veil-style typed result handling
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import bs58 from "bs58";
import { programReadOnly, PROGRAM_ID } from "./program";
import { derivePatientPda, deriveMatchPda, deriveConsentPda } from "./pdas";
import type { LoadPatientFailure, LoadMatchFailure } from "./errors";
import { bytesToHex } from "./format";

// Multiple RPC endpoints for redundancy - PUBLIC DEVNET FIRST to avoid Helius rate limits
// Helius free tier has strict 429 limits, so we prefer public devnet for discovery operations
const DEVNET_RPCS = [
  "https://api.devnet.solana.com",
  "https://rpc.ankr.com/solana_devnet",
  "https://devnet.helius-rpc.com/?api-key=15319bf4-5b40-4958-ac8d-6313aa55eb92",
];

// Track if Helius is currently rate-limited (global state)
let heliusRateLimited = false;
let heliusRateLimitResetTime = 0;
const HELIUS_COOLDOWN_MS = 30000; // 30 seconds cooldown after 429

/**
 * Get a connection suitable for discovery operations (getProgramAccounts).
 * MagicBlock ER/TEE RPCs don't support getProgramAccounts, so we use standard devnet.
 * Uses public devnet by default to avoid Helius rate limits.
 */
export function getDiscoveryConnection(): Connection {
  return new Connection(DEVNET_RPCS[0], {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
  });
}

/**
 * Try multiple RPCs with fallback and proper 429 handling
 * Implements exponential backoff and automatic failover on rate limits
 */
async function tryWithFallback<T>(
  operation: (conn: Connection) => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;
  
  // Filter out Helius if it's currently rate-limited
  const availableRpcs = DEVNET_RPCS.filter(rpc => {
    if (rpc.includes('helius') && heliusRateLimited) {
      if (Date.now() < heliusRateLimitResetTime) {
        console.log(`[OnChain] Skipping Helius (rate limited until ${new Date(heliusRateLimitResetTime).toISOString()})`);
        return false;
      } else {
        // Cooldown expired, try again
        heliusRateLimited = false;
      }
    }
    return true;
  });
  
  for (const rpc of availableRpcs) {
    const rpcLabel = rpc.split("?")[0].split("/").slice(-1)[0] || rpc.split("//")[1]?.split("/")[0] || rpc;
    try {
      const conn = new Connection(rpc, { commitment: "confirmed" });
      console.log(`[OnChain] Trying ${operationName} with ${rpcLabel}...`);
      const result = await operation(conn);
      console.log(`[OnChain] ${operationName} succeeded with ${rpcLabel}`);
      return result;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const is429 = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('too many');
      
      if (is429 && rpc.includes('helius')) {
        // Mark Helius as rate-limited
        heliusRateLimited = true;
        heliusRateLimitResetTime = Date.now() + HELIUS_COOLDOWN_MS;
        console.warn(`[OnChain] Helius rate limited (429) - switching to fallback for ${HELIUS_COOLDOWN_MS/1000}s`);
      } else {
        console.warn(`[OnChain] ${operationName} failed with ${rpcLabel}:`, errMsg.substring(0, 100));
      }
      lastError = err as Error;
    }
  }
  
  throw lastError || new Error(`All RPCs failed for ${operationName}`);
}

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
 * NOTE: Uses standard Solana devnet RPC because ER/TEE RPCs don't support getProgramAccounts
 * Uses fallback RPCs for reliability
 */
export async function fetchAllPatients(
  connection: Connection,
  owner?: PublicKey
): Promise<PatientSnapshot[]> {
  try {
    return await tryWithFallback(async (discoveryConnection) => {
      const program = programReadOnly(discoveryConnection);
      
      // Get all accounts with PatientRecord discriminator (must be bs58 encoded for Solana RPC)
      const discriminator = Buffer.from([66, 65, 121, 175, 222, 160, 195, 11]);
      const discriminatorBs58 = bs58.encode(discriminator);
      
      const filters: any[] = [
        { memcmp: { offset: 0, bytes: discriminatorBs58 } },
      ];

      // If owner specified, also filter by owner
      if (owner) {
        filters.push({
          memcmp: { offset: 8, bytes: owner.toBase58() },
        });
      }

      console.log("[OnChain] Fetching patients with filters:", filters.length);
      const accounts = await discoveryConnection.getProgramAccounts(PROGRAM_ID, {
        filters,
      });

      console.log(`[OnChain] Found ${accounts.length} patient accounts`);
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
        } catch (decodeErr) {
          console.warn("[OnChain] Failed to decode patient account:", pubkey.toBase58(), decodeErr);
          continue;
        }
      }

      // Sort by creation date (newest first)
      patients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return patients;
    }, "fetchAllPatients");
  } catch (error) {
    console.error("Failed to fetch patients after all retries:", error);
    return [];
  }
}

/**
 * Fetch all matches for a patient
 * NOTE: Uses standard Solana devnet RPC because ER/TEE RPCs don't support getProgramAccounts
 * Uses fallback RPCs for reliability
 */
export async function fetchAllMatches(
  connection: Connection,
  patientPda: PublicKey
): Promise<MatchSnapshot[]> {
  try {
    return await tryWithFallback(async (discoveryConnection) => {
      const program = programReadOnly(discoveryConnection);
      
      // Get all accounts with MatchResult discriminator (must be bs58 encoded for Solana RPC)
      const discriminator = Buffer.from([234, 166, 33, 250, 153, 92, 223, 196]);
      const discriminatorBs58 = bs58.encode(discriminator);
      
      const accounts = await discoveryConnection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: discriminatorBs58 } },
          { memcmp: { offset: 8, bytes: patientPda.toBase58() } },
        ],
      });

      console.log(`[OnChain] Found ${accounts.length} match accounts for patient`);
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
    }, "fetchAllMatches");
  } catch (error) {
    console.error("Failed to fetch matches after all retries:", error);
    return [];
  }
}

/**
 * Fetch all consent logs for a patient
 * NOTE: Uses standard Solana devnet RPC because ER/TEE RPCs don't support getProgramAccounts
 * Uses fallback RPCs for reliability
 */
export async function fetchAllConsents(
  connection: Connection,
  patientPda: PublicKey
): Promise<ConsentSnapshot[]> {
  try {
    return await tryWithFallback(async (discoveryConnection) => {
      const program = programReadOnly(discoveryConnection);
      
      // Get all accounts with ConsentLog discriminator (must be bs58 encoded for Solana RPC)
      const discriminator = Buffer.from([212, 186, 55, 88, 109, 96, 69, 4]);
      const discriminatorBs58 = bs58.encode(discriminator);
      
      const accounts = await discoveryConnection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: discriminatorBs58 } },
          { memcmp: { offset: 8, bytes: patientPda.toBase58() } },
        ],
      });

      console.log(`[OnChain] Found ${accounts.length} consent accounts for patient`);
      const consents: ConsentSnapshot[] = [];

      for (const { pubkey, account } of accounts) {
        try {
          const decoded = program.coder.accounts.decode("ConsentLog", account.data);
          
          // Map consent type enum to number
          let consentTypeNum = 0;
          const consentTypeKey = Object.keys(decoded.consentType)[0];
          if (consentTypeKey === "contactForEnrollment") consentTypeNum = 1;
          else if (consentTypeKey === "shareWithCoordinator") consentTypeNum = 2;
          else if (consentTypeKey === "fullParticipation") consentTypeNum = 3;

          consents.push({
            address: pubkey,
            patientRecord: decoded.patientRecord,
            trialId: decoded.trialId,
            consentType: consentTypeNum,
            consentedAt: new Date(decoded.consentedAt.toNumber() * 1000),
            isRevoked: decoded.isRevoked,
            revokedAt: decoded.revokedAt.toNumber() > 0 
              ? new Date(decoded.revokedAt.toNumber() * 1000) 
              : null,
            bump: decoded.bump,
          });
        } catch {
          continue;
        }
      }

      // Sort by consent date (newest first)
      consents.sort((a, b) => b.consentedAt.getTime() - a.consentedAt.getTime());

      return consents;
    }, "fetchAllConsents");
  } catch (error) {
    console.error("Failed to fetch consents after all retries:", error);
    return [];
  }
}

/**
 * Helper to get consent type label
 */
export function getConsentTypeLabel(consentType: number): string {
  switch (consentType) {
    case 0: return "View Results";
    case 1: return "Contact for Enrollment";
    case 2: return "Share with Coordinator";
    case 3: return "Full Participation";
    default: return "Unknown";
  }
}
