/**
 * Anchor Program Client Factory for CogniStream
 * Provides programFor() and programReadOnly() like Veil
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl, Wallet } from "@coral-xyz/anchor";
import IDL from "./types/cognistream.json";

// Program ID from deployment
export const PROGRAM_ID = new PublicKey("3YUtpqBtoJshnq7zWviWFrdWc82pgiDLM9wjfFujGMEg");

// Type the IDL - use any to avoid strict type checking issues with generated IDL
export type CogniStreamIDL = typeof IDL;

/**
 * Create a program instance with a wallet (for signing transactions)
 */
export function programFor(
  connection: Connection,
  wallet: Wallet
): Program<any> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    skipPreflight: false,
  });

  return new Program(IDL as unknown as Idl, provider);
}

/**
 * Create a read-only program instance (no wallet needed)
 */
export function programReadOnly(connection: Connection): Program<any> {
  // Create a dummy provider for read-only operations
  const dummyWallet = {
    publicKey: PublicKey.default,
    signTransaction: async () => {
      throw new Error("Read-only program cannot sign transactions");
    },
    signAllTransactions: async () => {
      throw new Error("Read-only program cannot sign transactions");
    },
    payer: undefined as any,
  };

  const provider = new AnchorProvider(connection, dummyWallet as unknown as Wallet, {
    commitment: "confirmed",
  });

  return new Program(IDL as unknown as Idl, provider);
}

/**
 * Get program with wallet adapter
 */
export function programWithWalletAdapter(
  connection: Connection,
  walletAdapter: {
    publicKey: PublicKey | null;
    signTransaction: <T>(tx: T) => Promise<T>;
    signAllTransactions: <T>(txs: T[]) => Promise<T[]>;
  }
): Program<any> | null {
  if (!walletAdapter.publicKey) return null;

  const wallet = {
    publicKey: walletAdapter.publicKey,
    signTransaction: walletAdapter.signTransaction,
    signAllTransactions: walletAdapter.signAllTransactions,
    payer: undefined as any,
  } as unknown as Wallet;

  return programFor(connection, wallet);
}

/**
 * Export the raw IDL for use elsewhere
 */
export { IDL };
