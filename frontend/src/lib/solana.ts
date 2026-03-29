import {
  Transaction,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3.js";

// Official Solana Memo Program ID
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export interface AuditLogData {
  event: string;
  patient_id: string;
  top_trial: string;
  score: number;
  timestamp: number;
}

/**
 * Creates a transaction with a memo instruction containing the audit log data.
 * This uses the official Solana Memo Program to record data on-chain.
 */
export function createMemoTransaction(
  data: AuditLogData,
  payerPublicKey: PublicKey
): Transaction {
  // Create the memo content as a compact JSON string
  const memoContent = JSON.stringify({
    app: "CogniStream",
    ...data,
  });

  // Create the memo instruction
  const memoInstruction = new TransactionInstruction({
    keys: [{ pubkey: payerPublicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoContent, "utf-8"),
  });

  // Build the transaction
  const transaction = new Transaction().add(memoInstruction);

  return transaction;
}

/**
 * Generates the Solscan explorer URL for a transaction on devnet
 */
export function getSolscanUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

/**
 * Formats a signature for display (truncated)
 */
export function formatSignature(signature: string): string {
  if (signature.length <= 16) return signature;
  return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
}
