/**
 * TEE (Trusted Execution Environment) Connection Helper for CogniStream
 * Provides secure connection to MagicBlock TEE validators for private operations.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { ENDPOINTS, VALIDATORS } from "../components/WalletProvider";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TEEAuthRequest {
  wallet_address: string;
  signature: string;
  message: string;
  timestamp: number;
}

export interface TEEAuthResponse {
  success: boolean;
  token?: string;
  expires_at?: number;
  tee_endpoint: string;
  tee_validator: string;
  error?: string;
}

export interface TEEVerifyResponse {
  valid: boolean;
  integrity_hash?: string;
  attestation?: string;
  error?: string;
}

export interface TEEStatus {
  status: string;
  validator: string;
  endpoint: string;
  token_expiry_seconds: number;
  features: string[];
}

// ─── API Client ──────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Get TEE service status
 */
export async function getTeeStatus(): Promise<TEEStatus | null> {
  try {
    const response = await fetch(`${API_BASE}/api/tee/status`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Failed to get TEE status:", error);
    return null;
  }
}

/**
 * Authenticate with TEE service
 */
export async function authenticateForTee(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<TEEAuthResponse> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `CogniStream TEE Auth: ${walletAddress} at ${timestamp}`;
    
    // Sign the message
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = await signMessage(messageBytes);
    
    // Convert signature to base64
    const signature = btoa(String.fromCharCode(...signatureBytes));
    
    const request: TEEAuthRequest = {
      wallet_address: walletAddress,
      signature,
      message,
      timestamp,
    };
    
    const response = await fetch(`${API_BASE}/api/tee/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    
    return await response.json();
  } catch (error) {
    console.error("TEE authentication failed:", error);
    return {
      success: false,
      tee_endpoint: ENDPOINTS.TEE,
      tee_validator: VALIDATORS.TEE,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Verify TEE RPC integrity
 */
export async function verifyTeeRpcIntegrity(
  token: string
): Promise<TEEVerifyResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/tee/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    
    return await response.json();
  } catch (error) {
    console.error("TEE verification failed:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

// ─── Connection Helper ───────────────────────────────────────────────────────

/**
 * Create a connection to the TEE endpoint
 */
export function createTeeConnection(): Connection {
  return new Connection(ENDPOINTS.TEE, {
    commitment: "confirmed",
    wsEndpoint: ENDPOINTS.TEE_WS,
  });
}

/**
 * Connect to private TEE (full flow)
 * Similar to Veil's connectPrivateTee() function
 */
export async function connectPrivateTee(
  wallet: {
    publicKey: PublicKey;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  }
): Promise<{
  connection: Connection;
  token: string;
  validator: PublicKey;
  isVerified: boolean;
} | null> {
  try {
    // 1. Authenticate with TEE service
    const authResponse = await authenticateForTee(
      wallet.publicKey.toBase58(),
      wallet.signMessage
    );
    
    if (!authResponse.success || !authResponse.token) {
      console.error("TEE auth failed:", authResponse.error);
      return null;
    }
    
    // 2. Verify TEE RPC integrity
    const verifyResponse = await verifyTeeRpcIntegrity(authResponse.token);
    
    if (!verifyResponse.valid) {
      console.warn("TEE integrity verification failed:", verifyResponse.error);
      // Continue anyway for hackathon demo (in production, should fail)
    }
    
    // 3. Create connection to TEE
    const connection = createTeeConnection();
    
    return {
      connection,
      token: authResponse.token,
      validator: new PublicKey(authResponse.tee_validator),
      isVerified: verifyResponse.valid,
    };
  } catch (error) {
    console.error("Failed to connect to private TEE:", error);
    return null;
  }
}

// ─── State Management ────────────────────────────────────────────────────────

/**
 * TEE Session state (can be stored in React context)
 */
export interface TEESession {
  isConnected: boolean;
  token: string | null;
  expiresAt: number | null;
  validator: string;
  connection: Connection | null;
  isVerified: boolean;
}

/**
 * Check if TEE session is valid
 */
export function isTeeSessionValid(session: TEESession): boolean {
  if (!session.isConnected || !session.token || !session.expiresAt) {
    return false;
  }
  
  // Check if token is expired (with 60 second buffer)
  const now = Math.floor(Date.now() / 1000);
  return session.expiresAt > now + 60;
}

/**
 * Create initial TEE session state
 */
export function createInitialTeeSession(): TEESession {
  return {
    isConnected: false,
    token: null,
    expiresAt: null,
    validator: VALIDATORS.TEE,
    connection: null,
    isVerified: false,
  };
}

// ─── Privacy Utilities ───────────────────────────────────────────────────────

/**
 * Encrypt data for TEE (mock implementation for hackathon)
 * In production, this would use the TEE's public key
 */
export async function encryptForTee(data: unknown): Promise<string> {
  // Mock encryption - just base64 encode
  const json = JSON.stringify(data);
  return btoa(json);
}

/**
 * Decrypt data from TEE (mock implementation for hackathon)
 */
export function decryptFromTee(encrypted: string): unknown {
  // Mock decryption - just base64 decode
  const json = atob(encrypted);
  return JSON.parse(json);
}
