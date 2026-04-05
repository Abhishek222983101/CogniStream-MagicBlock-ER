"use client";

import React, { useMemo, createContext, useContext, useState, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

// ─── MagicBlock Endpoints ────────────────────────────────────────────────────
const ENDPOINTS = {
  // Magic Router - auto-routes between L1 and ER
  ROUTER: "https://devnet-router.magicblock.app",
  ROUTER_WS: "wss://devnet-router.magicblock.app",
  // Regular Ephemeral Rollup (US)
  ER: "https://devnet-us.magicblock.app",
  ER_WS: "wss://devnet-us.magicblock.app",
  // TEE/Private ER
  TEE: "https://devnet-tee.magicblock.app",
  TEE_WS: "wss://devnet-tee.magicblock.app",
  // Base Layer (Solana Devnet)
  L1: "https://api.devnet.solana.com",
  L1_WS: "wss://api.devnet.solana.com",
};

// ─── Validators ──────────────────────────────────────────────────────────────
export const VALIDATORS = {
  ER_US: "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd",
  TEE: "FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA",
  ER_ASIA: "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57",
  ER_EU: "MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e",
};

// ─── Program IDs ─────────────────────────────────────────────────────────────
export const PROGRAM_IDS = {
  COGNISTREAM: "H5z3iR81T3cDscsCEGa9aqExDy9SpZu3zq88SxtNFpWh",
  DELEGATION: "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh",
  PERMISSION: "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1",
};

// ─── ER Mode Context ─────────────────────────────────────────────────────────
type ERMode = "router" | "er" | "tee" | "l1";

interface ERContextType {
  mode: ERMode;
  setMode: (mode: ERMode) => void;
  endpoint: string;
  wsEndpoint: string;
  isDelegated: boolean;
  setIsDelegated: (v: boolean) => void;
  isTeeMode: boolean;
  txCount: number;
  incrementTxCount: () => void;
  lastTxTime: number | null;
  setLastTxTime: (t: number) => void;
}

const ERContext = createContext<ERContextType | null>(null);

export function useER() {
  const ctx = useContext(ERContext);
  if (!ctx) throw new Error("useER must be used within WalletProvider");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────
interface Props {
  children: React.ReactNode;
}

export default function WalletProvider({ children }: Props) {
  // ER state
  const [mode, setMode] = useState<ERMode>("router");
  const [isDelegated, setIsDelegated] = useState(false);
  const [txCount, setTxCount] = useState(0);
  const [lastTxTime, setLastTxTime] = useState<number | null>(null);

  // Get endpoint based on mode
  const endpoint = useMemo(() => {
    switch (mode) {
      case "router": return ENDPOINTS.ROUTER;
      case "er": return ENDPOINTS.ER;
      case "tee": return ENDPOINTS.TEE;
      case "l1": return ENDPOINTS.L1;
    }
  }, [mode]);

  const wsEndpoint = useMemo(() => {
    switch (mode) {
      case "router": return ENDPOINTS.ROUTER_WS;
      case "er": return ENDPOINTS.ER_WS;
      case "tee": return ENDPOINTS.TEE_WS;
      case "l1": return ENDPOINTS.L1_WS;
    }
  }, [mode]);

  const incrementTxCount = useCallback(() => {
    setTxCount((c) => c + 1);
  }, []);

  // Wallet adapters
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  const erValue: ERContextType = {
    mode,
    setMode,
    endpoint,
    wsEndpoint,
    isDelegated,
    setIsDelegated,
    isTeeMode: mode === "tee",
    txCount,
    incrementTxCount,
    lastTxTime,
    setLastTxTime,
  };

  return (
    <ERContext.Provider value={erValue}>
      <ConnectionProvider
        endpoint={endpoint}
        config={{
          commitment: "confirmed",
          wsEndpoint,
        }}
      >
        <SolanaWalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </SolanaWalletProvider>
      </ConnectionProvider>
    </ERContext.Provider>
  );
}

// ─── Export constants for use across the app ─────────────────────────────────
export { ENDPOINTS };
