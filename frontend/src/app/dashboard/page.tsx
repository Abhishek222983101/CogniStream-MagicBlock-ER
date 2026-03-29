"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  Settings,
  Plus,
  MessageSquare,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Bell,
  ChevronRight,
  FileText,
  MapPin,
  Stethoscope,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  Menu,
  X,
  Filter,
  Download,
  Wifi,
  WifiOff,
  Cpu,
  Loader2,
  TrendingUp,
  Mic,
} from "lucide-react";
import {
  fetchHealth,
  fetchPatients,
  fetchTrials,
  matchAll,
  HealthStatus,
  PatientListItem,
  BackendTrial,
  MatchResponse,
  getScoreColor,
} from "@/lib/api";

type NavItem = "dashboard" | "patients" | "trials" | "settings";

interface MatchState {
  patientId: string;
  loading: boolean;
  result: MatchResponse | null;
  error: string | null;
}

export default function CoordinatorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<NavItem>("dashboard");

  // Real data state
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [trials, setTrials] = useState<BackendTrial[]>([]);
  const [trialsTotal, setTrialsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Per-patient match state
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      const [hRes, pRes, tRes] = await Promise.all([
        fetchHealth(),
        fetchPatients(),
        fetchTrials({ limit: 97 }),
      ]);

      if (hRes.data) {
        setHealth(hRes.data);
        setBackendOnline(hRes.data.status === "ok");
      } else {
        setBackendOnline(false);
      }

      if (pRes.data) setPatients(pRes.data.patients);
      if (tRes.data) {
        setTrials(tRes.data.trials);
        setTrialsTotal(tRes.data.total);
      }
      setLoading(false);
    }
    loadAll();
  }, []);

  const handleMatch = useCallback(async (patientId: string) => {
    setSelectedPatient(patientId);
    setMatchState({ patientId, loading: true, result: null, error: null });
    const { data, error } = await matchAll(patientId, 5);
    setMatchState({
      patientId,
      loading: false,
      result: data,
      error: error,
    });
  }, []);

  const statsData = [
    {
      title: "Active Trials",
      value: loading ? "..." : trialsTotal,
      icon: <FlaskConical className="w-5 h-5" strokeWidth={2} />,
      color: "var(--color-paper)",
      textColor: "var(--color-cobalt)",
    },
    {
      title: "Patients",
      value: loading ? "..." : patients.length,
      icon: <Users className="w-5 h-5" strokeWidth={2} />,
      color: "var(--color-paper)",
      textColor: "var(--color-surgical)",
    },
    {
      title: "Models Loaded",
      value: health
        ? Object.values(health.models_loaded).filter((v) => v === true).length
        : "—",
      icon: <Cpu className="w-5 h-5" strokeWidth={2} />,
      color: "var(--color-paper)",
      textColor: "var(--color-charcoal)",
    },
    {
      title: "GPU Memory",
      value: health?.gpu_memory_gb ? `${health.gpu_memory_gb}GB` : "—",
      icon: <Activity className="w-5 h-5" strokeWidth={2} />,
      color: "var(--color-paper)",
      textColor: "var(--color-iodine)",
    },
  ];

  return (
    <div className="min-h-screen bg-paper font-mono bg-noise overflow-hidden text-charcoal">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.04] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-50 bg-white border-b-2 border-charcoal shadow-brutal-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-paper rounded text-charcoal"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center gap-3 hover:opacity-80">
              <Activity className="w-6 h-6 text-cobalt" strokeWidth={2.5} />
              <div>
                <h1 className="font-heading text-xl font-bold uppercase tracking-tight text-charcoal">
                  CogniStream
                </h1>
                <p className="font-mono text-[10px] text-charcoal/60 uppercase tracking-widest">
                  TrialMatch AI
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-paper border-2 border-charcoal/10 px-3 py-1.5 focus-within:border-cobalt transition-colors">
              <Search className="w-4 h-4 text-charcoal/50 mr-2" />
              <input
                type="text"
                placeholder="Search database..."
                className="bg-transparent border-none outline-none text-sm font-mono placeholder:text-charcoal/40 w-48 text-charcoal"
              />
            </div>

            {/* Backend status indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 border-2 ${
                backendOnline === null
                  ? "border-charcoal/20 text-charcoal/50"
                  : backendOnline
                  ? "border-surgical/30 text-surgical bg-surgical/5"
                  : "border-iodine/30 text-iodine bg-iodine/5"
              }`}
            >
              {backendOnline === null ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : backendOnline ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider hidden md:block">
                {backendOnline === null ? "Connecting" : backendOnline ? "API Online" : "API Offline"}
              </span>
            </div>

            <button className="relative p-2 hover:bg-paper transition-colors text-charcoal/70 hover:text-charcoal">
              <Bell className="w-5 h-5" strokeWidth={2} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-iodine rounded-full border border-white" />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l-2 border-charcoal/10">
              <div className="w-8 h-8 bg-paper border-2 border-charcoal flex items-center justify-center">
                <span className="font-heading font-bold text-charcoal text-sm">RC</span>
              </div>
              <div className="hidden sm:block">
                <p className="font-mono text-xs font-bold uppercase text-charcoal">Dr. Sarah</p>
                <p className="font-mono text-[10px] text-charcoal/50">Coordinator</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative z-10 h-[calc(100vh-60px)]">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r-2 border-charcoal transition-all duration-300 ${
            sidebarOpen ? "w-56" : "w-0 lg:w-16"
          } overflow-hidden flex flex-col`}
        >
          <nav className="flex flex-col h-full py-6">
            <div className="space-y-1 px-3">
              {(
                [
                  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                  { id: "patients", label: "Patients", icon: Users },
                  { id: "trials", label: "Trials", icon: FlaskConical },
                ] as { id: NavItem; label: string; icon: React.ElementType }[]
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveNav(id)}
                  className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all text-sm font-mono ${
                    activeNav === id 
                      ? "bg-paper border-2 border-charcoal font-bold shadow-[2px_2px_0px_0px_rgba(15,15,15,1)]" 
                      : "text-charcoal/70 hover:text-charcoal hover:bg-paper/50 border-2 border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={activeNav === id ? 2.5 : 2} />
                  <span className={!sidebarOpen ? "lg:hidden" : ""}>{label}</span>
                </button>
              ))}

              <div className="my-4 border-t border-charcoal/10 mx-2" />

              <Link href="/chat">
                <button className="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all text-sm font-mono text-charcoal/70 hover:text-charcoal hover:bg-paper/50 border-2 border-transparent">
                  <MessageSquare className="w-4 h-4 shrink-0" strokeWidth={2} />
                  <span className={!sidebarOpen ? "lg:hidden" : ""}>AI Chat</span>
                </button>
              </Link>

              <Link href="/voice">
                <button className="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all text-sm font-mono bg-gradient-to-r from-cobalt/10 to-surgical/10 text-charcoal hover:from-cobalt/20 hover:to-surgical/20 border-2 border-cobalt/20">
                  <Mic className="w-4 h-4 shrink-0 text-cobalt" strokeWidth={2} />
                  <span className={!sidebarOpen ? "lg:hidden" : ""}>Voice AI</span>
                  <span className="ml-auto text-[8px] font-bold bg-surgical text-white px-1.5 py-0.5 rounded uppercase">New</span>
                </button>
              </Link>

              <button
                onClick={() => setActiveNav("settings")}
                className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all text-sm font-mono ${
                  activeNav === "settings" 
                    ? "bg-paper border-2 border-charcoal font-bold shadow-[2px_2px_0px_0px_rgba(15,15,15,1)]" 
                    : "text-charcoal/70 hover:text-charcoal hover:bg-paper/50 border-2 border-transparent"
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" strokeWidth={activeNav === "settings" ? 2.5 : 2} />
                <span className={!sidebarOpen ? "lg:hidden" : ""}>Settings</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col bg-paper/50">
          
          {/* Stat Cards */}
          <div className="p-4 md:p-6 border-b-2 border-charcoal/10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statsData.map((stat, i) => (
                <div key={i} className="bg-white border-2 border-charcoal p-4 shadow-[2px_2px_0px_0px_rgba(15,15,15,0.1)] hover:shadow-[3px_3px_0px_0px_rgba(15,15,15,1)] transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="p-2 border-2 border-charcoal bg-paper flex items-center justify-center"
                      style={{ color: stat.textColor }}
                    >
                      {stat.icon}
                    </div>
                  </div>
                  <p className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-charcoal">
                    {stat.value}
                  </p>
                  <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mt-1 font-bold">
                    {stat.title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── DASHBOARD VIEW ─────────────────────────────────────────── */}
          {activeNav === "dashboard" && (
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-4 md:p-6 gap-6">
              
              {/* Left — Patient Queue */}
              <div className="flex-1 flex flex-col bg-white border-2 border-charcoal shadow-brutal min-h-[400px]">
                <div className="px-4 py-3 border-b-2 border-charcoal flex items-center justify-between bg-paper">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cobalt" strokeWidth={2.5} />
                    <h3 className="font-heading text-sm font-bold uppercase tracking-tight">
                      Patient Queue
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] font-bold bg-charcoal text-white px-2 py-0.5 rounded-sm">
                    {loading ? "…" : `${patients.length} PATIENTS`}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-brutal p-3 space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin text-charcoal/40" />
                    </div>
                  ) : (
                    patients.slice(0, 20).map((p) => (
                      <div
                        key={p.patient_id}
                        onClick={() => setSelectedPatient(p.patient_id)}
                        className={`border-2 p-3 transition-colors cursor-pointer ${
                          selectedPatient === p.patient_id 
                            ? "border-cobalt bg-cobalt/5" 
                            : "border-charcoal/10 hover:border-charcoal/30 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-paper border border-charcoal/20 flex items-center justify-center">
                              <Stethoscope className="w-4 h-4 text-charcoal/70" strokeWidth={2} />
                            </div>
                            <div>
                              <p className="font-heading font-bold uppercase text-xs">
                                {p.patient_id}
                              </p>
                              <p className="font-mono text-[10px] text-charcoal/50">
                                {p.age}y {p.gender === "Male" ? "M" : "F"}
                                {p.city ? ` · ${p.city}` : ""}
                              </p>
                            </div>
                          </div>
                          {matchState?.patientId === p.patient_id && matchState.result && (
                            <span
                              className="px-2 py-0.5 font-mono text-[10px] font-bold text-white border border-charcoal rounded-sm shadow-[1px_1px_0px_0px_rgba(15,15,15,1)]"
                              style={{
                                backgroundColor: getScoreColor(
                                  matchState.result.matches[0]?.composite_score ?? 0
                                ),
                              }}
                            >
                              {Math.round(matchState.result.matches[0]?.composite_score ?? 0)}%
                            </span>
                          )}
                        </div>

                        <div className="bg-paper p-2 border border-charcoal/10">
                          <p className="font-mono text-[10px] font-medium text-charcoal/80">
                            {p.diagnosis}
                            {p.stage ? ` · ${p.stage}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-charcoal/5">
                          <p className="font-mono text-[9px] text-charcoal/40 uppercase tracking-widest">
                            {matchState?.patientId === p.patient_id && matchState.result
                              ? `${matchState.result.total_trials_screened} trials screened`
                              : "Awaiting match"}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMatch(p.patient_id);
                              }}
                              disabled={matchState?.patientId === p.patient_id && matchState.loading}
                              className="flex items-center gap-1 font-mono text-[10px] font-bold bg-white border border-charcoal text-charcoal px-2 py-1 hover:bg-cobalt hover:text-white hover:border-cobalt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {matchState?.patientId === p.patient_id && matchState.loading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>Match <ChevronRight className="w-3 h-3" /></>
                              )}
                            </button>
                            {matchState?.patientId === p.patient_id && matchState.result && (
                              <Link href={`/results?patient=${p.patient_id}`}>
                                <button className="flex items-center gap-1 font-mono text-[10px] font-bold border border-charcoal bg-charcoal text-white px-2 py-1 hover:bg-charcoal/90 transition-colors">
                                  <TrendingUp className="w-3 h-3" /> View
                                </button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right — Match Results / Idle State */}
              <div className="flex-1 flex flex-col bg-white border-2 border-charcoal shadow-brutal min-h-[400px]">
                <div className="px-4 py-3 border-b-2 border-charcoal flex items-center justify-between bg-paper">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-surgical" strokeWidth={2.5} />
                    <h3 className="font-heading text-sm font-bold uppercase tracking-tight">
                      Match Results
                    </h3>
                  </div>
                  {matchState?.result && (
                    <span className="font-mono text-[10px] font-bold bg-surgical/10 text-surgical border border-surgical/30 px-2 py-0.5 rounded-sm">
                      {matchState.result.matches.length} MATCHES
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-brutal p-3 space-y-3">
                  {!matchState && (
                    <div className="flex flex-col items-center justify-center h-full text-charcoal/40 min-h-[200px]">
                      <Activity className="w-10 h-10 mb-3 opacity-20" strokeWidth={1} />
                      <p className="font-mono text-xs uppercase tracking-widest">Select patient to run pipeline</p>
                    </div>
                  )}

                  {matchState?.loading && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 min-h-[200px]">
                      <Loader2 className="w-8 h-8 animate-spin text-cobalt" />
                      <div className="text-center">
                        <p className="font-mono text-sm font-bold text-charcoal">
                          Evaluating {trialsTotal} trials
                        </p>
                        <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest mt-1">
                          Rule Engine · PubMedBERT · Mistral
                        </p>
                      </div>
                    </div>
                  )}

                  {matchState?.error && (
                    <div className="p-3 bg-iodine/10 border border-iodine text-iodine">
                      <p className="font-mono text-xs font-bold">Error: {matchState.error}</p>
                    </div>
                  )}

                  {matchState?.result && (
                    <>
                      <div className="bg-paper p-3 border border-charcoal/20 text-xs font-mono">
                        <p className="text-charcoal font-bold mb-1 leading-relaxed">{matchState.result.patient_summary}</p>
                        <p className="text-charcoal/50 text-[10px] uppercase tracking-widest">
                          Screened {matchState.result.total_trials_screened} trials
                        </p>
                      </div>

                      {matchState.result.matches.map((m) => (
                        <div key={m.trial_id} className="border-2 border-charcoal/10 p-3 bg-white hover:border-charcoal/30 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 border border-charcoal/20 flex items-center justify-center font-mono font-bold text-white text-[10px] rounded-sm"
                                style={{ backgroundColor: getScoreColor(m.composite_score) }}
                              >
                                #{m.rank}
                              </div>
                              <div>
                                <p className="font-heading font-bold text-sm leading-tight max-w-[200px] truncate">
                                  {m.trial_title}
                                </p>
                                <p className="font-mono text-[10px] text-cobalt font-medium">{m.trial_id}</p>
                              </div>
                            </div>
                            <span
                              className="font-mono font-bold text-lg"
                              style={{ color: getScoreColor(m.composite_score) }}
                            >
                              {Math.round(m.composite_score)}%
                            </span>
                          </div>

                          {m.location && (
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-charcoal/60 mb-3 bg-paper inline-flex px-2 py-1 rounded-sm border border-charcoal/5">
                              <MapPin className="w-3 h-3" />
                              {m.location.city}, {m.location.state}
                              {m.distance_km ? ` · ${Math.round(m.distance_km)} km` : ""}
                            </div>
                          )}

                          {/* Score breakdown mini bars */}
                          <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-charcoal/10">
                            {[
                              { label: "RULE", val: m.score_breakdown.rule_engine },
                              { label: "VEC", val: m.score_breakdown.embedding_similarity },
                              { label: "LLM", val: m.score_breakdown.llm_confidence },
                              { label: "GEO", val: m.score_breakdown.geographic },
                            ].map(({ label, val }) => (
                              <div key={label}>
                                <div className="flex justify-between mb-1">
                                  <span className="font-mono text-[8px] text-charcoal/50 font-bold">{label}</span>
                                  <span className="font-mono text-[8px] font-bold">{Math.round(val)}</span>
                                </div>
                                <div className="h-1 bg-paper border border-charcoal/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-cobalt/70"
                                    style={{ width: `${Math.min(100, val)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-charcoal/5">
                            {m.exclusion_triggered ? (
                              <span className="font-mono text-[9px] text-iodine font-bold uppercase tracking-widest flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Exclusion triggered
                              </span>
                            ) : (
                              <span />
                            )}
                            <Link href={`/results?patient=${matchState.patientId}`} className="ml-auto">
                              <button className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-charcoal hover:text-cobalt transition-colors">
                                <FileText className="w-3 h-3" /> Report
                              </button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── PATIENTS VIEW ──────────────────────────────────────────── */}
          {activeNav === "patients" && (
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <div className="bg-white border-2 border-charcoal shadow-brutal mb-6">
                <div className="bg-paper border-b-2 border-charcoal px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-charcoal" strokeWidth={2.5} />
                    <h3 className="font-heading font-bold uppercase text-sm">Patient Database</h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase bg-white text-charcoal px-3 py-1.5 border border-charcoal hover:bg-charcoal hover:text-white transition-colors">
                      <Filter className="w-3 h-3" /> Filter
                    </button>
                  </div>
                </div>
                <div className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-paper/50">
                        <tr className="border-b-2 border-charcoal">
                          {["ID", "Age/Sex", "Location", "Diagnosis", "Stage", "Action"].map((h) => (
                            <th key={h} className="px-4 py-3 font-mono font-bold uppercase text-[10px] tracking-widest text-charcoal/60">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs">
                        {patients.map((p) => (
                          <tr key={p.patient_id} className="border-b border-charcoal/10 hover:bg-paper/30 transition-colors">
                            <td className="px-4 py-3 font-bold text-charcoal">{p.patient_id}</td>
                            <td className="px-4 py-3 text-charcoal/80">{p.age}/{p.gender.charAt(0)}</td>
                            <td className="px-4 py-3 text-charcoal/80">{p.city || "—"}</td>
                            <td className="px-4 py-3 text-charcoal/80 max-w-[200px] truncate">{p.diagnosis}</td>
                            <td className="px-4 py-3 text-charcoal/80">{p.stage || "—"}</td>
                            <td className="px-4 py-3">
                              <Link href={`/results?patient=${p.patient_id}`}>
                                <button className="font-mono text-[10px] font-bold uppercase bg-white border border-charcoal px-2 py-1 hover:bg-cobalt hover:text-white hover:border-cobalt transition-colors">
                                  Match
                                </button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TRIALS VIEW ────────────────────────────────────────────── */}
          {activeNav === "trials" && (
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <div className="bg-white border-2 border-charcoal shadow-brutal mb-6">
                <div className="bg-paper border-b-2 border-charcoal px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-charcoal" strokeWidth={2.5} />
                    <h3 className="font-heading font-bold uppercase text-sm">Trials Database</h3>
                  </div>
                  <span className="font-mono text-[10px] text-charcoal/50 uppercase tracking-widest font-bold">
                    {trialsTotal} Active
                  </span>
                </div>
                <div className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-paper/50">
                        <tr className="border-b-2 border-charcoal">
                          {["NCT ID", "Title", "Phase", "Status", "Sponsor", "Location"].map((h) => (
                            <th key={h} className="px-4 py-3 font-mono font-bold uppercase text-[10px] tracking-widest text-charcoal/60">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs">
                        {trials.map((t) => (
                          <tr key={t.trial_id} className="border-b border-charcoal/10 hover:bg-paper/30 transition-colors">
                            <td className="px-4 py-3 font-bold text-cobalt">{t.trial_id}</td>
                            <td className="px-4 py-3 text-charcoal/80 max-w-xs truncate" title={t.title}>{t.title}</td>
                            <td className="px-4 py-3 text-charcoal/80">{t.phase}</td>
                            <td className="px-4 py-3">
                              <span className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm border ${
                                t.status === "RECRUITING" ? "bg-surgical/10 text-surgical border-surgical/20" : "bg-paper text-charcoal/60 border-charcoal/10"
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-charcoal/80 max-w-[120px] truncate">{t.sponsor}</td>
                            <td className="px-4 py-3 text-charcoal/80 text-[10px]">
                              {t.locations[0]?.city}, {t.locations[0]?.state}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS VIEW ──────────────────────────────────────────── */}
          {activeNav === "settings" && (
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                
                <div className="bg-white border-2 border-charcoal shadow-brutal p-6">
                  <h4 className="font-heading font-bold uppercase mb-4 text-sm border-b border-charcoal/10 pb-2">Hardware Status</h4>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between items-center p-3 bg-paper border border-charcoal/10 rounded-sm">
                      <span className="text-charcoal/60 uppercase tracking-widest font-bold">API Connection</span>
                      <span className={backendOnline ? "text-surgical font-bold" : "text-iodine font-bold"}>
                        {backendOnline === null ? "Checking…" : backendOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    {health?.gpu_name && (
                      <div className="flex justify-between items-center p-3 bg-paper border border-charcoal/10 rounded-sm">
                        <span className="text-charcoal/60 uppercase tracking-widest font-bold">Compute Node</span>
                        <span className="font-bold text-charcoal">{health.gpu_name} ({health.gpu_memory_gb}GB)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border-2 border-charcoal shadow-brutal p-6">
                  <h4 className="font-heading font-bold uppercase mb-4 text-sm border-b border-charcoal/10 pb-2">AI Models Pipeline</h4>
                  <div className="space-y-2 font-mono text-xs">
                    {health ? (
                      [
                        { label: "NER Anonymizer (BERT)", key: "ner_anonymizer" as const },
                        { label: "Semantic Matcher (PubMedBERT)", key: "embedding_matcher" as const },
                        { label: "Local LLM (Mistral-7B LoRA)", key: "llm_matcher_local" as const },
                        { label: "Cloud Fallback (Mistral API)", key: "llm_matcher_api" as const },
                      ].map(({ label, key }) => (
                        <div key={key} className="flex justify-between items-center p-3 bg-paper border border-charcoal/10 rounded-sm">
                          <span className="font-medium">{label}</span>
                          <div className="flex items-center gap-2">
                            {health.models_loaded[key] ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-surgical" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-charcoal/30" />
                            )}
                            <span className={health.models_loaded[key] ? "text-surgical font-bold" : "text-charcoal/40 font-bold"}>
                              {health.models_loaded[key] ? "Active" : "Standby"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-paper flex items-center justify-center gap-2 text-charcoal/50">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Polling models…</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Bottom Bar */}
          <div className="bg-white border-t-2 border-charcoal px-6 py-3 flex items-center justify-between z-10 shrink-0">
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${backendOnline ? "bg-surgical" : "bg-iodine"}`} />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-charcoal/70">
                  {backendOnline ? "System Ready" : "System Offline"}
                </span>
              </div>
            </div>

            <Link href="/pipeline">
              <button className="brutal-btn bg-cobalt text-white px-6 py-2 text-xs uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Process New Patient
              </button>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
