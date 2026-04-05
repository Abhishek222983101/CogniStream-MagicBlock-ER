/**
 * Ephemeral Rollups Client for CogniStream
 * Full transaction client for ER delegation and gasless operations
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { Program, BN, Wallet } from "@coral-xyz/anchor";
import { programFor, programWithWalletAdapter, PROGRAM_ID, CogniStreamIDL } from "./program";
import {
  derivePatientPda,
  deriveMatchPda,
  deriveConsentPda,
  deriveDelegationBufferPda,
  deriveDelegationRecordPda,
  DELEGATION_PROGRAM_ID,
} from "./pdas";
import { sha256 } from "./hash";
import { parseError, CogniStreamError } from "./errors";
import { ENDPOINTS, VALIDATORS } from "../components/WalletProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  timing?: {
    startMs: number;
    endMs: number;
    durationMs: number;
  };
}

export interface InitPatientParams {
  patientId: string;
  dataHash: Uint8Array | number[];
}

export interface DelegatePatientParams {
  patientId: string;
  validator?: PublicKey;
  useTee?: boolean;
}

export interface RecordMatchParams {
  patientId: string;
  trialId: string;
  resultHash: Uint8Array | number[];
  scoreBps: number;
}

export interface LogConsentParams {
  patientId: string;
  trialId: string;
  consentType: number; // 0-3
}

// Wallet interface compatible with wallet-adapter
export interface ERWallet {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
}

// ─── ER Client Class ──────────────────────────────────────────────────────────

export class ERClient {
  private connection: Connection;
  private erConnection: Connection;
  private teeConnection: Connection;
  private wallet: ERWallet;
  private program: any; // Use any to avoid IDL type issues

  constructor(
    connection: Connection,
    wallet: ERWallet
  ) {
    this.connection = connection;
    this.wallet = wallet;

    // Create connections to different endpoints
    this.erConnection = new Connection(ENDPOINTS.ER, {
      commitment: "confirmed",
      wsEndpoint: ENDPOINTS.ER_WS,
    });
    this.teeConnection = new Connection(ENDPOINTS.TEE, {
      commitment: "confirmed",
      wsEndpoint: ENDPOINTS.TEE_WS,
    });

    // Create program instance - may fail if IDL has type issues, but we handle it
    try {
      this.program = programWithWalletAdapter(connection, wallet as any);
    } catch (e) {
      console.warn("Failed to create program instance:", e);
      this.program = null;
    }
  }

  // ─── Patient Operations ──────────────────────────────────────────────────

  /**
   * Initialize a new patient record on L1
   * Returns success if patient already exists (idempotent)
   */
  async initPatient(params: InitPatientParams): Promise<TransactionResult> {
    const startMs = Date.now();

    if (!this.program) {
      return {
        success: false,
        error: "Program not initialized",
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }

    try {
      const [patientPda] = derivePatientPda(this.wallet.publicKey, params.patientId);

      // First, check if patient already exists
      const existingAccount = await this.connection.getAccountInfo(patientPda);
      if (existingAccount) {
        console.log("[ER] Patient already exists, skipping init");
        return {
          success: true, // Return success if already exists (idempotent)
          signature: "existing-account",
          timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
        };
      }

      // Convert hash to array if needed
      const dataHash = Array.isArray(params.dataHash)
        ? params.dataHash
        : Array.from(params.dataHash);

      const tx = await this.program.methods
        .initPatient(params.patientId, dataHash as number[])
        .accounts({
          owner: this.wallet.publicKey,
          patientRecord: patientPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await this.sendTransaction(tx, this.connection);
      const endMs = Date.now();

      return {
        success: true,
        signature,
        timing: { startMs, endMs, durationMs: endMs - startMs },
      };
    } catch (error: any) {
      // Check if error is "account already exists" - treat as success
      if (error.message?.includes("already in use") || 
          error.message?.includes("already exists") ||
          error.message?.includes("0x0")) { // Account already initialized
        console.log("[ER] Patient init failed but account may exist:", error.message);
        return {
          success: true,
          signature: "account-exists",
          timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
        };
      }

      const parsed = parseError(error);
      return {
        success: false,
        error: parsed.message,
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }
  }

  /**
   * Delegate patient to Ephemeral Rollup (or TEE)
   * Returns success if already delegated (idempotent)
   */
  async delegatePatient(params: DelegatePatientParams): Promise<TransactionResult> {
    const startMs = Date.now();

    if (!this.program) {
      return {
        success: false,
        error: "Program not initialized",
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }

    try {
      const [patientPda] = derivePatientPda(this.wallet.publicKey, params.patientId);
      
      // Check if already delegated
      const isDelegated = await this.isPatientDelegated(params.patientId);
      if (isDelegated) {
        console.log("[ER] Patient already delegated, skipping delegation");
        return {
          success: true,
          signature: "already-delegated",
          timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
        };
      }

      const [delegationBuffer] = deriveDelegationBufferPda(patientPda);
      const [delegationRecord] = deriveDelegationRecordPda(patientPda);

      // Select validator
      const validator = params.useTee
        ? new PublicKey(VALIDATORS.TEE)
        : params.validator || new PublicKey(VALIDATORS.ER_US);

      const tx = await this.program.methods
        .delegatePatient()
        .accounts({
          payer: this.wallet.publicKey,
          owner: this.wallet.publicKey,
          patientRecord: patientPda,
          validator: validator,
          delegationBuffer,
          delegationRecord,
          delegationProgram: DELEGATION_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await this.sendTransaction(tx, this.connection);
      const endMs = Date.now();

      return {
        success: true,
        signature,
        timing: { startMs, endMs, durationMs: endMs - startMs },
      };
    } catch (error: any) {
      // Check if already delegated error
      if (error.message?.includes("already delegated") || 
          error.message?.includes("AlreadyDelegated")) {
        console.log("[ER] Delegation skipped - already delegated");
        return {
          success: true,
          signature: "already-delegated",
          timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
        };
      }

      const parsed = parseError(error);
      return {
        success: false,
        error: parsed.message,
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }
  }

  /**
   * Undelegate patient from ER (return to L1)
   */
  async undelegatePatient(patientId: string): Promise<TransactionResult> {
    const startMs = Date.now();

    if (!this.program) {
      return {
        success: false,
        error: "Program not initialized",
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }

    try {
      const [patientPda] = derivePatientPda(this.wallet.publicKey, patientId);

      const tx = await this.program.methods
        .undelegatePatient()
        .accounts({
          owner: this.wallet.publicKey,
          patientRecord: patientPda,
        })
        .transaction();

      // Send to ER connection for undelegation
      const signature = await this.sendTransaction(tx, this.erConnection);
      const endMs = Date.now();

      return {
        success: true,
        signature,
        timing: { startMs, endMs, durationMs: endMs - startMs },
      };
    } catch (error) {
      const parsed = parseError(error);
      return {
        success: false,
        error: parsed.message,
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }
  }

  // ─── Match Operations (Gasless on ER) ────────────────────────────────────

  /**
   * Record match result (GASLESS when delegated!)
   */
  async recordMatch(
    params: RecordMatchParams,
    isDelegated: boolean = false
  ): Promise<TransactionResult> {
    const startMs = Date.now();

    if (!this.program) {
      return {
        success: false,
        error: "Program not initialized",
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }

    try {
      const [patientPda] = derivePatientPda(this.wallet.publicKey, params.patientId);
      const [matchPda] = deriveMatchPda(patientPda, params.trialId);

      // Convert hash to array if needed
      const resultHash = Array.isArray(params.resultHash)
        ? params.resultHash
        : Array.from(params.resultHash);

      const tx = await this.program.methods
        .recordMatch(params.trialId, resultHash as number[], params.scoreBps)
        .accounts({
          authority: this.wallet.publicKey,
          patientRecord: patientPda,
          matchResult: matchPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Use ER connection if delegated (GASLESS!)
      const conn = isDelegated ? this.erConnection : this.connection;
      const signature = await this.sendTransaction(tx, conn);
      const endMs = Date.now();

      return {
        success: true,
        signature,
        timing: { startMs, endMs, durationMs: endMs - startMs },
      };
    } catch (error) {
      const parsed = parseError(error);
      return {
        success: false,
        error: parsed.message,
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }
  }

  // ─── Consent Operations ──────────────────────────────────────────────────

  /**
   * Log consent (GASLESS when delegated!)
   */
  async logConsent(
    params: LogConsentParams,
    isDelegated: boolean = false
  ): Promise<TransactionResult> {
    const startMs = Date.now();

    if (!this.program) {
      return {
        success: false,
        error: "Program not initialized",
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }

    try {
      const [patientPda] = derivePatientPda(this.wallet.publicKey, params.patientId);
      const [consentPda] = deriveConsentPda(patientPda, params.trialId);

      const tx = await this.program.methods
        .logConsent(params.trialId, params.consentType)
        .accounts({
          authority: this.wallet.publicKey,
          patientRecord: patientPda,
          consentLog: consentPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Use ER connection if delegated (GASLESS!)
      const conn = isDelegated ? this.erConnection : this.connection;
      const signature = await this.sendTransaction(tx, conn);
      const endMs = Date.now();

      return {
        success: true,
        signature,
        timing: { startMs, endMs, durationMs: endMs - startMs },
      };
    } catch (error) {
      const parsed = parseError(error);
      return {
        success: false,
        error: parsed.message,
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }
  }

  /**
   * Revoke consent
   */
  async revokeConsent(
    patientId: string,
    trialId: string
  ): Promise<TransactionResult> {
    const startMs = Date.now();

    if (!this.program) {
      return {
        success: false,
        error: "Program not initialized",
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }

    try {
      const [patientPda] = derivePatientPda(this.wallet.publicKey, patientId);
      const [consentPda] = deriveConsentPda(patientPda, trialId);

      const tx = await this.program.methods
        .revokeConsent()
        .accounts({
          owner: this.wallet.publicKey,
          patientRecord: patientPda,
          consentLog: consentPda,
        })
        .transaction();

      const signature = await this.sendTransaction(tx, this.connection);
      const endMs = Date.now();

      return {
        success: true,
        signature,
        timing: { startMs, endMs, durationMs: endMs - startMs },
      };
    } catch (error) {
      const parsed = parseError(error);
      return {
        success: false,
        error: parsed.message,
        timing: { startMs, endMs: Date.now(), durationMs: Date.now() - startMs },
      };
    }
  }

  // ─── Transaction Helpers ─────────────────────────────────────────────────

  private async sendTransaction(
    tx: Transaction,
    connection: Connection,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Get FRESH blockhash right before sending (critical for avoiding "Blockhash not found")
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({
          commitment: "finalized", // Use finalized for more stable blockhash
        });

        // Create a new transaction with fresh blockhash
        tx.recentBlockhash = blockhash;
        tx.feePayer = this.wallet.publicKey;

        // Sign transaction (this triggers Phantom popup)
        const signedTx = await this.wallet.signTransaction(tx);

        // Send with skipPreflight to avoid simulation issues
        // The simulation can fail due to timing, but the actual transaction often succeeds
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true, // Skip preflight to avoid blockhash timing issues
          maxRetries: 3,
          preflightCommitment: "confirmed",
        });

        console.log(`[ER] Transaction sent (attempt ${attempt}): ${signature}`);

        // Wait for confirmation with a reasonable timeout
        const confirmation = await connection.confirmTransaction(
          { 
            signature, 
            blockhash, 
            lastValidBlockHeight 
          },
          "confirmed"
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log(`[ER] Transaction confirmed: ${signature}`);
        return signature;

      } catch (error: any) {
        lastError = error;
        console.warn(`[ER] Transaction attempt ${attempt} failed:`, error.message);

        // If it's not a blockhash error, don't retry
        if (!error.message?.includes("Blockhash not found") && 
            !error.message?.includes("block height exceeded") &&
            attempt > 1) {
          break;
        }

        // Wait a bit before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    }

    throw lastError || new Error("Transaction failed after all retries");
  }

  // ─── Utility Methods ─────────────────────────────────────────────────────

  /**
   * Get PDAs for a patient
   */
  getPatientPdas(patientId: string) {
    const [patientPda, patientBump] = derivePatientPda(this.wallet.publicKey, patientId);
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
   * Check if patient is delegated
   */
  async isPatientDelegated(patientId: string): Promise<boolean> {
    try {
      const [patientPda] = derivePatientPda(this.wallet.publicKey, patientId);
      const accountInfo = await this.connection.getAccountInfo(patientPda);

      if (!accountInfo) return false;

      // Check if owned by delegation program
      return accountInfo.owner.equals(DELEGATION_PROGRAM_ID);
    } catch {
      return false;
    }
  }

  /**
   * Get balance
   */
  async getBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / 1e9; // Convert lamports to SOL
  }
}

// ─── Factory Function ─────────────────────────────────────────────────────────

/**
 * Create an ERClient instance
 */
export function createERClient(
  connection: Connection,
  wallet: ERWallet
): ERClient {
  return new ERClient(connection, wallet);
}
