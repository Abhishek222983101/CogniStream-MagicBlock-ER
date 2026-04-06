"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  ArrowLeft,
  Users,
  Activity,
  RefreshCw,
  Loader2,
  ExternalLink,
  Shield,
  ShieldCheck,
  Clock,
  Hash,
  Filter,
  Search,
  Database,
  Wallet,
  Copy,
  CheckCircle,
  Zap,
} from "lucide-react";
import { useER, PROGRAM_IDS } from "@/components/WalletProvider";
import { fetchAllPatients, type PatientSnapshot } from "@/lib/onchainPatient";
import { getSolscanUrl } from "@/lib/explorer";

// Dynamic import to prevent SSR hydration mismatch
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function PatientsDiscoveryPage() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { mode, isDelegated, txCount } = useER();

  // State
  const [patients, setPatients] = useState<PatientSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOwned, setFilterOwned] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Fetch patients from chain
  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ownerFilter = filterOwned && publicKey ? publicKey : undefined;
      const data = await fetchAllPatients(connection, ownerFilter);
      setPatients(data);
    } catch (err) {
      console.error("Failed to load patients:", err);
      setError("Failed to fetch patients from chain");
    } finally {
      setLoading(false);
    }
  }, [connection, filterOwned, publicKey]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Filter by search
  const filteredPatients = patients.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.patientId.toLowerCase().includes(query) ||
      p.address.toBase58().toLowerCase().includes(query) ||
      p.owner.toBase58().toLowerCase().includes(query)
    );
  });

  // Copy address handler
  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Truncate address
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-paper font-mono bg-noise text-charcoal">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.04] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-50 bg-white border-b-2 border-charcoal shadow-brutal-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-paper transition-colors border-2 border-transparent hover:border-charcoal">
              <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            </Link>
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-cobalt" strokeWidth={2.5} />
              <div>
                <h1 className="font-heading text-xl font-bold uppercase tracking-tight">
                  On-Chain Patients
                </h1>
                <p className="font-mono text-[10px] text-charcoal/60 uppercase tracking-widest">
                  CogniStream Explorer
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* ER Mode Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 border-2 ${
              mode === "tee" 
                ? "border-surgical/30 bg-surgical/5 text-surgical"
                : mode === "er" || mode === "router"
                ? "border-cobalt/30 bg-cobalt/5 text-cobalt"
                : "border-charcoal/20 text-charcoal/60"
            }`}>
              {mode === "tee" ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                {mode === "tee" ? "TEE Mode" : mode === "router" ? "ER Router" : mode.toUpperCase()}
              </span>
            </div>

            <WalletMultiButton className="brutal-btn bg-cobalt text-white px-4 py-2 text-xs uppercase" />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border-2 border-charcoal p-4 shadow-brutal-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-cobalt" />
              <span className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest font-bold">
                Total Patients
              </span>
            </div>
            <p className="font-heading text-2xl font-bold">
              {loading ? "..." : patients.length}
            </p>
          </div>

          <div className="bg-white border-2 border-charcoal p-4 shadow-brutal-sm">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-surgical" />
              <span className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest font-bold">
                Delegated (ER)
              </span>
            </div>
            <p className="font-heading text-2xl font-bold">
              {loading ? "..." : patients.filter(p => p.isDelegated).length}
            </p>
          </div>

          <div className="bg-white border-2 border-charcoal p-4 shadow-brutal-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-iodine" />
              <span className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest font-bold">
                Your Patients
              </span>
            </div>
            <p className="font-heading text-2xl font-bold">
              {loading || !publicKey 
                ? "..." 
                : patients.filter(p => p.owner.equals(publicKey)).length}
            </p>
          </div>

          <div className="bg-white border-2 border-charcoal p-4 shadow-brutal-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-charcoal" />
              <span className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest font-bold">
                Session TXs
              </span>
            </div>
            <p className="font-heading text-2xl font-bold">{txCount}</p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white border-2 border-charcoal shadow-brutal mb-6">
          <div className="bg-paper border-b-2 border-charcoal px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white border-2 border-charcoal/20 px-3 py-1.5 focus-within:border-cobalt">
                <Search className="w-4 h-4 text-charcoal/50 mr-2" />
                <input
                  type="text"
                  placeholder="Search by ID or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-mono placeholder:text-charcoal/40 w-48"
                />
              </div>

              <button
                onClick={() => setFilterOwned(!filterOwned)}
                disabled={!connected}
                className={`flex items-center gap-2 px-3 py-1.5 border-2 text-xs font-mono font-bold uppercase transition-colors ${
                  filterOwned
                    ? "border-cobalt bg-cobalt text-white"
                    : "border-charcoal/20 hover:border-charcoal bg-white text-charcoal"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Filter className="w-3 h-3" />
                My Patients
              </button>
            </div>

            <button
              onClick={loadPatients}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1.5 border-2 border-charcoal bg-white text-charcoal font-mono text-xs font-bold uppercase hover:bg-charcoal hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {error ? (
              <div className="p-8 text-center">
                <p className="font-mono text-sm text-iodine">{error}</p>
                <button
                  onClick={loadPatients}
                  className="mt-4 brutal-btn bg-cobalt text-white px-4 py-2 text-xs uppercase"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="p-16 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-cobalt mb-4" />
                <p className="font-mono text-sm text-charcoal/60">
                  Fetching patients from Solana...
                </p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-16 text-center">
                <Database className="w-12 h-12 text-charcoal/20 mx-auto mb-4" />
                <p className="font-mono text-sm text-charcoal/60">
                  {searchQuery 
                    ? "No patients match your search" 
                    : filterOwned 
                    ? "You haven't created any patients yet"
                    : "No patient records found on-chain"}
                </p>
                <Link href="/pipeline">
                  <button className="mt-4 brutal-btn bg-cobalt text-white px-6 py-2 text-xs uppercase">
                    Create Patient Record
                  </button>
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-paper/50">
                  <tr className="border-b-2 border-charcoal">
                    {["Patient ID", "PDA Address", "Owner", "Delegated", "Created", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 font-mono font-bold uppercase text-[10px] tracking-widest text-charcoal/60">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {filteredPatients.map((p) => (
                    <tr 
                      key={p.address.toBase58()} 
                      className="border-b border-charcoal/10 hover:bg-paper/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/patient/${p.address.toBase58()}`}>
                          <span className="font-bold text-cobalt hover:underline cursor-pointer">
                            {p.patientId}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-charcoal/70">
                            {truncateAddress(p.address.toBase58())}
                          </span>
                          <button
                            onClick={() => handleCopy(p.address.toBase58())}
                            className="p-1 hover:bg-paper rounded"
                          >
                            {copiedAddress === p.address.toBase58() ? (
                              <CheckCircle className="w-3 h-3 text-surgical" />
                            ) : (
                              <Copy className="w-3 h-3 text-charcoal/40" />
                            )}
                          </button>
                          <a
                            href={getSolscanUrl("address", p.address.toBase58())}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-paper rounded"
                          >
                            <ExternalLink className="w-3 h-3 text-charcoal/40 hover:text-cobalt" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-charcoal/70">
                            {truncateAddress(p.owner.toBase58())}
                          </span>
                          {publicKey && p.owner.equals(publicKey) && (
                            <span className="px-1.5 py-0.5 bg-cobalt/10 text-cobalt text-[9px] font-bold uppercase rounded">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.isDelegated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surgical/10 text-surgical border border-surgical/20 text-[10px] font-bold uppercase">
                            <Zap className="w-3 h-3" /> ER Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-charcoal/5 text-charcoal/60 border border-charcoal/10 text-[10px] font-bold uppercase">
                            L1
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-charcoal/60">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {p.createdAt.toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/patient/${p.address.toBase58()}`}>
                          <button className="font-mono text-[10px] font-bold uppercase bg-white border border-charcoal px-3 py-1 hover:bg-cobalt hover:text-white hover:border-cobalt transition-colors">
                            View
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Program Info */}
        <div className="bg-white border-2 border-charcoal p-4 shadow-brutal-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 text-charcoal/50" />
              <span className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest font-bold">
                Program ID
              </span>
              <code className="font-mono text-xs text-charcoal bg-paper px-2 py-1 border border-charcoal/10">
                {PROGRAM_IDS.COGNISTREAM}
              </code>
            </div>
            <a
              href={getSolscanUrl("address", PROGRAM_IDS.COGNISTREAM)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-[10px] text-cobalt hover:underline"
            >
              View on Solscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
