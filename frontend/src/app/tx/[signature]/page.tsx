"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  Clock,
  Hash,
  CheckCircle,
  XCircle,
  Copy,
  Zap,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Coins,
  FileCode,
  Box,
  ArrowRight,
} from "lucide-react";
import { useER, PROGRAM_IDS } from "@/components/WalletProvider";
import { getSolscanUrl } from "@/lib/explorer";

interface TransactionInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  confirmationStatus: string;
  err: any;
  fee: number;
  computeUnits: number;
  instructions: {
    programId: string;
    accounts: string[];
    data: string;
  }[];
  logs: string[];
}

export default function TransactionExplorerPage() {
  const params = useParams();
  const signature = params.signature as string;
  
  const { connection } = useConnection();
  const { mode } = useER();

  // State
  const [txInfo, setTxInfo] = useState<TransactionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  // Load transaction data
  const loadTransaction = useCallback(async () => {
    if (!signature) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      
      if (!tx) {
        setError("Transaction not found");
        return;
      }

      // Parse transaction info
      const info: TransactionInfo = {
        signature,
        slot: tx.slot,
        blockTime: tx.blockTime ?? null,
        confirmationStatus: "confirmed",
        err: tx.meta?.err,
        fee: tx.meta?.fee || 0,
        computeUnits: tx.meta?.computeUnitsConsumed ?? 0,
        instructions: tx.transaction.message.compiledInstructions.map((ix) => ({
          programId: tx.transaction.message.staticAccountKeys[ix.programIdIndex].toBase58(),
          accounts: ix.accountKeyIndexes.map(
            (idx) => tx.transaction.message.staticAccountKeys[idx].toBase58()
          ),
          data: Buffer.from(ix.data).toString("hex"),
        })),
        logs: tx.meta?.logMessages || [],
      };
      
      setTxInfo(info);
    } catch (err) {
      console.error("Failed to load transaction:", err);
      setError("Failed to fetch transaction data");
    } finally {
      setLoading(false);
    }
  }, [connection, signature]);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  // Copy handler
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Truncate
  const truncate = (str: string, chars = 8) => {
    if (str.length <= chars * 2) return str;
    return `${str.slice(0, chars)}...${str.slice(-chars)}`;
  };

  // Format lamports to SOL
  const lamportsToSol = (lamports: number) => {
    return (lamports / 1e9).toFixed(9);
  };

  // Check if this is a CogniStream instruction
  const isCogniStreamIx = (programId: string) => programId === PROGRAM_IDS.COGNISTREAM;

  return (
    <div className="min-h-screen bg-paper font-mono bg-noise text-charcoal">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.04] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-50 bg-white border-b-2 border-charcoal shadow-brutal-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/patients" className="p-2 hover:bg-paper transition-colors border-2 border-transparent hover:border-charcoal">
              <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            </Link>
            <div className="flex items-center gap-3">
              <FileCode className="w-6 h-6 text-cobalt" strokeWidth={2.5} />
              <div>
                <h1 className="font-heading text-xl font-bold uppercase tracking-tight">
                  Transaction Explorer
                </h1>
                <p className="font-mono text-[10px] text-charcoal/60 uppercase tracking-widest">
                  {truncate(signature, 12)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={getSolscanUrl("tx", signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 border-2 border-charcoal/20 hover:border-charcoal text-charcoal font-mono text-[10px] font-bold uppercase transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Solscan
            </a>
            <WalletMultiButton className="brutal-btn bg-cobalt text-white px-4 py-2 text-xs uppercase" />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-cobalt mb-4" />
            <p className="font-mono text-sm text-charcoal/60">Loading transaction...</p>
          </div>
        ) : error ? (
          <div className="bg-white border-2 border-iodine p-8 text-center shadow-brutal">
            <AlertTriangle className="w-12 h-12 text-iodine mx-auto mb-4" />
            <p className="font-mono text-sm text-iodine mb-4">{error}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={loadTransaction}
                className="brutal-btn bg-white text-charcoal border-2 border-charcoal px-4 py-2 text-xs uppercase"
              >
                <RefreshCw className="w-4 h-4 mr-2 inline" /> Retry
              </button>
              <Link href="/patients">
                <button className="brutal-btn bg-cobalt text-white px-4 py-2 text-xs uppercase">
                  Back to Patients
                </button>
              </Link>
            </div>
          </div>
        ) : txInfo ? (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`border-2 p-4 shadow-brutal ${
              txInfo.err 
                ? "border-iodine bg-iodine/5" 
                : "border-surgical bg-surgical/5"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {txInfo.err ? (
                    <XCircle className="w-6 h-6 text-iodine" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-surgical" />
                  )}
                  <div>
                    <p className={`font-heading font-bold uppercase ${txInfo.err ? "text-iodine" : "text-surgical"}`}>
                      {txInfo.err ? "Transaction Failed" : "Transaction Confirmed"}
                    </p>
                    <p className="font-mono text-[10px] text-charcoal/60 uppercase tracking-widest">
                      {txInfo.confirmationStatus}
                    </p>
                  </div>
                </div>
                {txInfo.blockTime && (
                  <div className="text-right">
                    <p className="font-mono text-sm">{new Date(txInfo.blockTime * 1000).toLocaleString()}</p>
                    <p className="font-mono text-[10px] text-charcoal/50">Block Time</p>
                  </div>
                )}
              </div>
            </div>

            {/* Signature & Details */}
            <div className="bg-white border-2 border-charcoal shadow-brutal">
              <div className="bg-paper border-b-2 border-charcoal px-4 py-3">
                <h3 className="font-heading text-sm font-bold uppercase tracking-tight">
                  Transaction Details
                </h3>
              </div>

              <div className="p-4 space-y-4">
                {/* Signature */}
                <div className="bg-paper border border-charcoal/10 p-3">
                  <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mb-1">Signature</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs break-all">{signature}</code>
                    <button onClick={() => handleCopy(signature, "sig")} className="p-1 hover:bg-white rounded shrink-0">
                      {copiedField === "sig" ? <CheckCircle className="w-3 h-3 text-surgical" /> : <Copy className="w-3 h-3 text-charcoal/40" />}
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-paper border border-charcoal/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Box className="w-3 h-3 text-charcoal/50" />
                      <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest">Slot</p>
                    </div>
                    <p className="font-heading font-bold">{txInfo.slot.toLocaleString()}</p>
                  </div>

                  <div className="bg-paper border border-charcoal/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Coins className="w-3 h-3 text-charcoal/50" />
                      <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest">Fee</p>
                    </div>
                    <p className="font-heading font-bold">{lamportsToSol(txInfo.fee)} SOL</p>
                  </div>

                  <div className="bg-paper border border-charcoal/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Cpu className="w-3 h-3 text-charcoal/50" />
                      <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest">Compute</p>
                    </div>
                    <p className="font-heading font-bold">{txInfo.computeUnits.toLocaleString()} CU</p>
                  </div>

                  <div className="bg-paper border border-charcoal/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileCode className="w-3 h-3 text-charcoal/50" />
                      <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest">Instructions</p>
                    </div>
                    <p className="font-heading font-bold">{txInfo.instructions.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white border-2 border-charcoal shadow-brutal">
              <div className="bg-paper border-b-2 border-charcoal px-4 py-3">
                <h3 className="font-heading text-sm font-bold uppercase tracking-tight">
                  Instructions
                </h3>
              </div>

              <div className="divide-y divide-charcoal/10">
                {txInfo.instructions.map((ix, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-paper border border-charcoal/20 flex items-center justify-center font-mono text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs">{truncate(ix.programId, 8)}</code>
                            {isCogniStreamIx(ix.programId) && (
                              <span className="px-1.5 py-0.5 bg-cobalt/10 text-cobalt text-[9px] font-bold uppercase">
                                CogniStream
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-charcoal/50">Program ID</p>
                        </div>
                      </div>
                      <a
                        href={getSolscanUrl("address", ix.programId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cobalt hover:underline text-[10px] flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Accounts */}
                    <div className="bg-paper border border-charcoal/10 p-2 mb-2">
                      <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mb-2">
                        Accounts ({ix.accounts.length})
                      </p>
                      <div className="space-y-1">
                        {ix.accounts.slice(0, 5).map((acc, accIdx) => (
                          <div key={accIdx} className="flex items-center gap-2">
                            <ArrowRight className="w-3 h-3 text-charcoal/30" />
                            <code className="font-mono text-[10px]">{truncate(acc, 12)}</code>
                          </div>
                        ))}
                        {ix.accounts.length > 5 && (
                          <p className="font-mono text-[10px] text-charcoal/50 pl-5">
                            +{ix.accounts.length - 5} more accounts
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Data */}
                    <div className="bg-paper border border-charcoal/10 p-2">
                      <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mb-1">
                        Data (hex)
                      </p>
                      <code className="font-mono text-[10px] text-charcoal/70 break-all">
                        {ix.data.slice(0, 64)}{ix.data.length > 64 ? "..." : ""}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Logs */}
            {txInfo.logs.length > 0 && (
              <div className="bg-white border-2 border-charcoal shadow-brutal">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full bg-paper border-b-2 border-charcoal px-4 py-3 flex items-center justify-between hover:bg-paper/80 transition-colors"
                >
                  <h3 className="font-heading text-sm font-bold uppercase tracking-tight">
                    Program Logs ({txInfo.logs.length})
                  </h3>
                  <span className="font-mono text-[10px] text-charcoal/50">
                    {showLogs ? "Hide" : "Show"}
                  </span>
                </button>

                {showLogs && (
                  <div className="p-4 bg-charcoal text-white overflow-x-auto">
                    <pre className="font-mono text-[10px] leading-relaxed">
                      {txInfo.logs.map((log, idx) => (
                        <div key={idx} className={log.includes("Program log:") ? "text-surgical" : log.includes("Error") ? "text-iodine" : ""}>
                          {log}
                        </div>
                      ))}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
