/**
 * Solscan Explorer URL Builder for CogniStream
 */

// ─── Network Configuration ───────────────────────────────────────────────────
export type Network = "mainnet-beta" | "devnet" | "testnet" | "localnet";

const EXPLORER_URLS = {
  solscan: {
    "mainnet-beta": "https://solscan.io",
    devnet: "https://solscan.io",
    testnet: "https://solscan.io",
    localnet: "https://solscan.io",
  },
  solanaExplorer: {
    "mainnet-beta": "https://explorer.solana.com",
    devnet: "https://explorer.solana.com",
    testnet: "https://explorer.solana.com",
    localnet: "https://explorer.solana.com",
  },
} as const;

// Default to devnet for hackathon
const DEFAULT_NETWORK: Network = "devnet";

// ─── URL Builders ─────────────────────────────────────────────────────────────

/**
 * Get Solscan URL for a transaction
 */
export function txUrl(
  signature: string,
  network: Network = DEFAULT_NETWORK
): string {
  const base = EXPLORER_URLS.solscan[network];
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `${base}/tx/${signature}${cluster}`;
}

/**
 * Get Solscan URL for an account/address
 */
export function accountUrl(
  address: string,
  network: Network = DEFAULT_NETWORK
): string {
  const base = EXPLORER_URLS.solscan[network];
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `${base}/account/${address}${cluster}`;
}

/**
 * Get Solscan URL for a token
 */
export function tokenUrl(
  mint: string,
  network: Network = DEFAULT_NETWORK
): string {
  const base = EXPLORER_URLS.solscan[network];
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `${base}/token/${mint}${cluster}`;
}

/**
 * Get Solscan URL for a block
 */
export function blockUrl(
  slot: number,
  network: Network = DEFAULT_NETWORK
): string {
  const base = EXPLORER_URLS.solscan[network];
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `${base}/block/${slot}${cluster}`;
}

/**
 * Get Solana Explorer URL for a transaction (alternative)
 */
export function solanaExplorerTxUrl(
  signature: string,
  network: Network = DEFAULT_NETWORK
): string {
  const base = EXPLORER_URLS.solanaExplorer[network];
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `${base}/tx/${signature}${cluster}`;
}

// ─── Truncation Helpers ───────────────────────────────────────────────────────

/**
 * Truncate a signature or address for display
 */
export function truncate(str: string, startLen = 4, endLen = 4): string {
  if (str.length <= startLen + endLen + 3) return str;
  return `${str.slice(0, startLen)}...${str.slice(-endLen)}`;
}

/**
 * Truncate a public key for display
 */
export function truncateAddress(address: string): string {
  return truncate(address, 4, 4);
}

/**
 * Truncate a transaction signature for display
 */
export function truncateSignature(signature: string): string {
  return truncate(signature, 8, 8);
}

// ─── Link Components Helper ───────────────────────────────────────────────────

/**
 * Get explorer link props for use in React components
 */
export function getExplorerLinkProps(
  type: "tx" | "account" | "token" | "block",
  value: string | number,
  network: Network = DEFAULT_NETWORK
) {
  let url: string;
  let displayValue: string;

  switch (type) {
    case "tx":
      url = txUrl(value as string, network);
      displayValue = truncateSignature(value as string);
      break;
    case "account":
      url = accountUrl(value as string, network);
      displayValue = truncateAddress(value as string);
      break;
    case "token":
      url = tokenUrl(value as string, network);
      displayValue = truncateAddress(value as string);
      break;
    case "block":
      url = blockUrl(value as number, network);
      displayValue = value.toString();
      break;
  }

  return {
    href: url,
    displayValue,
    target: "_blank" as const,
    rel: "noopener noreferrer" as const,
  };
}

// ─── Convenience Function (used by pages) ─────────────────────────────────────

/**
 * Get Solscan URL for any entity type
 * Convenience function used across pages
 */
export function getSolscanUrl(
  type: "tx" | "address" | "token" | "block",
  value: string | number,
  network: Network = DEFAULT_NETWORK
): string {
  switch (type) {
    case "tx":
      return txUrl(value as string, network);
    case "address":
      return accountUrl(value as string, network);
    case "token":
      return tokenUrl(value as string, network);
    case "block":
      return blockUrl(value as number, network);
  }
}
