/**
 * Formatting Utilities for CogniStream
 */

// ─── SOL Formatting ───────────────────────────────────────────────────────────

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Format SOL amount for display
 */
export function formatSol(
  lamports: number | bigint,
  decimals = 4,
  showSymbol = true
): string {
  const sol = lamportsToSol(lamports);
  const formatted = sol.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return showSymbol ? `${formatted} SOL` : formatted;
}

// ─── Score Formatting ─────────────────────────────────────────────────────────

/**
 * Convert basis points (0-10000) to percentage (0-100)
 */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/**
 * Convert percentage (0-100) to basis points (0-10000)
 */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/**
 * Format match score for display
 */
export function formatScore(scoreBps: number): string {
  const percent = bpsToPercent(scoreBps);
  return `${percent.toFixed(1)}%`;
}

/**
 * Format match score with color class
 */
export function formatScoreWithColor(scoreBps: number): {
  text: string;
  colorClass: string;
} {
  const percent = bpsToPercent(scoreBps);
  const text = `${percent.toFixed(1)}%`;

  let colorClass: string;
  if (percent >= 80) {
    colorClass = "text-green-500";
  } else if (percent >= 60) {
    colorClass = "text-yellow-500";
  } else if (percent >= 40) {
    colorClass = "text-orange-500";
  } else {
    colorClass = "text-red-500";
  }

  return { text, colorClass };
}

// ─── Time Formatting ──────────────────────────────────────────────────────────

/**
 * Format Unix timestamp to human-readable date
 */
export function formatTimestamp(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format Unix timestamp to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(unixTimestamp: number): string {
  const now = Date.now();
  const diff = now - unixTimestamp * 1000;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// ─── Hash Formatting ──────────────────────────────────────────────────────────

/**
 * Format byte array as hex string
 */
export function bytesToHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Truncate hash for display
 */
export function truncateHash(hash: string, length = 8): string {
  if (hash.length <= length * 2 + 3) return hash;
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
}

// ─── Number Formatting ────────────────────────────────────────────────────────

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── Patient ID Formatting ────────────────────────────────────────────────────

/**
 * Format patient ID for display (anonymized)
 */
export function formatPatientId(patientId: string): string {
  // Already anonymized IDs like "ANON_MH_0024" stay as-is
  if (patientId.startsWith("ANON_")) return patientId;
  // Otherwise, anonymize
  return `ANON_${patientId.slice(0, 6).toUpperCase()}`;
}

// ─── Consent Type Formatting ──────────────────────────────────────────────────

export const CONSENT_TYPES = {
  0: { name: "View Results", description: "Permission to view match results" },
  1: { name: "Contact", description: "Permission to contact about enrollment" },
  2: { name: "Share Data", description: "Permission to share with trial coordinator" },
  3: { name: "Full Participation", description: "Full consent for trial participation" },
} as const;

/**
 * Get consent type name
 */
export function getConsentTypeName(type: number): string {
  return CONSENT_TYPES[type as keyof typeof CONSENT_TYPES]?.name || `Type ${type}`;
}

/**
 * Get consent type description
 */
export function getConsentTypeDescription(type: number): string {
  return CONSENT_TYPES[type as keyof typeof CONSENT_TYPES]?.description || "";
}
