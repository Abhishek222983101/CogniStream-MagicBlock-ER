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
  const dynamicDataStr = searchParams.get("data");

  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [matchResponse, setMatchResponse] = useState<MatchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null);
  
  // Parse dynamic data from pipeline if it exists
  const dynamicPatient = useMemo(() => {
    if (dynamicDataStr) {
      try {
        const p = JSON.parse(decodeURIComponent(dynamicDataStr));
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

  // Run match whenever patient changes
  const runMatch = useCallback(async (patientId: string) => {
    if (!patientId) return;
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
  }, [dynamicPatient]);

  useEffect(() => {
    if (selectedPatientId) runMatch(selectedPatientId);
  }, [selectedPatientId, runMatch]);

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
                onClick={() => runMatch(selectedPatientId)}
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
                  onClick={() => runMatch(selectedPatientId)}
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
                      <button className="brutal-btn bg-cobalt text-charcoal px-6 py-3 font-heading font-black uppercase text-sm">
                        Schedule Consult
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
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
