/**
 * SHA-256 Hashing utilities for CogniStream
 * Used to hash patient data and match results before storing on-chain.
 */

/**
 * Compute SHA-256 hash of any object or string
 * Returns a Uint8Array of 32 bytes
 */
export async function sha256(data: unknown): Promise<Uint8Array> {
  let str: string;

  if (typeof data === "string") {
    str = data;
  } else {
    // Serialize objects to canonical JSON
    str = JSON.stringify(data, Object.keys(data as object).sort());
  }

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Compute SHA-256 hash and return as hex string
 */
export async function sha256Hex(data: unknown): Promise<string> {
  const hash = await sha256(data);
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash anonymized patient data for on-chain storage
 * Uses a canonical format to ensure consistent hashing
 */
export async function hashPatientData(patientData: Record<string, unknown>): Promise<Uint8Array> {
  // Extract only the fields we want to hash (exclude PII)
  const dataToHash = {
    patient_id: patientData.patient_id,
    demographics: {
      age: (patientData.demographics as Record<string, unknown>)?.age,
      gender: (patientData.demographics as Record<string, unknown>)?.gender,
      // Exclude name, exact location
    },
    diagnosis: patientData.diagnosis,
    medical_history: patientData.medical_history,
    medications: patientData.medications,
    lab_values: patientData.lab_values,
    ecog_status: patientData.ecog_status,
    smoking_status: patientData.smoking_status,
    // Hash timestamp for uniqueness
    hash_timestamp: Date.now(),
  };

  return sha256(dataToHash);
}

/**
 * Hash match result for on-chain storage
 */
export async function hashMatchResult(matchResult: {
  patient_id: string;
  trial_id: string;
  composite_score: number;
  score_breakdown: Record<string, number> | unknown;
  criteria_results: unknown[];
}): Promise<Uint8Array> {
  const dataToHash = {
    patient_id: matchResult.patient_id,
    trial_id: matchResult.trial_id,
    composite_score: matchResult.composite_score,
    score_breakdown: matchResult.score_breakdown,
    // Include criteria count but not full details
    criteria_count: matchResult.criteria_results?.length || 0,
    hash_timestamp: Date.now(),
  };

  return sha256(dataToHash);
}

/**
 * Verify a hash matches the expected data
 */
export async function verifyHash(
  data: unknown,
  expectedHash: Uint8Array
): Promise<boolean> {
  const computedHash = await sha256(data);
  if (computedHash.length !== expectedHash.length) return false;
  for (let i = 0; i < computedHash.length; i++) {
    if (computedHash[i] !== expectedHash[i]) return false;
  }
  return true;
}

/**
 * Convert Uint8Array to base58 string (for display)
 */
export function uint8ArrayToBase58(arr: Uint8Array): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt(0);
  for (const byte of arr) {
    num = num * BigInt(256) + BigInt(byte);
  }
  let result = "";
  while (num > 0) {
    result = ALPHABET[Number(num % BigInt(58))] + result;
    num = num / BigInt(58);
  }
  // Handle leading zeros
  for (const byte of arr) {
    if (byte === 0) result = "1" + result;
    else break;
  }
  return result || "1";
}

/**
 * Format hash for display (truncated)
 */
export function formatHash(hash: Uint8Array | string, maxLen = 16): string {
  const str = typeof hash === "string" ? hash : uint8ArrayToBase58(hash);
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen / 2)}...${str.slice(-maxLen / 2)}`;
}
