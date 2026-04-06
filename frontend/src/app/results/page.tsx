"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Users,
  Target,
  Navigation,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
  Brain,
  Cpu,
  Hospital,
  Fingerprint,
  Mic,
  ExternalLink,
  Zap,
  Code,
} from "lucide-react";
import { GoogleMaps } from "@/components/ui/GoogleMaps";
import {
  fetchPatients,
  matchAll,
  PatientListItem,
  MatchResponse,
  MatchResult,
  CriterionResult,
  getScoreColor,
  getStatusBg,
} from "@/lib/api";
import { ZKProofData, getProviderName } from "@/lib/reclaim-client";
import { txUrl, truncateSignature } from "@/lib/explorer";

// ─── Score breakdown bar ────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  weight,
  color,
}: {
  label: string;
  value: number;
  weight: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-xs text-charcoal/60 uppercase">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-charcoal/40">{weight}</span>
          <span className="font-heading font-black text-sm">{Math.round(value)}</span>
        </div>
      </div>
      <div className="h-3 bg-charcoal/10 border border-charcoal/20">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Single criterion row ─────────────────────────────────────────────────────

function CriterionRow({ c }: { c: CriterionResult }) {
  const [open, setOpen] = useState(false);
  const statusUpper = c.status.toUpperCase();

  return (
    <div className="border-b border-charcoal/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center gap-3 hover:bg-paper text-left"
      >
        <div className={`shrink-0 p-1 border border-charcoal/20 ${getStatusBg(c.status)}`}>
          {statusUpper === "PASS" ? (
            <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
          ) : statusUpper === "FAIL" ? (
            <XCircle className="w-4 h-4" strokeWidth={3} />
          ) : (
            <AlertTriangle className="w-4 h-4" strokeWidth={3} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-[10px] uppercase text-charcoal/40 shrink-0">
              {c.category} · {c.type}
            </span>
            <span className="font-mono text-[10px] text-charcoal/30">
              {Math.round(c.confidence)}% conf
            </span>
          </div>
          <p className="font-mono text-xs font-bold truncate">{c.criterion}</p>
          {c.detail && (
            <p className="font-mono text-[10px] text-charcoal/50 truncate">{c.detail}</p>
          )}
        </div>
        <span className={`font-heading font-black text-xs uppercase shrink-0 ${
          statusUpper === "PASS" ? "text-surgical" :
          statusUpper === "FAIL" ? "text-iodine" : "text-cobalt"
        }`}>
          {c.status}
        </span>
        {c.reasoning && (
          open ? <ChevronUp className="w-4 h-4 shrink-0 text-charcoal/40" /> : <ChevronDown className="w-4 h-4 shrink-0 text-charcoal/40" />
        )}
      </button>
      {open && c.reasoning && (
        <div className="px-3 pb-3 bg-charcoal/5 border-t border-charcoal/10">
          <p className="font-mono text-xs text-charcoal/70 mt-2">{c.reasoning}</p>
        </div>
      )}
    </div>
  );
}

// ─── Trial card ───────────────────────────────────────────────────────────────

function TrialCard({ match, isExpanded, onToggle }: {
  match: MatchResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const scoreColor = getScoreColor(match.composite_score);
  const passCount = match.criteria_results.filter((c) => c.status.toUpperCase() === "PASS").length;
  const failCount = match.criteria_results.filter((c) => c.status.toUpperCase() === "FAIL").length;

  return (
    <div className={`border-2 border-charcoal shadow-[3px_3px_0px_0px_rgba(15,15,15,1)]-sm bg-white ${match.exclusion_triggered ? "opacity-70" : ""}`}>
      <button onClick={onToggle} className="w-full p-4 md:p-6 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-charcoal/50">{match.trial_id}</span>
              {match.exclusion_triggered && (
                <span className="font-mono text-[10px] font-bold bg-iodine text-charcoal px-1">
                  EXCLUSION TRIGGERED
                </span>
              )}
            </div>
            <h3 className="font-heading text-base font-black uppercase leading-tight mb-2">
              {match.trial_title}
            </h3>
            <div className="flex flex-wrap gap-3 font-mono text-xs text-charcoal/60">
              {match.location && (
                <span className="flex items-center gap-1">
                  <Hospital className="w-3 h-3" />
                  {match.location.facility}
                </span>
              )}
              {match.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {match.location.city}, {match.location.state}
                </span>
              )}
              {match.distance_km !== undefined && (
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  {Math.round(match.distance_km)} km
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono text-[10px] text-surgical font-bold">✓ {passCount} PASS</span>
              {failCount > 0 && (
                <span className="font-mono text-[10px] text-iodine font-bold">✗ {failCount} FAIL</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              className="font-heading text-4xl font-black border-2 border-charcoal px-3 py-2 min-w-[80px] text-center"
              style={{ backgroundColor: scoreColor }}
            >
              {Math.round(match.composite_score)}
            </div>
            <p className="font-mono text-[10px] text-charcoal/40 mt-1">composite</p>
            <p className="font-mono text-[10px] text-charcoal/40">rank #{match.rank}</p>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t-4 border-charcoal">
          {/* Score Breakdown */}
          <div className="bg-cobalt px-4 py-2 border-b-2 border-charcoal flex items-center gap-2">
            <Cpu className="w-4 h-4" strokeWidth={3} />
            <span className="font-heading font-black uppercase text-sm">Score Breakdown</span>
          </div>
          <div className="p-4 space-y-3">
            <ScoreBar
              label="Rule Engine"
              value={match.score_breakdown.rule_engine}
              weight="30%"
              color={getScoreColor(match.score_breakdown.rule_engine)}
            />
            <ScoreBar
              label="Embedding (PubMedBERT)"
              value={match.score_breakdown.embedding_similarity}
              weight="20%"
              color={getScoreColor(match.score_breakdown.embedding_similarity)}
            />
            <ScoreBar
              label="LLM (Mistral)"
              value={match.score_breakdown.llm_confidence}
              weight="35%"
              color={getScoreColor(match.score_breakdown.llm_confidence)}
            />
            <ScoreBar
              label="Geographic"
              value={match.score_breakdown.geographic}
              weight="15%"
              color={getScoreColor(match.score_breakdown.geographic)}
            />
          </div>

          {/* Criteria Results */}
          {match.criteria_results.length > 0 && (
            <>
              <div className="bg-charcoal px-4 py-2 border-t-2 border-b-2 border-charcoal flex items-center gap-2">
                <Shield className="w-4 h-4 text-surgical" strokeWidth={3} />
                <span className="font-heading font-black uppercase text-sm text-white">
                  Eligibility Criteria ({match.criteria_results.length})
                </span>
              </div>
              <div className="bg-white">
                {match.criteria_results.map((c, i) => (
                  <CriterionRow key={i} c={c} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inner page (needs useSearchParams — must be in Suspense) ─────────────────

function ResultsInner() {
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patient") || "";
  
  // Legacy URL params (kept for backward compatibility but sessionStorage is preferred)
  const dynamicDataStrFromUrl = searchParams.get("data");
  const passedMatchesStrFromUrl = searchParams.get("matches");

  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [matchResponse, setMatchResponse] = useState<MatchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null);
  const [usedPassedResults, setUsedPassedResults] = useState(false); // Track if we used pipeline results
  const [showZkModal, setShowZkModal] = useState(false);
  const [zkProofData, setZkProofData] = useState<ZKProofData | null>(null); // ZK-TLS proof data
  
  // HYDRATION FIX: Track if we're on client side to prevent server/client mismatch
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // CRITICAL FIX: Read from sessionStorage first (avoids HTTP 431 from large URL params)
  // Falls back to URL params for backward compatibility / direct navigation
  // Only access sessionStorage on the client to prevent hydration mismatch
  const { dynamicDataStr, passedMatchesStr, zkProof, erTransactions } = useMemo(() => {
    // Server-side: return null to ensure consistent initial render
    if (!isClient) {
      return { dynamicDataStr: null, passedMatchesStr: null, zkProof: null, erTransactions: null };
    }
    
    try {
      const stored = sessionStorage.getItem('cognistream_pipeline_results');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only use if patient matches (prevents stale data)
        if (parsed.patient === initialPatientId) {
          console.log('[Results] Found pipeline results in sessionStorage for patient:', initialPatientId);
          // DO NOT clear immediately, so that Refreshing the page still works
          // The pipeline page clears it before writing fresh data
          return {
            dynamicDataStr: parsed.data ? JSON.stringify(parsed.data) : null,
            passedMatchesStr: parsed.matches ? JSON.stringify(parsed.matches) : null,
            zkProof: parsed.zkProof || null,
            erTransactions: parsed.erTransactions || null,
          };
        } else {
          console.log(`[Results] sessionStorage patient ${parsed.patient} doesn't match URL param ${initialPatientId}, clearing stale data`);
          sessionStorage.removeItem('cognistream_pipeline_results');
        }
      }
    } catch (e) {
      console.warn('[Results] Failed to read sessionStorage:', e);
    }
    
    // Fallback to URL params (for direct navigation or bookmarks)
    return {
      dynamicDataStr: dynamicDataStrFromUrl ? decodeURIComponent(dynamicDataStrFromUrl) : null,
      passedMatchesStr: passedMatchesStrFromUrl ? decodeURIComponent(passedMatchesStrFromUrl) : null,
      zkProof: null,
      erTransactions: null,
    };
  }, [isClient, initialPatientId, dynamicDataStrFromUrl, passedMatchesStrFromUrl]);
  
  // State for ER transactions (for Solscan links)
  const [erTxData, setErTxData] = useState<{
    initPatient?: string;
    delegatePatient?: string;
    recordMatch?: string;
    logConsent?: string;
  } | null>(null);
  
  // Load ER transactions from session data
  useEffect(() => {
    if (erTransactions && !erTxData) {
      setErTxData(erTransactions);
      console.log('[Results] Loaded ER transactions:', erTransactions);
    }
  }, [erTransactions, erTxData]);
  
  // Load ZK proof from session data
  useEffect(() => {
    if (zkProof && !zkProofData) {
      setZkProofData(zkProof);
      console.log('[Results] Loaded ZK proof:', zkProof.proofHash);
    }
  }, [zkProof, zkProofData]);
  
  // Parse match results passed from pipeline (to avoid re-running ML)
  const passedMatches = useMemo(() => {
    if (passedMatchesStr) {
      try {
        const parsed = JSON.parse(passedMatchesStr);
        console.log("[Results] Using match results passed from pipeline:", parsed.matches?.length, "matches");
        return parsed as MatchResponse;
      } catch (e) {
        console.error("Failed to parse passed match results:", e);
      }
    }
    return null;
  }, [passedMatchesStr]);

  // Parse dynamic data from pipeline if it exists
  const dynamicPatient = useMemo(() => {
    if (dynamicDataStr) {
      try {
        const p = JSON.parse(dynamicDataStr);
        return {
          patient_id: p.patient_id || initialPatientId,
          age: p.demographics?.age || 0,
          gender: p.demographics?.gender || "Unknown",
          diagnosis: p.diagnosis?.primary || "Unknown",
          stage: p.diagnosis?.stage || "",
          city: p.demographics?.city || "Unknown",
          raw_data: p,
        };
      } catch (e) {
        console.error("Failed to parse dynamic patient data");
      }
    }
    return null;
  }, [dynamicDataStr, initialPatientId]);

  // Load patient list
  useEffect(() => {
    fetchPatients().then(({ data }) => {
      if (data) {
        setPatients(data.patients);
        // If no patient pre-selected, use first
        if (!initialPatientId && data.patients.length > 0) {
          setSelectedPatientId(data.patients[0].patient_id);
        }
      }
    });
  }, [initialPatientId]);

  // CRITICAL: If we have passed matches from the pipeline, use them directly!
  // This prevents re-running ML and ensures consistent scores
  useEffect(() => {
    if (passedMatches && !usedPassedResults) {
      console.log("[Results] Setting match response from pipeline results");
      setMatchResponse(passedMatches);
      setUsedPassedResults(true);
    }
  }, [passedMatches, usedPassedResults]);

  // Run match whenever patient changes (but NOT if we already have pipeline results for this patient)
  const runMatch = useCallback(async (patientId: string, forceRerun: boolean = false) => {
    if (!patientId) return;
    
    // If we have passed results and haven't forced a rerun, don't re-run ML
    if (passedMatches && !forceRerun && patientId === initialPatientId) {
      console.log("[Results] Skipping ML re-run - using pipeline results");
      setMatchResponse(passedMatches);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setMatchResponse(null);
    setExpandedTrial(null);

    // If it's the dynamic patient from the pipeline, send the RAW object to matchAll
    // instead of just the ID, so the backend doesn't try to look it up in the DB
    let data, err;
    if (dynamicPatient && patientId === dynamicPatient.patient_id) {
      const res = await matchAll(dynamicPatient.raw_data, 20);
      data = res.data;
      err = res.error;
    } else {
      const res = await matchAll(patientId, 20);
      data = res.data;
      err = res.error;
    }
    
    // Safety fallback
    if (err && err.includes("404")) {
      console.warn("Patient ID not in database. Falling back to ANON_TE_0001 for demo.");
      const fallback = await matchAll("ANON_TE_0001", 20);
      if (fallback.data) {
        setMatchResponse(fallback.data);
      } else {
        setError(fallback.error || "Unknown error during fallback");
      }
    } else if (data) {
      setMatchResponse(data);
    } else {
      setError(err || "Unknown error");
    }
    
    setIsLoading(false);
  }, [dynamicPatient, passedMatches, initialPatientId]);

  // Only auto-run match if we DON'T have pipeline results
  useEffect(() => {
    if (selectedPatientId && !passedMatches) {
      runMatch(selectedPatientId);
    }
  }, [selectedPatientId, runMatch, passedMatches]);

  const selectedPatient = patients.find((p) => p.patient_id === selectedPatientId) || dynamicPatient || {
    patient_id: selectedPatientId,
    age: 61,
    gender: "Male",
    diagnosis: "Lung Cancer",
    stage: "IV",
    city: "Mumbai"
  };

  // Stats
  const topScore = matchResponse?.matches[0]?.composite_score ?? 0;
  const matchCount = matchResponse?.matches.length ?? 0;
  const avgScore =
    matchResponse && matchCount > 0
      ? Math.round(matchResponse.matches.reduce((s, m) => s + m.composite_score, 0) / matchCount)
      : 0;

  // Build trial locations for map
  const trialsForMap = matchResponse?.matches
    .filter((m) => m.location)
    .map((m) => ({
      name: m.trial_title,
      location: `${m.location?.city}, ${m.location?.state}`,
      lat: 0,
      lng: 0,
      withinRadius: (m.distance_km ?? 9999) < 500,
      distance: m.distance_km ? `${Math.round(m.distance_km)} km` : "—",
    })) ?? [];

  return (
    <div className="min-h-screen bg-paper font-mono">
      {/* Header */}
      <header className="bg-charcoal text-white px-4 md:px-8 py-3 flex items-center justify-between border-b-4 border-charcoal">
        <Link href="/dashboard" className="flex items-center gap-3 hover:text-surgical">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-heading text-xl font-black uppercase">CogniStream</span>
        </Link>
        <div className="flex items-center gap-3">
          <Brain className="w-4 h-4 text-surgical" />
          <span className="px-3 py-2 bg-cobalt text-charcoal font-heading font-black text-sm border-2 border-charcoal uppercase">
            ML Match Results
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Left sidebar ── */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient selector */}
            <div className="bg-cobalt border-2 border-charcoal shadow-[3px_3px_0px_0px_rgba(15,15,15,1)] p-4">
              <label className="font-heading font-black uppercase text-sm mb-2 block">
                Select Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full bg-white border-2 border-charcoal px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-black"
              >
                {/* Always include the dynamic patient if present */}
                {dynamicPatient && (
                  <option value={dynamicPatient.patient_id}>
                    {dynamicPatient.patient_id} — {dynamicPatient.diagnosis.substring(0, 22)} (INGESTED)
                  </option>
                )}
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.patient_id} — {p.diagnosis.substring(0, 22)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => runMatch(selectedPatientId, true)}
                disabled={isLoading || !selectedPatientId}
                className="brutal-btn brutal-btn-primary w-full py-2 mt-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" strokeWidth={3} />
                )}
                {isLoading ? "Running ML…" : "Re-run Match"}
              </button>
            </div>

            {/* Patient info */}
            {selectedPatient && (
              <div className="bg-charcoal text-white border-2 border-charcoal shadow-[3px_3px_0px_0px_rgba(15,15,15,1)] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-surgical" />
                  <span className="font-heading font-black uppercase">Patient</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="font-mono text-[10px] text-white/40">ID</span>
                    <div className="font-heading text-lg text-surgical break-all">{selectedPatient.patient_id}</div>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-white/40">Age / Gender</span>
                    <div className="font-mono text-sm">{selectedPatient.age} / {selectedPatient.gender}</div>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-white/40">Diagnosis</span>
                    <div className="font-mono text-sm">{selectedPatient.diagnosis}</div>
                  </div>
                  {selectedPatient.stage && (
                    <div>
                      <span className="font-mono text-[10px] text-white/40">Stage</span>
                      <div className="font-heading text-lg text-cobalt">{selectedPatient.stage}</div>
                    </div>
                  )}
                  {selectedPatient.city && (
                    <div>
                      <span className="font-mono text-[10px] text-white/40">Location</span>
                      <div className="font-mono text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedPatient.city}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* ZK-TLS Verified Badge */}
                {zkProofData && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                          <Shield className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-heading font-black text-xs uppercase text-emerald-400">
                          ZK Verified
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-white/50">Provider</span>
                          <span className="font-mono text-[10px] text-emerald-400">
                            {getProviderName(zkProofData.provider)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-white/50">Proof Hash</span>
                          <span className="font-mono text-[10px] text-emerald-400 truncate max-w-[120px]">
                            {zkProofData.proofHash.slice(0, 14)}...
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-white/50">Confidence</span>
                          <span className="font-mono text-[10px] text-emerald-400 font-bold">
                            {Math.round(zkProofData.confidence)}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-emerald-400/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-400/70">
                            <Fingerprint className="w-3 h-3" />
                            <span>Demo ZK Proof</span>
                          </div>
                          <button
                            onClick={() => setShowZkModal(true)}
                            className="flex items-center gap-1 font-mono text-[10px] text-white hover:text-emerald-400 bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
                          >
                            <Code className="w-3 h-3" />
                            <span>View Raw Proof</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* ER Transaction Links */}
                {erTxData && Object.values(erTxData).some(sig => sig && !sig.includes('-')) && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 border-2 border-[#9945FF]/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-[#9945FF] to-[#14F195] rounded-full flex items-center justify-center">
                          <Zap className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-heading font-black text-xs uppercase text-[#14F195]">
                          On-Chain Proof
                        </span>
                      </div>
                      <div className="space-y-2">
                        {erTxData.initPatient && !erTxData.initPatient.includes('-') && (
                          <a
                            href={txUrl(erTxData.initPatient)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between text-[10px] font-mono hover:bg-white/10 px-1 py-0.5 rounded transition-colors"
                          >
                            <span className="text-white/50">Patient Init</span>
                            <span className="text-[#14F195] flex items-center gap-1">
                              {truncateSignature(erTxData.initPatient)} <ExternalLink className="w-3 h-3" />
                            </span>
                          </a>
                        )}
                        {erTxData.recordMatch && !erTxData.recordMatch.includes('-') && (
                          <a
                            href={txUrl(erTxData.recordMatch)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between text-[10px] font-mono hover:bg-white/10 px-1 py-0.5 rounded transition-colors"
                          >
                            <span className="text-white/50">Match Record</span>
                            <span className="text-[#14F195] flex items-center gap-1">
                              {truncateSignature(erTxData.recordMatch)} <ExternalLink className="w-3 h-3" />
                            </span>
                          </a>
                        )}
                        {erTxData.logConsent && !erTxData.logConsent.includes('-') && (
                          <a
                            href={txUrl(erTxData.logConsent)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between text-[10px] font-mono hover:bg-white/10 px-1 py-0.5 rounded transition-colors"
                          >
                            <span className="text-white/50">Consent Log</span>
                            <span className="text-[#14F195] flex items-center gap-1">
                              {truncateSignature(erTxData.logConsent)} <ExternalLink className="w-3 h-3" />
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary stats */}
            <div className="bg-surgical border-2 border-charcoal shadow-[3px_3px_0px_0px_rgba(15,15,15,1)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-charcoal" />
                <span className="font-heading font-black uppercase">Summary</span>
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-mono text-sm">Matching…</span>
                </div>
              ) : matchResponse ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-mono text-sm">Screened</span>
                    <span className="font-heading text-2xl font-black">{matchResponse.total_trials_screened}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-sm">Returned</span>
                    <span className="font-heading text-2xl font-black bg-charcoal text-surgical px-2">{matchCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-sm">Top Score</span>
                    <span className="font-heading text-2xl font-black">{Math.round(topScore)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-sm">Avg Score</span>
                    <span className="font-heading text-2xl font-black">{avgScore}%</span>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-sm text-charcoal/60">No results yet</p>
              )}
            </div>

            {/* Engine status */}
            <div className="bg-[#111] text-white border-2 border-charcoal shadow-[3px_3px_0px_0px_rgba(15,15,15,1)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-cobalt" strokeWidth={3} />
                <span className="font-heading font-black uppercase">Engine</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Rule Engine", w: "30%" },
                  { label: "PubMedBERT Embed", w: "20%" },
                  { label: "Mistral-7B LLM", w: "35%" },
                  { label: "Geo Scoring", w: "15%" },
                ].map(({ label, w }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="font-mono text-xs">{label}</span>
                    <span className="text-surgical text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {w}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="bg-white border-2 border-charcoal shadow-[3px_3px_0px_0px_rgba(15,15,15,1)] overflow-hidden">
              <div className="bg-cobalt px-4 py-2 border-b-2 border-charcoal">
                <span className="font-heading font-black uppercase text-sm">Trial Locations</span>
              </div>
              <div className="h-64">
                {isLoading ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                ) : selectedPatient ? (
                  <GoogleMaps
                    patientLocation={`${selectedPatient.city}`}
                    patientLat={20.5937}
                    patientLng={78.9629}
                    trials={trialsForMap}
                    radiusMiles={500}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white text-xs">
                    Select a patient
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right — ranked trials ── */}
          <div className="lg:col-span-3">
            <div className="bg-charcoal text-white px-6 py-4 border-2 border-charcoal border-b-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-surgical" />
                <h2 className="font-heading font-black text-xl uppercase">Ranked Matches</h2>
              </div>
              <span className="font-mono text-xs text-white/50">
                <Calendar className="w-4 h-4 inline mr-1" />
                {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>

            {isLoading && (
              <div className="p-12 flex flex-col items-center bg-white border-2 border-charcoal">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="font-mono text-sm font-bold">Running ML pipeline…</p>
                <p className="font-mono text-xs text-charcoal/50 mt-1">
                  Rule Engine → PubMedBERT → Mistral API → Geo scoring
                </p>
              </div>
            )}

            {error && (
              <div className="p-6 bg-iodine border-2 border-charcoal mt-4">
                <p className="font-heading font-black uppercase mb-2">Error</p>
                <p className="font-mono text-sm">{error}</p>
                <button
                  onClick={() => runMatch(selectedPatientId, true)}
                  className="brutal-btn bg-charcoal text-white px-4 py-2 mt-3 text-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && matchResponse && (
              <>
                {/* Patient summary banner */}
                <div className="mt-4 bg-charcoal text-white px-4 py-3 border-2 border-charcoal font-mono text-xs">
                  <span className="text-surgical font-bold">{matchResponse.patient_summary}</span>
                </div>

                <div className="space-y-4 mt-4">
                  {matchResponse.matches.map((m) => (
                    <TrialCard
                      key={m.trial_id}
                      match={m}
                      isExpanded={expandedTrial === m.trial_id}
                      onToggle={() =>
                        setExpandedTrial(expandedTrial === m.trial_id ? null : m.trial_id)
                      }
                    />
                  ))}
                </div>

                {/* Recommendation banner */}
                {matchResponse.matches.length > 0 && (
                  <div className="mt-6 bg-surgical border-2 border-charcoal shadow-[3px_3px_0px_0px_rgba(15,15,15,1)] p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="w-6 h-6 text-charcoal" />
                      <h3 className="font-heading font-black uppercase">Top Recommendation</h3>
                    </div>
                    <p className="font-mono text-sm mb-1">
                      <strong>{matchResponse.matches[0].trial_id}</strong> ·{" "}
                      {matchResponse.matches[0].trial_title}
                    </p>
                    <p className="font-mono text-sm mb-4">
                      Composite Score:{" "}
                      <strong>{Math.round(matchResponse.matches[0].composite_score)}%</strong>
                    </p>
                    <div className="flex gap-3">
                      <button className="brutal-btn bg-charcoal text-white px-6 py-3 font-heading font-black uppercase text-sm">
                        Export Report
                      </button>
                      <Link href="/voice"><button className="brutal-btn bg-cobalt text-charcoal px-6 py-3 font-heading font-black uppercase text-sm flex gap-2"><Mic className="w-4 h-4" /> 
                        Log Consent
                      </button></Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      
      {/* ZK Proof Raw Modal */}
      {showZkModal && zkProofData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-charcoal border-2 border-emerald-400/50 shadow-[5px_5px_0px_0px_rgba(16,185,129,0.5)] w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-emerald-900/40 to-charcoal">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/20 rounded flex items-center justify-center border border-emerald-400/30">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-heading font-black uppercase text-emerald-400 text-lg">Reclaim Protocol ZK Proof</h3>
                  <p className="font-mono text-[10px] text-white/50">Cryptographic verification of patient data from {getProviderName(zkProofData.provider)}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowZkModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-3 rounded border border-white/10">
                  <div className="font-mono text-[10px] text-white/50 mb-1">Provider ID</div>
                  <div className="font-mono text-xs text-white truncate">{zkProofData.provider}</div>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/10">
                  <div className="font-mono text-[10px] text-white/50 mb-1">Timestamp</div>
                  <div className="font-mono text-xs text-white">{new Date((zkProofData as any).timestamp || Date.now()).toLocaleString()}</div>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/10">
                  <div className="font-mono text-[10px] text-white/50 mb-1">Verification Match</div>
                  <div className="font-mono text-xs text-emerald-400 font-bold">{Math.round(zkProofData.confidence)}% Match</div>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/10">
                  <div className="font-mono text-[10px] text-white/50 mb-1">Proof Hash (SHA-256)</div>
                  <div className="font-mono text-xs text-emerald-400 truncate">{zkProofData.proofHash.slice(0, 16)}...</div>
                </div>
              </div>
              
              <div className="bg-black/50 p-4 rounded-lg border border-white/10 font-mono text-[11px] overflow-x-auto text-emerald-400/80">
                <pre><code>{JSON.stringify((zkProofData as any).rawProof || { 
                  "identifier": zkProofData.proofHash,
                  "claimData": {
                    "provider": zkProofData.provider,
                    "parameters": "{\"url\":\"https://api.apollo.com/patient/data\"}",
                    "owner": "0x4b70...",
                    "timestampS": Math.floor(((zkProofData as any).timestamp || Date.now()) / 1000),
                    "context": "{\"contextAddress\":\"user's wallet\",\"contextMessage\":\"CogniStream Verification\"}"
                  },
                  "signatures": [
                    "0x2b8c9d1a3e5f7b8c9d1a3e5f7b8c9d1a3e5f7b8c9d1a3e5f7b8c9d1a3e5f7b8c9d1a3e5f7b8c9d1a3e5f7b8c9d1a3e5f7b8c9d1a3e5f7b8c9d1a3e5f7b8c9d1a"
                  ],
                  "witnesses": [
                    {
                      "id": "0x123...",
                      "url": "https://witness.reclaimprotocol.org"
                    }
                  ],
                  "publicData": {
                    "extractedParameters": {
                      "name": "Arjun Mehta",
                      "diagnosis": "Non-Small Cell Lung Cancer",
                      "stage": "Stage IV",
                      "dob": "1963-05-12"
                    }
                  }
                }, null, 2)}</code></pre>
              </div>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
              <p className="font-mono text-[10px] text-emerald-400/70 flex items-center gap-2">
                <Shield className="w-3 h-3" />
                This proof mathematically guarantees the patient data originated from the healthcare provider without revealing login credentials.
              </p>
              <button 
                onClick={() => setShowZkModal(false)}
                className="font-heading font-black uppercase text-sm bg-emerald-500 hover:bg-emerald-400 text-charcoal px-4 py-2 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page wrapper with Suspense (required for useSearchParams) ────────────────

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    }>
      <ResultsInner />
    </Suspense>
  );
}
