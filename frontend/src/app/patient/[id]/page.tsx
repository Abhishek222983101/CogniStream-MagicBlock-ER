"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  ArrowLeft,
  Activity,
  Loader2,
  ExternalLink,
  Shield,
  ShieldCheck,
  Clock,
  Hash,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Copy,
  Zap,
  AlertTriangle,
  RefreshCw,
  FlaskConical,
  Lock,
  Unlock,
} from "lucide-react";
import { useER, PROGRAM_IDS } from "@/components/WalletProvider";
import {
  loadPatientByAddress,
  fetchAllMatches,
  fetchAllConsents,
  getConsentTypeLabel,
  type PatientSnapshot,
  type MatchSnapshot,
  type ConsentSnapshot,
} from "@/lib/onchainPatient";
import { getSolscanUrl } from "@/lib/explorer";

// Dynamic import to prevent SSR hydration mismatch
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function PatientDetailPage() {
  const params = useParams();
  const patientAddress = params.id as string;
  
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { mode, isDelegated } = useER();

  // State
  const [patient, setPatient] = useState<PatientSnapshot | null>(null);
  const [matches, setMatches] = useState<MatchSnapshot[]>([]);
  const [consents, setConsents] = useState<ConsentSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load patient data
  const loadData = useCallback(async () => {
    if (!patientAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const patientPda = new PublicKey(patientAddress);
      
      // Load patient record
      const patientResult = await loadPatientByAddress(connection, patientPda);
      
      if (!patientResult.ok) {
        const failure = patientResult.failure;
        if (failure.reason === "no_account") {
          setError("Patient record not found on-chain");
        } else if ("error" in failure) {
          setError(failure.error || "Failed to load patient");
        } else {
          setError("Failed to load patient");
        }
        return;
      }
      
      setPatient(patientResult.snapshot);
      
      // Load matches and consents in parallel
      const [matchesData, consentsData] = await Promise.all([
        fetchAllMatches(connection, patientPda),
        fetchAllConsents(connection, patientPda),
      ]);
      
      setMatches(matchesData);
      setConsents(consentsData);
    } catch (err) {
      console.error("Failed to load patient data:", err);
      setError("Failed to fetch data from chain");
    } finally {
      setLoading(false);
    }
  }, [connection, patientAddress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copy handler
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Truncate address
  const truncateAddress = (address: string, chars = 8) => {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  // Check if current user is owner
  const isOwner = patient && publicKey && patient.owner.equals(publicKey);

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return "var(--color-surgical)";
    if (score >= 60) return "var(--color-cobalt)";
    if (score >= 40) return "var(--color-iodine)";
    return "var(--color-ineligible)";
  };

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
              <User className="w-6 h-6 text-cobalt" strokeWidth={2.5} />
              <div>
                <h1 className="font-heading text-xl font-bold uppercase tracking-tight">
                  {patient?.patientId || "Patient Details"}
                </h1>
                <p className="font-mono text-[10px] text-charcoal/60 uppercase tracking-widest">
                  On-Chain Record
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {patient?.isDelegated && (
              <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-surgical/30 bg-surgical/5 text-surgical">
                <Zap className="w-4 h-4" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                  Delegated to ER
                </span>
              </div>
            )}
            <WalletMultiButton className="brutal-btn bg-cobalt text-white px-4 py-2 text-xs uppercase" />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-cobalt mb-4" />
            <p className="font-mono text-sm text-charcoal/60">Loading patient data...</p>
          </div>
        ) : error ? (
          <div className="bg-white border-2 border-iodine p-8 text-center shadow-brutal">
            <AlertTriangle className="w-12 h-12 text-iodine mx-auto mb-4" />
            <p className="font-mono text-sm text-iodine mb-4">{error}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={loadData}
                className="brutal-btn bg-white text-charcoal border-2 border-charcoal px-4 py-2 text-xs uppercase"
              >
                <RefreshCw className="w-4 h-4 mr-2 inline" /> Retry
              </button>
              <Link href="/patients">
                <button className="brutal-btn bg-cobalt text-white px-4 py-2 text-xs uppercase">
                  Back to List
                </button>
              </Link>
            </div>
          </div>
        ) : patient ? (
          <div className="space-y-6">
            {/* Patient Info Card */}
            <div className="bg-white border-2 border-charcoal shadow-brutal">
              <div className="bg-paper border-b-2 border-charcoal px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cobalt" strokeWidth={2.5} />
                  <h3 className="font-heading text-sm font-bold uppercase tracking-tight">
                    Patient Record
                  </h3>
                </div>
                {isOwner && (
                  <span className="px-2 py-0.5 bg-cobalt/10 text-cobalt text-[10px] font-bold uppercase border border-cobalt/20">
                    Owner
                  </span>
                )}
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Patient ID */}
                <div className="bg-paper border border-charcoal/10 p-3">
                  <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mb-1">Patient ID</p>
                  <p className="font-heading font-bold text-lg">{patient.patientId}</p>
                </div>

                {/* PDA Address */}
                <div className="bg-paper border border-charcoal/10 p-3">
                  <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mb-1">PDA Address</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs">{truncateAddress(patient.address.toBase58(), 12)}</code>
                    <button onClick={() => handleCopy(patient.address.toBase58(), "pda")} className="p-1 hover:bg-white rounded">
                      {copiedField === "pda" ? <CheckCircle className="w-3 h-3 text-surgical" /> : <Copy className="w-3 h-3 text-charcoal/40" />}
                    </button>
                    <a href={getSolscanUrl("address", patient.address.toBase58())} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white rounded">
                      <ExternalLink className="w-3 h-3 text-charcoal/40 hover:text-cobalt" />
                    </a>
                  </div>
                </div>

                {/* Owner */}
                <div className="bg-paper border border-charcoal/10 p-3">
                  <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mb-1">Owner Wallet</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs">{truncateAddress(patient.owner.toBase58(), 12)}</code>
                    <button onClick={() => handleCopy(patient.owner.toBase58(), "owner")} className="p-1 hover:bg-white rounded">
                      {copiedField === "owner" ? <CheckCircle className="w-3 h-3 text-surgical" /> : <Copy className="w-3 h-3 text-charcoal/40" />}
                    </button>
                    <a href={getSolscanUrl("address", patient.owner.toBase58())} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white rounded">
                      <ExternalLink className="w-3 h-3 text-charcoal/40 hover:text-cobalt" />
                    </a>
                  </div>
                </div>

                {/* Data Hash */}
                <div className="bg-paper border border-charcoal/10 p-3">
                  <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mb-1">Data Hash (SHA-256)</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[10px] text-charcoal/70">{patient.dataHash.slice(0, 24)}...</code>
                    <button onClick={() => handleCopy(patient.dataHash, "hash")} className="p-1 hover:bg-white rounded">
                      {copiedField === "hash" ? <CheckCircle className="w-3 h-3 text-surgical" /> : <Copy className="w-3 h-3 text-charcoal/40" />}
                    </button>
                  </div>
                </div>

                {/* Created At */}
                <div className="bg-paper border border-charcoal/10 p-3">
                  <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mb-1">Created</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-charcoal/50" />
                    <span className="font-mono text-sm">{patient.createdAt.toLocaleString()}</span>
                  </div>
                </div>

                {/* Delegation Status */}
                <div className="bg-paper border border-charcoal/10 p-3">
                  <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mb-1">Delegation Status</p>
                  {patient.isDelegated ? (
                    <div className="flex items-center gap-2 text-surgical">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="font-mono text-sm font-bold">Active on Ephemeral Rollup</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-charcoal/60">
                      <Shield className="w-4 h-4" />
                      <span className="font-mono text-sm">On Base Layer (L1)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Matches Section */}
            <div className="bg-white border-2 border-charcoal shadow-brutal">
              <div className="bg-paper border-b-2 border-charcoal px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-surgical" strokeWidth={2.5} />
                  <h3 className="font-heading text-sm font-bold uppercase tracking-tight">
                    Trial Matches
                  </h3>
                </div>
                <span className="font-mono text-[10px] font-bold bg-charcoal text-white px-2 py-0.5">
                  {matches.length} MATCHES
                </span>
              </div>

              {matches.length === 0 ? (
                <div className="p-8 text-center">
                  <FlaskConical className="w-10 h-10 text-charcoal/20 mx-auto mb-3" />
                  <p className="font-mono text-sm text-charcoal/60">No matches recorded on-chain yet</p>
                </div>
              ) : (
                <div className="divide-y divide-charcoal/10">
                  {matches.map((match) => (
                    <div key={match.address.toBase58()} className="p-4 hover:bg-paper/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-heading font-bold text-cobalt">{match.trialId}</p>
                          <p className="font-mono text-[10px] text-charcoal/50 mt-1">
                            Matched {match.matchedAt.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div 
                            className="font-heading text-2xl font-bold"
                            style={{ color: getScoreColor(match.scorePercent) }}
                          >
                            {match.scorePercent.toFixed(1)}%
                          </div>
                          <p className="font-mono text-[10px] text-charcoal/50">{match.scoreBps} bps</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="flex items-center gap-1 text-[10px] text-charcoal/50">
                          <Hash className="w-3 h-3" />
                          {truncateAddress(match.resultHash, 8)}
                        </div>
                        {match.isDelegated && (
                          <span className="text-[10px] text-surgical font-bold uppercase flex items-center gap-1">
                            <Zap className="w-3 h-3" /> ER
                          </span>
                        )}
                        <a
                          href={getSolscanUrl("address", match.address.toBase58())}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-cobalt hover:underline flex items-center gap-1 ml-auto"
                        >
                          Solscan <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consents Section */}
            <div className="bg-white border-2 border-charcoal shadow-brutal">
              <div className="bg-paper border-b-2 border-charcoal px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-iodine" strokeWidth={2.5} />
                  <h3 className="font-heading text-sm font-bold uppercase tracking-tight">
                    Consent History
                  </h3>
                </div>
                <span className="font-mono text-[10px] font-bold bg-charcoal text-white px-2 py-0.5">
                  {consents.length} RECORDS
                </span>
              </div>

              {consents.length === 0 ? (
                <div className="p-8 text-center">
                  <Lock className="w-10 h-10 text-charcoal/20 mx-auto mb-3" />
                  <p className="font-mono text-sm text-charcoal/60">No consent records on-chain yet</p>
                </div>
              ) : (
                <div className="divide-y divide-charcoal/10">
                  {consents.map((consent) => (
                    <div key={consent.address.toBase58()} className="p-4 hover:bg-paper/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-heading font-bold">{consent.trialId}</p>
                          <p className="font-mono text-sm text-charcoal/70 mt-1">
                            {getConsentTypeLabel(consent.consentType)}
                          </p>
                        </div>
                        <div className="text-right">
                          {consent.isRevoked ? (
                            <div className="flex items-center gap-1 text-iodine">
                              <XCircle className="w-4 h-4" />
                              <span className="font-mono text-sm font-bold">Revoked</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-surgical">
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-mono text-sm font-bold">Active</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-[10px] text-charcoal/50">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Consented: {consent.consentedAt.toLocaleString()}
                        </div>
                        {consent.revokedAt && (
                          <div className="flex items-center gap-1 text-iodine">
                            <Unlock className="w-3 h-3" />
                            Revoked: {consent.revokedAt.toLocaleString()}
                          </div>
                        )}
                        <a
                          href={getSolscanUrl("address", consent.address.toBase58())}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-cobalt hover:underline flex items-center gap-1 ml-auto"
                        >
                          Solscan <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions (only for owner) */}
            {isOwner && (
              <div className="bg-white border-2 border-charcoal shadow-brutal p-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm text-charcoal/60">
                    You own this patient record
                  </p>
                  <div className="flex gap-3">
                    <Link href="/pipeline">
                      <button className="brutal-btn bg-cobalt text-white px-4 py-2 text-xs uppercase">
                        Run Match Pipeline
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
