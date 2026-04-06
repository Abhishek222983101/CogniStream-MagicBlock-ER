/**
 * Typed Error Handling for CogniStream
 * Provides Veil-style error types with user-friendly messages
 */

// ─── Error Code Mapping (from IDL) ────────────────────────────────────────────
export const ERROR_CODES = {
  6000: { name: "PatientIdTooLong", msg: "Patient ID exceeds maximum length of 32 characters" },
  6001: { name: "PatientAlreadyExists", msg: "Patient record already exists" },
  6002: { name: "PatientNotFound", msg: "Patient record not found" },
  6003: { name: "UnauthorizedPatientAccess", msg: "Not authorized to access this patient record" },
  6004: { name: "TrialIdTooLong", msg: "Trial ID exceeds maximum length of 20 characters" },
  6005: { name: "MatchAlreadyRecorded", msg: "Match result already recorded for this patient-trial pair" },
  6006: { name: "InvalidScore", msg: "Invalid score - must be between 0 and 10000 (basis points)" },
  6007: { name: "MatchNotFound", msg: "Match result not found" },
  6008: { name: "ConsentAlreadyLogged", msg: "Consent already logged for this patient-trial pair" },
  6009: { name: "AlreadyRevoked", msg: "Consent has already been revoked" },
  6010: { name: "InvalidConsentType", msg: "Invalid consent type - must be 0-3" },
  6011: { name: "AlreadyDelegated", msg: "Account is already delegated to Ephemeral Rollup" },
  6012: { name: "NotDelegated", msg: "Account is not delegated - cannot perform ER operation" },
  6013: { name: "InvalidValidator", msg: "Invalid validator pubkey for delegation" },
  6014: { name: "DelegationFailed", msg: "Delegation failed - see logs for details" },
  6015: { name: "UndelegationFailed", msg: "Undelegation failed - see logs for details" },
  6016: { name: "PermissionDenied", msg: "Permission denied - not a member of this permission group" },
  6017: { name: "PermissionNotFound", msg: "Permission account not found" },
  6018: { name: "InvalidPermissionFlags", msg: "Invalid permission flags" },
  6019: { name: "InvalidDataHash", msg: "Invalid data hash - must be exactly 32 bytes" },
  6020: { name: "InvalidTimestamp", msg: "Timestamp is invalid or in the future" },
  6021: { name: "ArithmeticOverflow", msg: "Arithmetic overflow occurred" },
  6022: { name: "CorruptedData", msg: "Account data is corrupted" },
} as const;

// ─── Failure Types (Veil-style) ───────────────────────────────────────────────
export type LoadPatientFailure =
  | { reason: "no_account"; patientId: string }
  | { reason: "wrong_owner"; expected: string; actual: string }
  | { reason: "decode_failed"; error: string }
  | { reason: "network_error"; error: string };

export type LoadMatchFailure =
  | { reason: "no_account"; trialId: string }
  | { reason: "patient_not_found"; patientId: string }
  | { reason: "decode_failed"; error: string }
  | { reason: "network_error"; error: string };

export type TransactionFailure =
  | { reason: "wallet_not_connected" }
  | { reason: "insufficient_funds"; required: number; available: number }
  | { reason: "program_error"; code: number; message: string }
  | { reason: "timeout"; timeoutMs: number }
  | { reason: "network_error"; error: string }
  | { reason: "user_rejected" };

// ─── Error Classes ────────────────────────────────────────────────────────────

export class CogniStreamError extends Error {
  constructor(
    public code: number,
    message: string
  ) {
    super(message);
    this.name = "CogniStreamError";
  }

  static fromCode(code: number): CogniStreamError {
    const errorInfo = ERROR_CODES[code as keyof typeof ERROR_CODES];
    if (errorInfo) {
      return new CogniStreamError(code, errorInfo.msg);
    }
    return new CogniStreamError(code, `Unknown error code: ${code}`);
  }
}

export class PatientNotFoundError extends Error {
  constructor(public patientId: string) {
    super(`Patient record not found: ${patientId}`);
    this.name = "PatientNotFoundError";
  }
}

export class DelegationError extends Error {
  constructor(
    message: string,
    public isDelegated?: boolean
  ) {
    super(message);
    this.name = "DelegationError";
  }
}

export class WalletNotConnectedError extends Error {
  constructor() {
    super("Wallet not connected. Please connect your wallet to continue.");
    this.name = "WalletNotConnectedError";
  }
}

export class InsufficientFundsError extends Error {
  constructor(
    public required: number,
    public available: number
  ) {
    super(`Insufficient funds. Required: ${required} SOL, Available: ${available} SOL`);
    this.name = "InsufficientFundsError";
  }
}

// ─── Error Parsing ────────────────────────────────────────────────────────────

/**
 * Parse a Solana/Anchor error into a user-friendly message
 */
export function parseError(error: unknown): { code?: number; message: string } {
  if (error instanceof CogniStreamError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    // Check for Anchor error pattern
    const anchorMatch = error.message.match(/Error Code: (\d+)/);
    if (anchorMatch) {
      const code = parseInt(anchorMatch[1]);
      const errorInfo = ERROR_CODES[code as keyof typeof ERROR_CODES];
      if (errorInfo) {
        return { code, message: errorInfo.msg };
      }
    }

    // Check for custom program error
    const programMatch = error.message.match(/custom program error: 0x([0-9a-fA-F]+)/);
    if (programMatch) {
      const code = parseInt(programMatch[1], 16);
      const errorInfo = ERROR_CODES[code as keyof typeof ERROR_CODES];
      if (errorInfo) {
        return { code, message: errorInfo.msg };
      }
    }

    // User rejected transaction
    if (
      error.message.includes("User rejected") ||
      error.message.includes("rejected the request")
    ) {
      return { message: "Transaction cancelled by user" };
    }

    // Timeout
    if (error.message.includes("timeout") || error.message.includes("Timeout")) {
      return { message: "Transaction timed out. Please try again." };
    }

    // Insufficient funds
    if (error.message.includes("insufficient") || error.message.includes("Insufficient")) {
      return { message: "Insufficient SOL balance for transaction" };
    }

    return { message: error.message };
  }

  return { message: "An unknown error occurred" };
}

/**
 * Get user-friendly message for an error code
 */
export function getUserMessage(code: number): string {
  const errorInfo = ERROR_CODES[code as keyof typeof ERROR_CODES];
  return errorInfo?.msg || `An error occurred (code: ${code})`;
}

/**
 * Get error message by CogniStream error code
 * Alias for getUserMessage for clarity in Toast component
 */
export type CogniStreamErrorCode = keyof typeof ERROR_CODES;

export function getErrorMessage(code: CogniStreamErrorCode): string | null {
  const errorInfo = ERROR_CODES[code];
  return errorInfo?.msg || null;
}
