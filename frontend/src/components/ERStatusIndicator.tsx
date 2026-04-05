"use client";

import React from "react";
import { useER } from "./WalletProvider";
import { formatDuration } from "../lib/format";

interface ERStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

/**
 * ER Status Indicator Component
 * Shows delegation status, gasless badge, and timing information
 */
export function ERStatusIndicator({
  className = "",
  showDetails = true,
}: ERStatusIndicatorProps) {
  const { isDelegated, mode, txCount, lastTxTime, isTeeMode } = useER();

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-black/30 border border-white/10 ${className}`}
    >
      {/* Delegation Status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isDelegated ? "bg-green-500 animate-pulse" : "bg-gray-500"
          }`}
        />
        <span className="text-xs font-mono text-gray-400">
          {isDelegated ? "ER Active" : "L1 Only"}
        </span>
      </div>

      {/* Gasless Badge */}
      {isDelegated && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full border border-green-500/30">
          <span className="text-green-400 text-[10px]">⚡</span>
          <span className="text-green-400 text-[10px] font-medium">
            GASLESS
          </span>
        </div>
      )}

      {/* TEE Badge */}
      {isTeeMode && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 rounded-full border border-purple-500/30">
          <span className="text-purple-400 text-[10px]">🔒</span>
          <span className="text-purple-400 text-[10px] font-medium">
            TEE
          </span>
        </div>
      )}

      {/* Mode Indicator */}
      <div className="text-[10px] font-mono text-gray-500 uppercase">
        {mode}
      </div>

      {/* Transaction Stats */}
      {showDetails && txCount > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-gray-500 border-l border-white/10 pl-3">
          <span>{txCount} txs</span>
          {lastTxTime && (
            <span className="text-cyan-400">
              {formatDuration(lastTxTime)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact ER Status Badge
 */
export function ERStatusBadge({ className = "" }: { className?: string }) {
  const { isDelegated, isTeeMode } = useER();

  if (!isDelegated && !isTeeMode) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-gray-500 bg-gray-800/50 rounded ${className}`}
      >
        L1
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded ${
        isTeeMode
          ? "text-purple-400 bg-purple-500/20 border border-purple-500/30"
          : "text-green-400 bg-green-500/20 border border-green-500/30"
      } ${className}`}
    >
      {isTeeMode ? "🔒 TEE" : "⚡ ER"}
    </span>
  );
}

/**
 * Transaction Timing Display
 */
export function TxTimingDisplay({
  timing,
  className = "",
}: {
  timing: { durationMs: number } | null;
  className?: string;
}) {
  if (!timing) return null;

  const isSubFifty = timing.durationMs < 50;

  return (
    <div
      className={`flex items-center gap-1 text-xs font-mono ${
        isSubFifty ? "text-green-400" : "text-cyan-400"
      } ${className}`}
    >
      <span>⏱️</span>
      <span>{timing.durationMs}ms</span>
      {isSubFifty && (
        <span className="text-green-500 text-[10px]">SUB-50ms!</span>
      )}
    </div>
  );
}

/**
 * Delegation Toggle Button
 */
export function DelegationToggle({
  isDelegated,
  onDelegate,
  onUndelegate,
  isLoading,
  className = "",
}: {
  isDelegated: boolean;
  onDelegate: () => void;
  onUndelegate: () => void;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={isDelegated ? onUndelegate : onDelegate}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
        ${
          isDelegated
            ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
            : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
        }
        ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>{isDelegated ? "Undelegating..." : "Delegating..."}</span>
        </>
      ) : (
        <>
          <span>{isDelegated ? "🔓" : "⚡"}</span>
          <span>{isDelegated ? "Undelegate from ER" : "Delegate to ER"}</span>
        </>
      )}
    </button>
  );
}

/**
 * Privacy Mode Toggle
 */
export function PrivacyModeToggle({
  useTee,
  onToggle,
  disabled,
  className = "",
}: {
  useTee: boolean;
  onToggle: (useTee: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm text-gray-400">Privacy Mode:</span>
      <button
        onClick={() => onToggle(!useTee)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${useTee ? "bg-purple-600" : "bg-gray-700"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${useTee ? "translate-x-6" : "translate-x-1"}
          `}
        />
      </button>
      <span className="text-sm text-gray-500">
        {useTee ? "TEE Encrypted" : "Standard ER"}
      </span>
    </div>
  );
}

/**
 * On-Chain Status Display
 */
export function OnChainStatus({
  patientPda,
  isDelegated,
  signature,
  className = "",
}: {
  patientPda: string | null;
  isDelegated: boolean;
  signature: string | null;
  className?: string;
}) {
  if (!patientPda) return null;

  return (
    <div
      className={`p-3 rounded-lg bg-black/30 border border-white/10 space-y-2 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Patient PDA</span>
        <span className="text-xs font-mono text-cyan-400">
          {patientPda.slice(0, 8)}...{patientPda.slice(-8)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Status</span>
        <ERStatusBadge />
      </div>
      {signature && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Last Tx</span>
          <a
            href={`https://solscan.io/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-blue-400 hover:underline"
          >
            {signature.slice(0, 8)}...
          </a>
        </div>
      )}
    </div>
  );
}
