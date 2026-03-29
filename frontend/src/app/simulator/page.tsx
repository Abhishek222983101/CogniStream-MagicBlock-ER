"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Keyboard,
  Shield,
  Brain,
  Send,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ============================================================
// TYPES
// ============================================================
interface ChatMessage {
  id: number;
  text: string;
  sender: "user" | "contact";
  timestamp: string;
}

interface KinematicDataPoint {
  index: number;
  value: number;
  baseline: number;
}

// ============================================================
// CONSTANTS — Phase 6: tuned for the 2-minute demo
// Normal typing:  flight ~60-150ms, dwell ~70-120ms
// Intentional slow: flight >350ms, dwell >250ms → score tanks
// ============================================================
const FLIGHT_BASELINE = 120;
const DWELL_BASELINE = 100;
const ROLLING_WINDOW = 15;
const CHART_HISTORY = 50;
const SCORE_INITIAL = 95;

// Penalty multipliers — cranked up so slow typing crashes fast
const FLIGHT_PENALTY_WEIGHT = 45;
const DWELL_PENALTY_WEIGHT = 40;
const CORRECTION_PENALTY_WEIGHT = 25;

// Pre-populated chat to make it look like a real conversation
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    text: "Hey Maa! Just checking in on you. How's your morning going?",
    sender: "contact",
    timestamp: "10:30 AM",
  },
  {
    id: 2,
    text: "Did you remember to take your medication today?",
    sender: "contact",
    timestamp: "10:31 AM",
  },
  {
    id: 3,
    text: "Also, Dr. Sharma moved your appointment to Thursday at 2pm. Don't forget!",
    sender: "contact",
    timestamp: "10:32 AM",
  },
];

// ============================================================
// PAGE COMPONENT
// ============================================================
export default function SimulatorPage() {
  // ========================================================
  // PHASE 1 — State Management & Kinematic Engine
  // ========================================================
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [flightTimes, setFlightTimes] = useState<KinematicDataPoint[]>([]);
  const [dwellTimes, setDwellTimes] = useState<KinematicDataPoint[]>([]);
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [cognitiveScore, setCognitiveScore] = useState(SCORE_INITIAL);
  const [isAnomalyDetected, setIsAnomalyDetected] = useState(false);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);

  // Refs for precise sub-millisecond timing — never stale
  const lastKeyUpTimeRef = useRef<number>(0);
  const activeKeysRef = useRef<Map<string, number>>(new Map());
  const keystrokeIndexRef = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Rolling windows for score calculation (kept outside React
  // state to avoid re-render lag on every single keystroke)
  const recentFlightsRef = useRef<number[]>([]);
  const recentDwellsRef = useRef<number[]>([]);

  // ========================================================
  // PHASE 3 — The Mathematical Engine
  // ========================================================

  /** Compute Cognitive Fluidity Score from rolling averages */
  const calculateScore = useCallback(
    (bsCount: number, totalKs: number): number => {
      const flights = recentFlightsRef.current;
      const dwells = recentDwellsRef.current;

      // Need minimum data before scoring
      if (flights.length < 3 && dwells.length < 3) return SCORE_INITIAL;

      let score = 100;

      // Flight time penalty
      if (flights.length > 0) {
        const avgFlight =
          flights.reduce((a, b) => a + b, 0) / flights.length;
        const deviation = Math.max(0, avgFlight - FLIGHT_BASELINE) / FLIGHT_BASELINE;
        score -= deviation * FLIGHT_PENALTY_WEIGHT;
      }

      // Dwell time penalty
      if (dwells.length > 0) {
        const avgDwell =
          dwells.reduce((a, b) => a + b, 0) / dwells.length;
        const deviation = Math.max(0, avgDwell - DWELL_BASELINE) / DWELL_BASELINE;
        score -= deviation * DWELL_PENALTY_WEIGHT;
      }

      // Correction frequency penalty
      const bsRatio = bsCount / Math.max(totalKs, 1);
      score -= bsRatio * CORRECTION_PENALTY_WEIGHT;

      return Math.max(0, Math.min(100, Math.round(score)));
    },
    []
  );

  // --- onKeyDown: Flight Time + record dwell start ---
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const now = Date.now();
      const key = e.key;

      // Track corrections
      if (key === "Backspace") {
        setBackspaceCount((p) => p + 1);
      }

      // Skip modifiers
      if (
        ["Shift", "Control", "Alt", "Meta", "Tab", "CapsLock"].includes(key)
      )
        return;

      // --- FLIGHT TIME ---
      if (lastKeyUpTimeRef.current > 0) {
        const flight = Math.min(now - lastKeyUpTimeRef.current, 2000);
        const idx = keystrokeIndexRef.current;

        setFlightTimes((prev) =>
          [...prev, { index: idx, value: flight, baseline: FLIGHT_BASELINE }].slice(
            -CHART_HISTORY
          )
        );

        recentFlightsRef.current.push(flight);
        if (recentFlightsRef.current.length > ROLLING_WINDOW)
          recentFlightsRef.current.shift();
      }

      // Record press-start for dwell calculation
      if (!activeKeysRef.current.has(key)) {
        activeKeysRef.current.set(key, now);
      }

      setTotalKeystrokes((p) => p + 1);
      keystrokeIndexRef.current++;
    },
    []
  );

  // --- onKeyUp: Dwell Time + update lastKeyUpTime ---
  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const now = Date.now();
      const key = e.key;

      lastKeyUpTimeRef.current = now;

      if (
        ["Shift", "Control", "Alt", "Meta", "Tab", "CapsLock"].includes(key)
      )
        return;

      const start = activeKeysRef.current.get(key);
      if (start !== undefined) {
        const dwell = Math.min(now - start, 2000);
        const idx = keystrokeIndexRef.current;

        setDwellTimes((prev) =>
          [...prev, { index: idx, value: dwell, baseline: DWELL_BASELINE }].slice(
            -CHART_HISTORY
          )
        );

        recentDwellsRef.current.push(dwell);
        if (recentDwellsRef.current.length > ROLLING_WINDOW)
          recentDwellsRef.current.shift();

        activeKeysRef.current.delete(key);
      }
    },
    []
  );

  // ========================================================
  // PHASE 6 — Score recalculation on every data change
  // ========================================================
  useEffect(() => {
    const newScore = calculateScore(backspaceCount, totalKeystrokes);
    setCognitiveScore(newScore);
    setIsAnomalyDetected(newScore < 70);
  }, [flightTimes, dwellTimes, backspaceCount, totalKeystrokes, calculateScore]);

  // ========================================================
  // Chat helpers
  // ========================================================
  const handleSendMessage = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text, sender: "user", timestamp },
    ]);
    setInputValue("");
  }, [inputValue]);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      handleKeyDown(e);
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleKeyDown, handleSendMessage]
  );

  // Auto-scroll chat on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ========================================================
  // PHASE 4 & 6 — Score-driven color & label logic
  // ========================================================
  const scoreColor = useMemo(() => {
    if (cognitiveScore > 85) return "#A7F3D0";
    if (cognitiveScore > 70) return "#FFD700";
    return "#FF6B6B";
  }, [cognitiveScore]);

  const scoreLabel = useMemo(() => {
    if (cognitiveScore > 85) return "OPTIMAL FLUIDITY";
    if (cognitiveScore > 70) return "MILD COGNITIVE FRICTION";
    return "ANOMALY DETECTED";
  }, [cognitiveScore]);

  // Rolling averages for metric cards display
  const avgFlight = useMemo(() => {
    if (flightTimes.length === 0) return null;
    const window = flightTimes.slice(-ROLLING_WINDOW);
    return Math.round(window.reduce((a, b) => a + b.value, 0) / window.length);
  }, [flightTimes]);

  const avgDwell = useMemo(() => {
    if (dwellTimes.length === 0) return null;
    const window = dwellTimes.slice(-ROLLING_WINDOW);
    return Math.round(window.reduce((a, b) => a + b.value, 0) / window.length);
  }, [dwellTimes]);

  // ========================================================
  // RENDER
  // ========================================================
  return (
    <div className="h-screen flex flex-col bg-cream font-mono bg-noise overflow-hidden">
      {/* ===== TOP BAR ===== */}
      <header className="bg-black text-white px-4 md:px-8 py-3 flex items-center justify-between border-brutal-b shrink-0 z-50">
        <Link
          href="/"
          className="flex items-center gap-3 hover:text-lime-green transition-colors"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
          <span className="font-heading text-lg md:text-2xl font-black uppercase tracking-tighter">
            CogniStream
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Live status indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 border-2 border-white/30">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                totalKeystrokes > 0
                  ? "bg-lime-green animate-pulse"
                  : "bg-white/30"
              }`}
            />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              {totalKeystrokes > 0 ? "MONITORING ACTIVE" : "AWAITING INPUT"}
            </span>
          </div>
          <div className="px-3 py-2 bg-hot-coral text-black font-heading font-black text-sm md:text-base border-2 border-black uppercase">
            Live Demo
          </div>
        </div>
      </header>

      {/* ===== SPLIT SCREEN ===== */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden min-h-0">
        {/* ================================================ */}
        {/* LEFT PANE — PHASE 2: Chat Simulator              */}
        {/* ================================================ */}
        <div className="flex flex-col bg-cream border-r-0 lg:border-brutal-r overflow-hidden">
          {/* Chat header */}
          <div className="bg-lime-green px-4 md:px-6 py-3 border-brutal-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-black border-2 border-black flex items-center justify-center shrink-0">
                <span className="text-lime-green font-heading font-black text-sm md:text-lg">
                  SM
                </span>
              </div>
              <div>
                <h3 className="font-heading font-black text-base md:text-xl uppercase tracking-tight leading-none">
                  Sita (Maa)
                </h3>
                <p className="font-mono text-xs font-bold text-black/60">
                  Patient &bull; Active Now
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-black text-lime-green border-2 border-black">
              <Shield className="w-3 h-3" strokeWidth={3} />
              <span className="font-mono text-[10px] font-bold uppercase">
                Privacy On
              </span>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 min-h-0">
            {/* System notice */}
            <div className="text-center mb-4">
              <div className="inline-block bg-cyber-yellow px-3 py-1.5 border-2 border-black font-mono text-[10px] font-bold uppercase shadow-brutal-sm">
                <Keyboard
                  className="inline w-3 h-3 mr-1 -mt-0.5"
                  strokeWidth={3}
                />
                CogniStream passively monitoring keystroke dynamics
              </div>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] p-3 md:p-4 border-4 border-black ${
                    msg.sender === "user"
                      ? "bg-black text-white shadow-[4px_4px_0px_0px_#A7F3D0]"
                      : "bg-white text-black shadow-brutal-sm"
                  }`}
                >
                  <p className="font-mono text-sm md:text-base font-semibold leading-relaxed">
                    {msg.text}
                  </p>
                  <p
                    className={`font-mono text-[10px] mt-2 uppercase tracking-wider font-bold ${
                      msg.sender === "user"
                        ? "text-lime-green"
                        : "text-black/30"
                    }`}
                  >
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="p-3 md:p-4 bg-white border-brutal-t shrink-0">
            <div className="flex gap-2 md:gap-3">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                onKeyUp={handleKeyUp}
                placeholder="TYPE HERE — YOUR KEYSTROKES ARE BEING ANALYZED..."
                className="flex-1 resize-none p-3 md:p-4 bg-cream border-4 border-black font-mono text-sm md:text-base font-semibold placeholder:text-black/25 placeholder:text-[10px] md:placeholder:text-xs focus:outline-none focus:bg-white transition-colors"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                className="px-4 md:px-6 bg-black text-white border-4 border-black hover:bg-lime-green hover:text-black transition-all active:translate-y-1 self-stretch flex items-center justify-center"
                aria-label="Send message"
              >
                <Send className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* ================================================ */}
        {/* RIGHT PANE — PHASE 4 & 5: Caregiver Dashboard    */}
        {/* ================================================ */}
        <div className="flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
          {/* Dashboard header */}
          <div className="px-4 md:px-6 py-3 flex items-center justify-between bg-black border-brutal-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 md:w-6 md:h-6 text-lime-green" strokeWidth={3} />
              <h2 className="font-heading font-black text-sm md:text-lg uppercase tracking-tighter text-white">
                Caregiver Dashboard
              </h2>
            </div>
            <span className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
              Live Telemetry
            </span>
          </div>

          {/* Anomaly alert banner — Phase 6 */}
          {isAnomalyDetected && (
            <div className="bg-hot-coral text-black px-4 md:px-6 py-3 border-b-4 border-black flex items-center gap-3 animate-pulse shrink-0">
              <AlertTriangle className="w-6 h-6 md:w-7 md:h-7 shrink-0" strokeWidth={3} />
              <div className="min-w-0">
                <p className="font-heading font-black text-sm md:text-lg uppercase tracking-tight leading-tight">
                  COGNITIVE ANOMALY DETECTED
                </p>
                <p className="font-mono text-[10px] md:text-xs font-bold truncate">
                  Keystroke dynamics indicate significant cognitive friction.
                  Recommend review.
                </p>
              </div>
            </div>
          )}

          {/* Scrollable dashboard content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-5 min-h-0">
            {/* ===== THE BIG SCORE ===== */}
            <div
              className="border-4 p-6 md:p-8 text-center transition-all duration-500"
              style={{
                borderColor: scoreColor,
                backgroundColor: isAnomalyDetected
                  ? "rgba(255, 107, 107, 0.12)"
                  : "rgba(167, 243, 208, 0.04)",
              }}
            >
              <p className="font-mono text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] mb-3 text-white/40">
                Cognitive Fluidity Score
              </p>
              <div
                className="font-heading font-black text-[80px] md:text-[120px] lg:text-[140px] leading-none transition-colors duration-500 tabular-nums"
                style={{ color: scoreColor }}
              >
                {cognitiveScore}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div
                  className="w-3 h-3 border-2 border-white/30 shrink-0"
                  style={{
                    backgroundColor: scoreColor,
                    animation: isAnomalyDetected
                      ? "pulse 0.8s ease-in-out infinite"
                      : "none",
                  }}
                />
                <p
                  className="font-heading font-black text-base md:text-xl uppercase tracking-tight transition-colors duration-500"
                  style={{ color: scoreColor }}
                >
                  {scoreLabel}
                </p>
              </div>
            </div>

            {/* ===== METRIC CARDS ROW ===== */}
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {/* Flight */}
              <div className="border-4 border-white/15 p-3 md:p-4 bg-white/[0.03]">
                <p className="font-mono text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/35 mb-1">
                  Avg Flight
                </p>
                <p className="font-heading font-black text-xl md:text-3xl text-lime-green tabular-nums">
                  {avgFlight !== null ? `${avgFlight}` : "\u2014"}
                  {avgFlight !== null && (
                    <span className="text-xs md:text-sm text-white/30 ml-0.5">
                      ms
                    </span>
                  )}
                </p>
              </div>
              {/* Dwell */}
              <div className="border-4 border-white/15 p-3 md:p-4 bg-white/[0.03]">
                <p className="font-mono text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/35 mb-1">
                  Avg Dwell
                </p>
                <p className="font-heading font-black text-xl md:text-3xl text-cyber-yellow tabular-nums">
                  {avgDwell !== null ? `${avgDwell}` : "\u2014"}
                  {avgDwell !== null && (
                    <span className="text-xs md:text-sm text-white/30 ml-0.5">
                      ms
                    </span>
                  )}
                </p>
              </div>
              {/* Corrections */}
              <div className="border-4 border-white/15 p-3 md:p-4 bg-white/[0.03]">
                <p className="font-mono text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/35 mb-1">
                  Corrections
                </p>
                <p className="font-heading font-black text-xl md:text-3xl text-hot-coral tabular-nums">
                  {backspaceCount}
                </p>
              </div>
            </div>

            {/* ===== PHASE 5: RECHARTS — FLIGHT TIME ===== */}
            <div className="border-4 border-white/15 p-3 md:p-4 bg-white/[0.03]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity
                    className="w-4 h-4 text-lime-green"
                    strokeWidth={3}
                  />
                  <h3 className="font-heading font-black text-sm md:text-base uppercase tracking-tight">
                    Flight Time
                  </h3>
                </div>
                <div className="flex items-center gap-3 font-mono text-[9px] font-bold">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-[3px] bg-lime-green" />
                    <span className="text-white/35">LIVE</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0 border-t-2 border-dashed border-white/40" />
                    <span className="text-white/35">BASELINE</span>
                  </span>
                </div>
              </div>
              <div className="h-[130px] md:h-[160px] w-full">
                {flightTimes.length > 2 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={flightTimes}
                      margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.04)"
                        strokeDasharray="none"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="index"
                        stroke="rgba(255,255,255,0.15)"
                        tick={{
                          fill: "rgba(255,255,255,0.25)",
                          fontSize: 9,
                        }}
                        tickLine={false}
                        axisLine={{ strokeWidth: 2 }}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.15)"
                        tick={{
                          fill: "rgba(255,255,255,0.25)",
                          fontSize: 9,
                        }}
                        tickLine={false}
                        axisLine={{ strokeWidth: 2 }}
                        domain={[0, "auto"]}
                      />
                      <ReferenceLine
                        y={FLIGHT_BASELINE}
                        stroke="rgba(255,255,255,0.3)"
                        strokeDasharray="8 4"
                        strokeWidth={2}
                        label={{
                          value: `${FLIGHT_BASELINE}ms`,
                          fill: "rgba(255,255,255,0.35)",
                          fontSize: 9,
                          position: "right",
                        }}
                      />
                      <Line
                        type="stepAfter"
                        dataKey="value"
                        stroke="#A7F3D0"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: "#A7F3D0",
                          stroke: "#000",
                          strokeWidth: 2,
                        }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="font-mono text-[10px] text-white/15 uppercase font-bold tracking-[0.2em]">
                      Start typing to generate flight data...
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ===== PHASE 5: RECHARTS — DWELL TIME ===== */}
            <div className="border-4 border-white/15 p-3 md:p-4 bg-white/[0.03]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Keyboard
                    className="w-4 h-4 text-cyber-yellow"
                    strokeWidth={3}
                  />
                  <h3 className="font-heading font-black text-sm md:text-base uppercase tracking-tight">
                    Dwell Time
                  </h3>
                </div>
                <div className="flex items-center gap-3 font-mono text-[9px] font-bold">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-[3px] bg-cyber-yellow" />
                    <span className="text-white/35">LIVE</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0 border-t-2 border-dashed border-white/40" />
                    <span className="text-white/35">BASELINE</span>
                  </span>
                </div>
              </div>
              <div className="h-[130px] md:h-[160px] w-full">
                {dwellTimes.length > 2 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dwellTimes}
                      margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.04)"
                        strokeDasharray="none"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="index"
                        stroke="rgba(255,255,255,0.15)"
                        tick={{
                          fill: "rgba(255,255,255,0.25)",
                          fontSize: 9,
                        }}
                        tickLine={false}
                        axisLine={{ strokeWidth: 2 }}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.15)"
                        tick={{
                          fill: "rgba(255,255,255,0.25)",
                          fontSize: 9,
                        }}
                        tickLine={false}
                        axisLine={{ strokeWidth: 2 }}
                        domain={[0, "auto"]}
                      />
                      <ReferenceLine
                        y={DWELL_BASELINE}
                        stroke="rgba(255,255,255,0.3)"
                        strokeDasharray="8 4"
                        strokeWidth={2}
                        label={{
                          value: `${DWELL_BASELINE}ms`,
                          fill: "rgba(255,255,255,0.35)",
                          fontSize: 9,
                          position: "right",
                        }}
                      />
                      <Line
                        type="stepAfter"
                        dataKey="value"
                        stroke="#FFD700"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: "#FFD700",
                          stroke: "#000",
                          strokeWidth: 2,
                        }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="font-mono text-[10px] text-white/15 uppercase font-bold tracking-[0.2em]">
                      Start typing to generate dwell data...
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Keystroke counter footer */}
            <div className="text-center py-3 border-t-2 border-white/10">
              <p className="font-mono text-[10px] text-white/25 uppercase font-bold tracking-[0.3em]">
                Total Keystrokes Analyzed:{" "}
                <span className="text-white/50">{totalKeystrokes}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
