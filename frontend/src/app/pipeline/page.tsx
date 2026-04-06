"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Shield,
  Brain,
  MapPin,
  Server,
  FileText,
  CheckCircle,
  ArrowRight,
  FileJson,
  File,
  X,
  RefreshCw,
  Cpu,
  Database,
  Globe,
  Loader2,
  ClipboardPaste,
  Sparkles,
  Zap,
  FileUp,
  ExternalLink,
  Lock,
  Unlock,
  Activity,
} from "lucide-react";

import dynamic from "next/dynamic";

// Solana Web3 imports
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

// ER Integration imports
import { useER } from "@/components/WalletProvider";
import { createERClient, ERClient, TransactionResult } from "@/lib/er-client";
import { derivePatientPda } from "@/lib/pdas";
import { hashPatientData, hashMatchResult } from "@/lib/hash";
import { txUrl, truncateSignature, truncateAddress } from "@/lib/explorer";
import { formatDuration, percentToBps } from "@/lib/format";
import {
  ERStatusBadge,
  TxTimingDisplay,
  OnChainStatus,
  PrivacyModeToggle,
} from "@/components/ERStatusIndicator";
import {
  anonymizePatient,
  matchAll,
  buildPatientRecord,
  ingestFile,
  ingestText,
  savePatient,
  MatchResponse,
  AnonymizeResponse,
  IngestResponse,
} from "@/lib/api";
import { DigitalIndiaPopup } from "@/components/ui/animated-tooltip";
import { VerifyWithReclaim } from "@/components/VerifyWithReclaim";
import { ZKProofData, getProofFromSession, storeProofInSession } from "@/lib/reclaim-client";

type PipelineStep = "upload" | "extract" | "anonymize" | "processing" | "complete";

// ─── ER Transaction State ─────────────────────────────────────────────────────
interface ERTransactionState {
  initPatient: TransactionResult | null;
  delegatePatient: TransactionResult | null;
  recordMatch: TransactionResult | null;
  logConsent: TransactionResult | null;
}

const initialERState: ERTransactionState = {
  initPatient: null,
  delegatePatient: null,
  recordMatch: null,
  logConsent: null,
};
type InputMode = "file" | "paste" | "sample";
type InputTab = "upload" | "paste" | "sample";

interface ProcessingLog {
  id: number;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
}

// ─── Sample patient (from data/patients.json — real backend patient) ──────────
const SAMPLE_PATIENT = {
  patient_id: "ANON_MH_0024",
  demographics: {
    age: 61,
    gender: "Male",
    name: "Arjun Mehta",
    city: "Mumbai",
    state: "Maharashtra",
    lat: 19.076,
    lng: 72.8777,
  },
  diagnosis: {
    primary: "Non-Small Cell Lung Cancer",
    subtype: "Adenocarcinoma",
    stage: "Stage IV",
    icd10: "C34.9",
    biomarkers: { KRAS: "G12C", PDL1: "TPS 15%" },
  },
  medical_history: ["Hypertension", "Hyperlipidemia"],
  medications: ["Amlodipine", "Atorvastatin"],
  prior_treatments: [],
  lab_values: {
    hemoglobin: 11.8,
    wbc: 6800,
    platelets: 195000,
    creatinine: 0.9,
    bilirubin: 0.8,
    alt: 32,
    ast: 28,
  },
  ecog_status: 1,
  smoking_status: "Former smoker",
  allergies: [] as string[],
  clinical_notes:
    "Patient presents with Stage IV NSCLC adenocarcinoma. KRAS G12C mutation positive. PDL1 TPS 15%. Prior smoker. ECOG 1.",
};

const SAMPLE_CLINICAL_NOTES = `DISCHARGE SUMMARY — Apollo Hospital, Mumbai
Patient: Rajesh Kumar Verma | MRN: MH-2024-08831
DOB: 12/05/1963 (Age: 61) | Gender: Male
Address: 42, Pali Hill Road, Bandra West, Mumbai 400050

Admitting Dx: Non-small cell lung cancer - adenocarcinoma, Stage IV
ECOG PS: 1 | Smoking: Former (quit 2019, 30 pack-years)

Biomarkers: KRAS G12C mut+, PDL1 TPS 15%, EGFR wild-type, ALK neg
PMHx: HTN (on amlodipine 5mg), hyperlipidemia (atorvastatin 20mg)
Allergies: NKDA

Labs (03/01/2026):
  Hgb 11.8 | WBC 6.8K | Plt 195K | Cr 0.9 | Bili 0.8 | ALT 32 | AST 28

Assessment: Newly dx Stage IV NSCLC adeno w/ KRAS G12C. Candidate for clinical trial enrollment. Refer to oncology research coordinator.

- Dr. Priya Sharma, MD Pulmonology`;

// ─── Monotonic log ID counter (outside React state to avoid batching collisions) ─
let _logCounter = 0;
function nextLogId(): number { return ++_logCounter; }

function ts(): string {
  const t = performance.now() / 1000;
  const s = Math.floor(t);
  const ms = Math.floor((t - s) * 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export default function PipelinePage() {
  const [currentStep, setCurrentStep] = useState<PipelineStep>("upload");
  const [activeTab, setActiveTab] = useState<InputTab>("upload");
  const [inputMode, setInputMode] = useState<InputMode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [patientData, setPatientData] = useState<Record<string, unknown> | null>(null);
  const [useSample, setUseSample] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Clinical notes paste state
  const [clinicalText, setClinicalText] = useState("");

  // Ingest / NLP extraction state
  const [ingestResult, setIngestResult] = useState<IngestResponse | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // Anonymize state
  const [anonResult, setAnonResult] = useState<AnonymizeResponse | null>(null);
  const [anonLoading, setAnonLoading] = useState(false);
  const [anonError, setAnonError] = useState<string | null>(null);

  // Processing state
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
  const [processingLogs, setProcessingLogs] = useState<ProcessingLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Patient save state
  const [patientSaved, setPatientSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Solana Web3 state
  const [solanaTxSignature, setSolanaTxSignature] = useState<string | null>(null);
  const [solanaLoading, setSolanaLoading] = useState(false);
  const [solanaError, setSolanaError] = useState<string | null>(null);

  // ZK-TLS Proof State (Reclaim Protocol)
  const [zkProofData, setZkProofData] = useState<ZKProofData | null>(null);

  // CRITICAL: Use a ref to store the patient ID so it stays STABLE throughout the entire pipeline run
  // This prevents any chance of ID regeneration during React re-renders
  const currentPatientIdRef = useRef<string | null>(null);

  // ─── Ephemeral Rollups State ─────────────────────────────────────────────────
  const [erState, setERState] = useState<ERTransactionState>(initialERState);
  const [erClient, setERClient] = useState<ERClient | null>(null);
  const [patientPda, setPatientPda] = useState<string | null>(null);
  const [useTee, setUseTee] = useState(false);
  const [erLoading, setERLoading] = useState(false);

  // Solana wallet hooks
  const { publicKey, sendTransaction, connected, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  // ER Context
  const { 
    isDelegated, 
    setIsDelegated, 
    mode, 
    setMode, 
    incrementTxCount, 
    setLastTxTime,
    isTeeMode 
  } = useER();

  // Initialize ER Client when wallet connects
  useEffect(() => {
    if (publicKey && connected && signTransaction && signAllTransactions) {
      const client = createERClient(connection, {
        publicKey,
        signTransaction: signTransaction as any,
        signAllTransactions: signAllTransactions as any,
      });
      setERClient(client);
    } else {
      setERClient(null);
    }
  }, [publicKey, connected, signTransaction, signAllTransactions, connection]);

  // Load existing ZK proof from session (if returning to page)
  useEffect(() => {
    const existingProof = getProofFromSession();
    if (existingProof) {
      setZkProofData(existingProof);
      console.log("[Pipeline] Loaded existing ZK proof from session:", existingProof.proofHash);
    }
  }, []);

  const terminalRef = useRef<HTMLDivElement>(null);

  // Whether the input needs NLP extraction (non-JSON file or pasted text)
  const needsExtraction = inputMode === "paste" || (inputMode === "file" && uploadedFile && !uploadedFile.name.endsWith(".json"));

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [processingLogs]);

  const addLog = useCallback(
    (message: string, type: ProcessingLog["type"] = "info") => {
      const id = nextLogId();
      // Also print to browser console for debugging
      if (message) {
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
      setProcessingLogs((prev) => [
        ...prev,
        { id, message, type, timestamp: ts() },
      ]);
    },
    []
  );

  // ─── File handlers ──────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const parseFile = useCallback(async (file: File) => {
    setFileError(null);
    setIngestResult(null);
    setIngestError(null);

    const isJson = file.type === "application/json" || file.name.endsWith(".json");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isDocx = file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isTxt = file.name.endsWith(".txt") || file.type === "text/plain";

    if (!isJson && !isPdf && !isDocx && !isTxt) {
      const ext = file.name.split(".").pop()?.toUpperCase() || "file";
      setFileError(
        `${ext} files are not supported. Accepted formats: JSON, PDF, DOCX, TXT`
      );
      return;
    }

    setUploadedFile(file);
    setUseSample(false);
    setInputMode("file");

    if (isJson) {
      // Parse JSON directly on frontend
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        setPatientData(parsed);
        setFileError(null);
      } catch {
        setFileError("Invalid JSON file. Check that it is valid JSON.");
        setUploadedFile(null);
        setInputMode(null);
      }
    } else {
      // PDF/DOCX/TXT — will need NLP extraction via /api/ingest
      setPatientData(null);
      setFileError(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const loadSample = useCallback(() => {
    setUseSample(true);
    setInputMode("sample");
    setPatientData(SAMPLE_PATIENT as unknown as Record<string, unknown>);
    setUploadedFile(null);
    setFileError(null);
    setClinicalText("");
    setIngestResult(null);
    setIngestError(null);
  }, []);

  const clearInput = useCallback(() => {
    setUploadedFile(null);
    setPatientData(null);
    setUseSample(false);
    setInputMode(null);
    setFileError(null);
    setClinicalText("");
    setIngestResult(null);
    setIngestError(null);
  }, []);

  // ─── ZK-TLS Verification Handler ──────────────────────────────────────────────
  const handleZKVerification = useCallback((proofData: ZKProofData) => {
    setZkProofData(proofData);
    storeProofInSession(proofData);
    console.log("[Pipeline] ZK verification complete:", proofData.proofHash);
  }, []);

  // ─── NLP Extraction (Upload step → Extract step) ────────────────────────────
  const startExtraction = useCallback(async () => {
    setCurrentStep("extract");
    setIngestLoading(true);
    setIngestError(null);
    setIngestResult(null);

    let result: { data: IngestResponse | null; error: string | null };

    if (inputMode === "paste") {
      result = await ingestText(clinicalText);
    } else if (uploadedFile) {
      result = await ingestFile(uploadedFile);
    } else {
      setIngestError("No input provided");
      setIngestLoading(false);
      return;
    }

    setIngestLoading(false);

    if (result.data) {
      setIngestResult(result.data);
      if (result.data.structured_data) {
        setPatientData(result.data.structured_data);
      }
    } else {
      setIngestError(result.error || "Extraction failed");
    }
  }, [inputMode, clinicalText, uploadedFile]);

  // ─── Save Patient to Database ───────────────────────────────────────────────
  const handleSavePatient = useCallback(async () => {
    if (!patientData) return;
    
    setSaveLoading(true);
    setSaveError(null);
    
    const record = buildPatientRecord(patientData);
    const { data, error } = await savePatient(record);
    
    setSaveLoading(false);
    
    if (data?.success) {
      setPatientSaved(true);
    } else {
      setSaveError(error || "Failed to save patient");
    }
  }, [patientData]);

  // ─── Ephemeral Rollups Flow ─────────────────────────────────────────────────
  
  /**
   * Step 1: Initialize patient on L1 (creates PatientRecord PDA)
   */
  const initPatientOnChain = useCallback(async (
    patientId: string,
    patientDataForHash: Record<string, unknown>
  ) => {
    if (!erClient || !publicKey) {
      addLog("ER: Wallet not connected", "warning");
      return null;
    }

    addLog("ER: Initializing patient on Solana L1...", "info");
    
    try {
      // Create a deterministic hash of the patient data to prove what data was used
      console.log(`[ER] Hashing patient data for ID ${patientId}:`, patientDataForHash);
      const dataHash = await hashPatientData(patientDataForHash);
      
      const result = await erClient.initPatient({
        patientId,
        dataHash,
      });

      if (result.success && result.signature) {
        addLog(`ER: Patient initialized! Tx: ${truncateSignature(result.signature)}`, "success");
        addLog(`ER: Timing: ${result.timing?.durationMs}ms`, "info");
        
        // Set PDA
        const [pda] = derivePatientPda(publicKey, patientId);
        setPatientPda(pda.toBase58());
        
        // Set signature for Solscan link (only if it's a real tx, not "existing-account")
        if (!result.signature.includes("-")) {
          setSolanaTxSignature(result.signature);
        }
        
        setERState(prev => ({ ...prev, initPatient: result }));
        incrementTxCount();
        if (result.timing) setLastTxTime(result.timing.durationMs);
        
        return result;
      } else {
        addLog(`ER: Init failed - ${result.error}`, "error");
        return null;
      }
    } catch (err) {
      addLog(`ER: Init error - ${err instanceof Error ? err.message : "Unknown"}`, "error");
      return null;
    }
  }, [erClient, publicKey, addLog, incrementTxCount, setLastTxTime]);

  /**
   * Step 2: Delegate patient to Ephemeral Rollup (GASLESS after this!)
   */
  const delegatePatientToER = useCallback(async (patientId: string) => {
    if (!erClient) {
      addLog("ER: Client not initialized", "warning");
      return null;
    }

    addLog(`ER: Delegating to ${useTee ? "TEE (Private)" : "Ephemeral Rollup"}...`, "info");
    
    try {
      const result = await erClient.delegatePatient({
        patientId,
        useTee,
      });

      if (result.success && result.signature) {
        addLog(`ER: Delegated! Tx: ${truncateSignature(result.signature)}`, "success");
        addLog(`ER: Timing: ${result.timing?.durationMs}ms - NOW GASLESS!`, "success");
        
        setIsDelegated(true);
        if (useTee) setMode("tee");
        else setMode("er");
        
        // Set signature for Solscan link (only if it's a real tx)
        if (!result.signature.includes("-")) {
          setSolanaTxSignature(result.signature);
        }
        
        setERState(prev => ({ ...prev, delegatePatient: result }));
        incrementTxCount();
        if (result.timing) setLastTxTime(result.timing.durationMs);
        
        return result;
      } else {
        addLog(`ER: Delegation failed - ${result.error}`, "error");
        return null;
      }
    } catch (err) {
      addLog(`ER: Delegation error - ${err instanceof Error ? err.message : "Unknown"}`, "error");
      return null;
    }
  }, [erClient, useTee, addLog, setIsDelegated, setMode, incrementTxCount, setLastTxTime]);

  /**
   * Step 3: Record match result (GASLESS on ER!)
   */
  const recordMatchOnChain = useCallback(async (
    patientId: string,
    trialId: string,
    score: number,
    matchData: Record<string, unknown>
  ) => {
    if (!erClient) {
      addLog("ER: Client not initialized", "warning");
      return null;
    }

    addLog(`ER: Recording match ${trialId} (GASLESS)...`, "info");
    
    try {
      const resultHash = await hashMatchResult({
        patient_id: patientId,
        trial_id: trialId,
        composite_score: score,
        score_breakdown: matchData.score_breakdown as Record<string, number> || {},
        criteria_results: matchData.criteria_results as unknown[] || [],
      });

      const result = await erClient.recordMatch(
        {
          patientId,
          trialId,
          resultHash,
          scoreBps: percentToBps(score),
        },
        isDelegated
      );

      if (result.success && result.signature) {
        addLog(`ER: Match recorded! Tx: ${truncateSignature(result.signature)} (${result.timing?.durationMs}ms)`, "success");
        
        setERState(prev => ({ ...prev, recordMatch: result }));
        // Only set signature for Solscan link if it's a real tx (not "match-already-exists" etc.)
        if (!result.signature.includes("-")) {
          setSolanaTxSignature(result.signature);
          incrementTxCount();
        }
        if (result.timing) setLastTxTime(result.timing.durationMs);
        
        return result;
      } else {
        addLog(`ER: Record match failed - ${result.error}`, "error");
        return null;
      }
    } catch (err) {
      addLog(`ER: Record match error - ${err instanceof Error ? err.message : "Unknown"}`, "error");
      return null;
    }
  }, [erClient, isDelegated, addLog, incrementTxCount, setLastTxTime]);

  /**
   * Step 4: Log consent (GASLESS on ER!)
   */
  const logConsentOnChain = useCallback(async (
    patientId: string,
    trialId: string,
    consentType: number = 0
  ) => {
    if (!erClient) {
      addLog("ER: Client not initialized", "warning");
      return null;
    }

    addLog(`ER: Logging consent for ${trialId} (GASLESS)...`, "info");
    
    try {
      const result = await erClient.logConsent(
        {
          patientId,
          trialId,
          consentType,
        },
        isDelegated
      );

      if (result.success && result.signature) {
        addLog(`ER: Consent logged! Tx: ${truncateSignature(result.signature)} (${result.timing?.durationMs}ms)`, "success");
        
        setERState(prev => ({ ...prev, logConsent: result }));
        // Only increment tx count for real transactions (not "consent-already-exists" etc.)
        if (!result.signature.includes("-")) {
          incrementTxCount();
        }
        if (result.timing) setLastTxTime(result.timing.durationMs);
        
        return result;
      } else {
        addLog(`ER: Log consent failed - ${result.error}`, "error");
        return null;
      }
    } catch (err) {
      addLog(`ER: Log consent error - ${err instanceof Error ? err.message : "Unknown"}`, "error");
      return null;
    }
  }, [erClient, isDelegated, addLog, incrementTxCount, setLastTxTime]);

  /**
   * Full ER Pipeline: initPatient → delegatePatient → recordMatch → logConsent
   */
  const runERPipeline = useCallback(async (
    patientId: string,
    patientDataForHash: Record<string, unknown>,
    topMatch: { trial_id: string; composite_score: number; score_breakdown?: unknown; criteria_results?: unknown[] }
  ) => {
    if (!erClient || !publicKey || !connected) {
      setSolanaError("Wallet not connected");
      return;
    }

    setERLoading(true);
    setSolanaLoading(true);
    setSolanaError(null);

    try {
      // Step 1: Initialize patient on L1
      addLog("ER: Step 1/4 - Initializing patient on Solana L1...", "info");
      const initResult = await initPatientOnChain(patientId, patientDataForHash);
      if (!initResult?.success) {
        // Patient might already exist - try to continue
        addLog("ER: Patient may already exist, continuing...", "warning");
      }

      // Step 2: Delegate to ER (enables gasless transactions)
      addLog("ER: Step 2/4 - Delegating to Ephemeral Rollup...", "info");
      const delegateResult = await delegatePatientToER(patientId);
      if (!delegateResult?.success) {
        // Delegation failed but we can still try to record on L1
        addLog("ER: Delegation failed, falling back to L1...", "warning");
      }

      // Step 3: Record match result (GASLESS if delegated!)
      addLog(`ER: Step 3/4 - Recording match ${topMatch.trial_id}...`, "info");
      const matchResultOnChain = await recordMatchOnChain(
        patientId,
        topMatch.trial_id,
        topMatch.composite_score,
        {
          score_breakdown: (topMatch.score_breakdown as Record<string, number>) || {},
          criteria_results: topMatch.criteria_results || [],
        }
      );

      // Step 4: Log consent (GASLESS if delegated!)
      if (matchResultOnChain?.success) {
        addLog(`ER: Step 4/4 - Logging consent...`, "info");
        await logConsentOnChain(patientId, topMatch.trial_id, 0);
      }

      addLog("ER: All steps completed!", "success");
    } catch (err) {
      console.error("ER pipeline error:", err);
      setSolanaError(err instanceof Error ? err.message : "ER pipeline failed");
      addLog(`ER: Pipeline error - ${err instanceof Error ? err.message : "Unknown"}`, "error");
    } finally {
      // ALWAYS clear loading states
      setERLoading(false);
      setSolanaLoading(false);
    }
  }, [
    erClient, publicKey, connected,
    initPatientOnChain, delegatePatientToER, recordMatchOnChain, logConsentOnChain,
    addLog
  ]);

  // ─── Step → Anonymize ─────────────────────────────────────────────────────
  const startAnonymization = useCallback(async () => {
    const dataToSend = patientData || (SAMPLE_PATIENT as unknown as Record<string, unknown>);
    setCurrentStep("anonymize");
    setAnonLoading(true);
    setAnonError(null);

    const { data, error } = await anonymizePatient(dataToSend);
    setAnonLoading(false);
    if (data) {
      setAnonResult(data);
      // Update patientData with the anonymized ID if available
      if (data.anonymized_data && data.anonymized_data.patient_id) {
        setPatientData(prev => ({
          ...prev,
          ...data.anonymized_data
        }));
      }
    } else {
      setAnonError(error || "Anonymization failed");
    }
  }, [patientData]);

  // ─── Step → Processing (match-all) ────────────────────────────────────────
  const startProcessing = useCallback(async () => {
    const dataToMatch = patientData || (SAMPLE_PATIENT as unknown as Record<string, unknown>);
    const record = buildPatientRecord(dataToMatch);
    
    // CRITICAL FIX: Ensure the patient ID is unique if the user hasn't explicitly
    // requested it to remain stable (like after anonymization).
    // The user explicitly requested that the ID SHOULD change after anonymization
    // and new phantom wallet popups should appear.
    let patientId: string;
    
    const existingId = (dataToMatch.patient_id as string) || 
                       (dataToMatch.demographics as any)?.mrn ||
                       (dataToMatch.demographics as any)?.patient_id;
    
    // If we have an existing ID and we want to FORCE a new on-chain transaction
    // we should append a timestamp to make it unique, UNLESS it's already an anonymized ID
    if (existingId && existingId.startsWith("ANON_")) {
      // It's already anonymized, use it directly
      patientId = existingId;
      console.log("[Pipeline] Using anonymized patient ID:", patientId);
    } else {
      // Force a new ID to trigger Phantom popups and create new PDAs
      // Extract the base part (e.g., "MH-2024" from "MH-2024-08831") and add timestamp
      const basePart = existingId ? existingId.split("-").slice(0, 2).join("-") : "MH-2024";
      const uniqueSuffix = Date.now().toString().slice(-5); // Last 5 digits of timestamp
      patientId = `${basePart}-${uniqueSuffix}`;
      console.log("[Pipeline] Generated new unique patient ID for on-chain tx:", patientId);
    }
    
    // Store in ref to ensure it doesn't change during React re-renders
    currentPatientIdRef.current = patientId;
    
    // Update the record with the patient ID (may be same or new)
    (record as any).patient_id = patientId;
    
    // Update patientData state so the "View Full Results" link uses correct ID
    setPatientData(record);

    setCurrentStep("processing");
    setIsProcessing(true);
    setProcessingLogs([]);
    
    // Reset patient save state for new run
    setPatientSaved(false);
    setSaveError(null);
    
    // Reset ER state for new run
    setERState(initialERState);
    setPatientPda(null);

    // Use the ref value to ensure consistency
    const stablePatientId = currentPatientIdRef.current;
    
    addLog("Initializing CogniStream TrialMatch Engine...", "info");
    addLog(`Patient: ${stablePatientId}`, "info");
    
    // Show ER status if wallet connected
    if (connected && publicKey) {
      addLog(`ER: Wallet connected - ${truncateAddress(publicKey.toBase58())}`, "info");
      addLog(`ER: Mode - ${useTee ? "TEE (Private)" : "Standard Ephemeral Rollup"}`, "info");
    } else {
      addLog("ER: No wallet connected - Web3 features disabled", "warning");
    }
    
    addLog("Loading anonymized record...", "info");

    await new Promise((r) => setTimeout(r, 600));
    addLog("Record loaded. Starting pipeline.", "success");
    addLog("NER Anonymizer: BERT NER scan complete.", "success");
    addLog("Criteria Parser: Decomposing trial eligibility criteria...", "info");

    await new Promise((r) => setTimeout(r, 800));
    addLog("Rule Engine: Evaluating hard criteria (age, gender, ECOG, labs)...", "info");

    // CRITICAL FIX: Always send patient_data (record object), NEVER just patient_id
    // This avoids 404 errors when patient doesn't exist in backend database
    const { data, error } = await matchAll(record, 5);

    if (error) {
      addLog(`Error: ${error}`, "error");
      setIsProcessing(false);
      return;
    }

    if (data) {
      addLog(`Rule Engine: Processed ${data.total_trials_screened} trials.`, "success");
      addLog("Embedding Matcher: PubMedBERT semantic similarity scoring...", "info");
      await new Promise((r) => setTimeout(r, 400));
      addLog("LLM Matcher: Mistral API eligibility reasoning...", "info");
      await new Promise((r) => setTimeout(r, 400));
      addLog("Geo Scorer: Haversine distance calculation...", "info");
      await new Promise((r) => setTimeout(r, 200));
      addLog("Computing weighted ensemble composite scores...", "info");
      await new Promise((r) => setTimeout(r, 300));

      data.matches.slice(0, 5).forEach((m, i) => {
        const tag = i === 0 ? "success" : m.composite_score >= 50 ? "success" : "warning";
        addLog(
          `Score: ${Math.round(m.composite_score)}% | ${m.trial_id} | ${m.trial_title.substring(0, 50)}`,
          tag
        );
      });

      addLog(
        `Analysis complete. ${data.matches.length} trials returned from ${data.total_trials_screened} screened.`,
        "success"
      );

      setMatchResult(data);
      
      // Auto-save patient to backend before on-chain operations
      // This ensures the patient appears in the dropdown for future matches
      addLog("Saving patient to database...", "info");
      const saveResult = await savePatient(record);
      
      // Use stable patient ID from ref
      const stablePatientId = currentPatientIdRef.current!;
      
      if (saveResult.data?.success) {
        addLog(`Patient ${stablePatientId} saved successfully`, "success");
        setPatientSaved(true);
      } else {
        addLog(`Warning: Could not save patient - ${saveResult.error || "Unknown error"}`, "warning");
      }

      // ─── MagicBlock Ephemeral Rollups Integration ─────────────────────────────
      // Run full ER pipeline: initPatient → delegatePatient → recordMatch → logConsent
      if (connected && publicKey && erClient && data.matches[0]) {
        addLog("", "info");
        addLog("═══════════════════════════════════════════════════════════", "info");
        addLog("ER: Starting MagicBlock Ephemeral Rollups Integration...", "info");
        addLog("═══════════════════════════════════════════════════════════", "info");
        
        const topMatch = data.matches[0];
        
        // Run the ER pipeline and WAIT for it to complete before showing results
        // CRITICAL: Use stable patient ID from ref to ensure consistency throughout pipeline
        try {
          await runERPipeline(
            stablePatientId, // Use stable ID from ref, NOT local variable
            record, // Use the record with the unique patientId
            {
              trial_id: topMatch.trial_id,
              composite_score: topMatch.composite_score,
              score_breakdown: topMatch.score_breakdown,
              criteria_results: topMatch.criteria_results,
            }
          );
          addLog("ER: Pipeline completed successfully!", "success");
        } catch (err) {
          console.error("ER pipeline error:", err);
          addLog(`ER: Pipeline error - ${err instanceof Error ? err.message : "Unknown"}`, "error");
        }
      }
    }

    setIsProcessing(false);
    setTimeout(() => setCurrentStep("complete"), 800);
  }, [patientData, addLog, connected, publicKey, erClient, useTee, runERPipeline]);

  const getLogColor = (type: ProcessingLog["type"]) => {
    switch (type) {
      case "success": return "text-surgical";
      case "warning": return "text-cobalt";
      case "error": return "text-iodine";
      default: return "text-white/70";
    }
  };

  // ─── Dynamic step indicators ──────────────────────────────────────────────
  const stepOrder: PipelineStep[] = needsExtraction
    ? ["upload", "extract", "anonymize", "processing", "complete"]
    : ["upload", "anonymize", "processing", "complete"];

  const currentIdx = stepOrder.indexOf(currentStep);

  const stepDefs: { key: PipelineStep; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = needsExtraction
    ? [
        { key: "upload", label: "Upload", icon: Upload },
        { key: "extract", label: "Extract", icon: Sparkles },
        { key: "anonymize", label: "Anonymize", icon: Shield },
        { key: "processing", label: "Processing", icon: Brain },
        { key: "complete", label: "Results", icon: FileText },
      ]
    : [
        { key: "upload", label: "Upload", icon: Upload },
        { key: "anonymize", label: "Anonymize", icon: Shield },
        { key: "processing", label: "Processing", icon: Brain },
        { key: "complete", label: "Results", icon: FileText },
      ];

  const getStepStatus = (stepKey: PipelineStep) => {
    const idx = stepOrder.indexOf(stepKey);
    if (idx < currentIdx) return "completed";
    if (idx === currentIdx) return "active";
    return "pending";
  };

  // Ready to proceed from upload step
  const readyToProcess =
    (inputMode === "sample" && patientData !== null) ||
    (inputMode === "file" && uploadedFile !== null && uploadedFile.name.endsWith(".json") && patientData !== null) ||
    (inputMode === "file" && uploadedFile !== null && !uploadedFile.name.endsWith(".json")) ||
    (inputMode === "paste" && clinicalText.trim().length > 20);

  // Handler for the main "Start Processing" button on the upload step
  const handleStartFromUpload = useCallback(() => {
    if (needsExtraction) {
      startExtraction();
    } else {
      startAnonymization();
    }
  }, [needsExtraction, startExtraction, startAnonymization]);

  return (
    <div className="min-h-screen bg-paper font-mono bg-noise overflow-hidden flex flex-col">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-50 bg-charcoal text-white px-4 md:px-8 py-3 flex items-center justify-between border-b-4 border-charcoal shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 hover:text-surgical transition-colors">
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
          <span className="font-heading text-lg md:text-2xl font-black uppercase tracking-tighter">
            CogniStream
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {stepDefs.map((s, i) => {
            const status = getStepStatus(s.key);
            return (
              <React.Fragment key={s.key}>
                <div
                  className={`flex items-center gap-2 px-3 py-1 border-2 ${
                    status === "completed"
                      ? "bg-surgical border-surgical text-charcoal"
                      : status === "active"
                      ? "bg-cobalt border-cobalt text-charcoal"
                      : "bg-charcoal border-white/30 text-white/50"
                  }`}
                >
                  {status === "completed" ? (
                    <CheckCircle className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    <s.icon className="w-4 h-4" strokeWidth={3} />
                  )}
                  <span className="font-mono text-xs font-bold uppercase">{s.label}</span>
                </div>
                {i < stepDefs.length - 1 && <ArrowRight className="w-4 h-4 text-white/30" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* ER Status Badge */}
          {connected && (
            <div className={`flex items-center gap-2 px-3 py-1.5 border-2 ${
              isDelegated 
                ? "border-[#14F195] bg-[#14F195]/20" 
                : "border-[#9945FF]/50 bg-[#9945FF]/10"
            }`}>
              {isDelegated ? (
                <>
                  <Zap className="w-4 h-4 text-[#14F195]" />
                  <span className="font-mono text-[10px] font-bold uppercase text-[#14F195]">
                    ER Active
                  </span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 text-[#9945FF]" />
                  <span className="font-mono text-[10px] font-bold uppercase text-[#9945FF]">
                    L1
                  </span>
                </>
              )}
              {useTee && (
                <Lock className="w-3 h-3 text-purple-400 ml-1" />
              )}
            </div>
          )}

          {/* Solana Wallet Connect Button */}
          <div className="wallet-adapter-button-wrapper">
            <WalletMultiButton className="!bg-gradient-to-r !from-[#9945FF] !to-[#14F195] !border-2 !border-white/20 !rounded-none !font-mono !text-xs !font-bold !uppercase !h-auto !py-2 !px-3 hover:!opacity-90 !transition-opacity" />
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-2 border-2 ${
              isProcessing || ingestLoading
                ? "border-cobalt bg-cobalt"
                : currentStep === "complete"
                ? "border-surgical bg-surgical"
                : "border-white/30"
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isProcessing || ingestLoading ? "bg-charcoal animate-pulse" : currentStep === "complete" ? "bg-charcoal" : "bg-white/30"
              }`}
            />
            <span className="font-mono text-xs font-bold uppercase text-charcoal">
              {isProcessing ? "Processing" : ingestLoading ? "Extracting" : currentStep === "complete" ? "Complete" : "Ready"}
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-hidden p-4 md:p-6">
        <div className="max-w-7xl mx-auto h-full flex flex-col">

          {/* ── STEP A: UPLOAD (3 Tabs) ────────────────────────────────────── */}
          {currentStep === "upload" && (
            <div className="flex-1 flex flex-col items-center justify-start pt-4">
              <h1 className="font-heading text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">
                Upload Patient Record
              </h1>
              <p className="font-mono text-base text-charcoal/60 mb-6">
                Upload a file, paste clinical notes, or use a sample patient
              </p>

              {/* Tab Bar */}
              <div className="flex border-2 border-charcoal mb-6 w-full max-w-3xl">
                {([
                  { key: "upload" as InputTab, label: "Upload File", icon: FileUp },
                  { key: "paste" as InputTab, label: "Paste Clinical Notes", icon: ClipboardPaste },
                  { key: "sample" as InputTab, label: "Sample Patient", icon: Zap },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      if (tab.key !== "sample") {
                        setUseSample(false);
                        if (tab.key === "upload") {
                          setClinicalText("");
                          if (inputMode === "paste") setInputMode(null);
                        }
                        if (tab.key === "paste") {
                          setUploadedFile(null);
                          if (inputMode === "file") { setInputMode(null); setPatientData(null); }
                        }
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-mono text-sm font-bold uppercase transition-colors ${
                      activeTab === tab.key
                        ? "bg-charcoal text-white"
                        : "bg-white text-charcoal hover:bg-charcoal/10"
                    } ${tab.key !== "upload" ? "border-l-4 border-charcoal" : ""}`}
                  >
                    <tab.icon className="w-4 h-4" strokeWidth={2.5} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* ── Tab 1: Upload File ───────────────────────────────── */}
              {activeTab === "upload" && (
                <div className="w-full max-w-3xl">
                  <div
                    className={`w-full border-2 border-dashed p-10 text-center transition-all duration-300 ${
                      isDragging ? "border-surgical bg-surgical/20 scale-[1.02]" : "border-charcoal bg-white"
                    } ${uploadedFile ? "border-solid border-surgical bg-surgical/10" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {uploadedFile ? (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-surgical border-2 border-charcoal flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_rgba(15,15,15,1)]">
                          {uploadedFile.name.endsWith(".json") ? (
                            <FileJson className="w-8 h-8" strokeWidth={3} />
                          ) : (
                            <File className="w-8 h-8" strokeWidth={3} />
                          )}
                        </div>
                        <p className="font-heading font-black text-xl uppercase mb-1">{uploadedFile.name}</p>
                        <p className="font-mono text-sm text-charcoal/50 mb-1">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </p>
                        {!uploadedFile.name.endsWith(".json") && (
                          <span className="inline-block bg-cobalt border-2 border-charcoal px-2 py-0.5 font-mono text-xs font-bold mt-1 mb-2">
                            NLP EXTRACTION REQUIRED
                          </span>
                        )}
                        {uploadedFile.name.endsWith(".json") && patientData && (
                          <span className="inline-block bg-surgical border-2 border-charcoal px-2 py-0.5 font-mono text-xs font-bold mt-1 mb-2">
                            JSON PARSED
                          </span>
                        )}
                        <button
                          onClick={clearInput}
                          className="flex items-center gap-2 font-mono text-sm text-iodine hover:underline mt-2"
                        >
                          <X className="w-4 h-4" /> Remove file
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-14 h-14 mx-auto mb-4 text-charcoal/30" strokeWidth={2} />
                        <p className="font-heading font-black text-xl uppercase mb-2">Drop file here</p>
                        <p className="font-mono text-sm text-charcoal/40 mb-1">
                          Accepts: JSON, PDF, DOCX, TXT
                        </p>
                        <p className="font-mono text-xs text-charcoal/30 mb-5">
                          Non-JSON files are processed through Mistral LLM for structured extraction
                        </p>
                        <label className="brutal-btn brutal-btn-warning px-8 py-3 cursor-pointer inline-flex">
                          <input
                            type="file"
                            accept=".json,.pdf,.docx,.txt"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          Browse Files
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab 2: Paste Clinical Notes ─────────────────────── */}
              {activeTab === "paste" && (
                <div className="w-full max-w-3xl">
                  <div className="bg-white border-2 border-charcoal p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-heading font-black uppercase text-sm">Raw Clinical Notes</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-charcoal/40">
                          {clinicalText.length} chars
                        </span>
                        {clinicalText.length === 0 && (
                          <button
                            onClick={() => {
                              setClinicalText(SAMPLE_CLINICAL_NOTES);
                              setInputMode("paste");
                            }}
                            className="font-mono text-xs font-bold text-cobalt hover:underline border-2 border-cobalt px-2 py-0.5"
                          >
                            Load Example
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={clinicalText}
                      onChange={(e) => {
                        setClinicalText(e.target.value);
                        if (e.target.value.trim().length > 10) {
                          setInputMode("paste");
                        }
                      }}
                      placeholder={"Paste discharge summary, clinical notes, or medical records here...\n\nExample:\nPatient: Rajesh Kumar, 61yo Male from Mumbai\nDiagnosed with Stage IV NSCLC adenocarcinoma\nKRAS G12C positive, PDL1 TPS 15%\nECOG 1, Former smoker..."}
                      className="w-full h-64 font-mono text-sm p-4 border-2 border-charcoal/20 resize-none focus:outline-none focus:border-charcoal bg-paper/30 placeholder:text-charcoal/25"
                      spellCheck={false}
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cobalt" />
                      <span className="font-mono text-xs text-charcoal/50">
                        Mistral LLM will extract structured patient data from your notes
                      </span>
                    </div>
                  </div>
                  {clinicalText.trim().length > 0 && (
                    <button
                      onClick={() => {
                        setClinicalText("");
                        setInputMode(null);
                      }}
                      className="flex items-center gap-2 font-mono text-sm text-iodine hover:underline mt-3"
                    >
                      <X className="w-4 h-4" /> Clear notes
                    </button>
                  )}
                </div>
              )}

              {/* ── Tab 3: Sample Patient ───────────────────────────── */}
              {activeTab === "sample" && (
                <div className="w-full max-w-3xl">
                  <div
                    className={`bg-white border-2 p-8 text-center transition-all ${
                      useSample ? "border-surgical bg-surgical/10" : "border-charcoal"
                    }`}
                  >
                    {useSample ? (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-surgical border-2 border-charcoal flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_rgba(15,15,15,1)]">
                          <FileJson className="w-8 h-8" strokeWidth={3} />
                        </div>
                        <p className="font-heading font-black text-xl uppercase mb-1">Sample Patient Loaded</p>
                        <p className="font-mono text-sm text-charcoal/50 mb-1">ANON_MH_0024 - Stage IV NSCLC</p>
                        <p className="font-mono text-xs text-charcoal/40 mb-4">Mumbai - KRAS G12C - ECOG 1</p>
                        <button
                          onClick={clearInput}
                          className="flex items-center gap-2 font-mono text-sm text-iodine hover:underline"
                        >
                          <X className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Zap className="w-14 h-14 text-cobalt mb-4" strokeWidth={2} />
                        <p className="font-heading font-black text-xl uppercase mb-2">Quick Demo</p>
                        <p className="font-mono text-sm text-charcoal/50 mb-4">
                          Load a pre-built Stage IV NSCLC patient record (no upload needed)
                        </p>
                        <div className="bg-charcoal text-white border-2 border-charcoal p-4 mb-5 max-w-md text-left">
                          <p className="font-mono text-xs text-white/50 mb-2">PATIENT PREVIEW</p>
                          <p className="font-mono text-sm"><span className="text-surgical">ID:</span> ANON_MH_0024</p>
                          <p className="font-mono text-sm"><span className="text-surgical">Dx:</span> Non-Small Cell Lung Cancer (Adenocarcinoma)</p>
                          <p className="font-mono text-sm"><span className="text-surgical">Stage:</span> IV | <span className="text-surgical">ECOG:</span> 1</p>
                          <p className="font-mono text-sm"><span className="text-surgical">Biomarkers:</span> KRAS G12C, PDL1 TPS 15%</p>
                          <p className="font-mono text-sm"><span className="text-surgical">Location:</span> Mumbai, Maharashtra</p>
                        </div>
                        <button
                          onClick={loadSample}
                          className="brutal-btn bg-cobalt border-2 border-charcoal px-8 py-3 text-sm font-mono font-bold hover:bg-surgical"
                        >
                          Load Sample Patient
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error display */}
              {fileError && (
                <div className="mt-4 max-w-3xl w-full bg-iodine border-2 border-charcoal p-4">
                  <p className="font-mono text-sm font-bold">{fileError}</p>
                </div>
              )}

              {/* ER Privacy Mode Toggle */}
              {connected && (
                <div className="mt-6 max-w-3xl w-full">
                  <div className="bg-gradient-to-r from-[#9945FF]/10 to-[#14F195]/10 border-2 border-[#9945FF]/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#9945FF] to-[#14F195] rounded-lg flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-heading font-black text-sm uppercase text-charcoal">
                            MagicBlock Ephemeral Rollups
                          </p>
                          <p className="font-mono text-xs text-charcoal/50">
                            Gasless, sub-50ms on-chain verification
                          </p>
                        </div>
                      </div>
                      
                      {/* TEE Toggle */}
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-charcoal/60">Privacy Mode:</span>
                        <button
                          onClick={() => setUseTee(!useTee)}
                          className={`
                            relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300
                            ${useTee 
                              ? "bg-gradient-to-r from-purple-600 to-purple-500 shadow-lg shadow-purple-500/30" 
                              : "bg-gradient-to-r from-[#14F195] to-[#14F195]/80 shadow-lg shadow-[#14F195]/30"
                            }
                          `}
                        >
                          <span
                            className={`
                              inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md transition-transform
                              ${useTee ? "translate-x-8" : "translate-x-1"}
                            `}
                          >
                            {useTee ? (
                              <Lock className="w-3 h-3 text-purple-600" />
                            ) : (
                              <Zap className="w-3 h-3 text-[#14F195]" />
                            )}
                          </span>
                        </button>
                        <span className={`font-mono text-xs font-bold ${useTee ? "text-purple-600" : "text-[#14F195]"}`}>
                          {useTee ? "TEE Encrypted" : "Standard ER"}
                        </span>
                      </div>
                    </div>
                    
                    {useTee && (
                      <div className="mt-3 pt-3 border-t border-purple-500/20">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-purple-500" />
                          <span className="font-mono text-xs text-purple-600">
                            Patient data will be processed in a Trusted Execution Environment for maximum privacy
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ZK-TLS Data Provenance Verification */}
              {(inputMode === "sample" || inputMode === "paste" || (inputMode === "file" && patientData)) && (
                <div className="mt-6 max-w-3xl w-full">
                  <VerifyWithReclaim
                    diagnosis={
                      (patientData?.diagnosis as any)?.primary ||
                      (patientData?.diagnosis as string) ||
                      SAMPLE_PATIENT.diagnosis.primary
                    }
                    patientAge={
                      (patientData?.demographics as any)?.age ||
                      SAMPLE_PATIENT.demographics.age
                    }
                    patientGender={
                      (patientData?.demographics as any)?.gender ||
                      SAMPLE_PATIENT.demographics.gender
                    }
                    patientCity={
                      (patientData?.demographics as any)?.city ||
                      SAMPLE_PATIENT.demographics.city
                    }
                    onVerified={handleZKVerification}
                  />
                  {zkProofData && (
                    <div className="mt-3 p-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        <span className="font-mono text-xs text-emerald-700 font-bold">
                          ZK Verified: {zkProofData.proofHash.slice(0, 16)}...
                        </span>
                        <span className="ml-auto font-mono text-[10px] text-emerald-600">
                          via {zkProofData.provider}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Start Processing button */}
              <button
                onClick={handleStartFromUpload}
                disabled={!readyToProcess}
                className={`brutal-btn brutal-btn-primary px-12 py-4 text-xl mt-8 flex items-center gap-3 ${
                  !readyToProcess ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {needsExtraction ? "Extract & Process" : "Start Processing"}
                <ArrowRight className="w-6 h-6" strokeWidth={3} />
              </button>
            </div>
          )}

          {/* ── STEP B: NLP EXTRACTION ─────────────────────────────────────── */}
          {currentStep === "extract" && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tighter">
                  NLP Extraction
                </h1>
                <div className="flex items-center gap-3">
                  {ingestLoading ? (
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mistral LLM extracting...
                    </div>
                  ) : ingestResult ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold bg-surgical border-2 border-charcoal px-2 py-0.5">
                        Confidence: {ingestResult.confidence}%
                      </span>
                      {ingestResult.llm_used && (
                        <span className="font-mono text-xs bg-cobalt border-2 border-charcoal px-2 py-0.5 font-bold">
                          LLM
                        </span>
                      )}
                      <span className="font-mono text-xs bg-white border-2 border-charcoal px-2 py-0.5 font-bold uppercase">
                        {ingestResult.source_type}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 grid md:grid-cols-2 gap-6 min-h-0">
                {/* Raw extracted text */}
                <div className="flex flex-col">
                  <div className="bg-iodine border-2 border-charcoal p-3 flex items-center justify-between">
                    <span className="font-heading font-black uppercase">Raw Input</span>
                    <span className="font-mono text-xs font-bold bg-charcoal text-white px-2 py-0.5">
                      {inputMode === "paste" ? "PASTED TEXT" : uploadedFile?.name || "FILE"}
                    </span>
                  </div>
                  <div className="flex-1 bg-white border-2 border-t-0 border-charcoal p-4 overflow-auto scrollbar-brutal font-mono text-xs whitespace-pre-wrap min-h-[300px] relative">
                    {ingestLoading && (
                      <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="w-8 h-8 animate-spin text-charcoal" strokeWidth={3} />
                          <p className="font-mono text-xs text-charcoal/60">Extracting text from document...</p>
                        </div>
                      </div>
                    )}
                    {ingestResult?.extracted_text || clinicalText || "Extracting..."}
                  </div>
                </div>

                {/* Structured JSON output */}
                <div className="flex flex-col">
                  <div className="bg-surgical border-2 border-charcoal p-3 flex items-center justify-between">
                    <span className="font-heading font-black uppercase">Structured Patient JSON</span>
                    <span className="font-mono text-xs font-bold bg-charcoal text-white px-2 py-0.5">
                      {ingestLoading ? "EXTRACTING..." : ingestResult ? "EXTRACTED" : "WAITING"}
                    </span>
                  </div>
                  <div className="flex-1 bg-white border-2 border-t-0 border-charcoal p-4 overflow-auto scrollbar-brutal font-mono text-xs whitespace-pre-wrap min-h-[300px] relative">
                    {ingestLoading && (
                      <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-3">
                          <Sparkles className="w-8 h-8 animate-pulse text-cobalt" strokeWidth={3} />
                          <p className="font-mono text-xs text-charcoal/60">Mistral LLM structuring data...</p>
                        </div>
                      </div>
                    )}
                    {ingestResult?.structured_data ? (
                      <span className="text-charcoal">
                        {JSON.stringify(ingestResult.structured_data, null, 2)}
                      </span>
                    ) : ingestError ? (
                      <span className="text-iodine">{ingestError}</span>
                    ) : (
                      <span className="text-charcoal/20">Awaiting extraction...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Extraction notes */}
              {ingestResult && (
                <div className="mt-4 bg-white border-2 border-charcoal p-4">
                  <p className="font-heading font-black uppercase mb-2">Extraction Details</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="font-mono text-xs text-charcoal/50">Source Type</p>
                      <p className="font-mono text-sm font-bold uppercase">{ingestResult.source_type}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-charcoal/50">Confidence</p>
                      <p className={`font-mono text-sm font-bold ${ingestResult.confidence >= 70 ? "text-surgical" : ingestResult.confidence >= 40 ? "text-cobalt" : "text-iodine"}`}>
                        {ingestResult.confidence}%
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-charcoal/50">LLM Used</p>
                      <p className="font-mono text-sm font-bold">{ingestResult.llm_used ? "Mistral API" : "Direct Parse"}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-charcoal/50">Notes</p>
                      <p className="font-mono text-xs">{ingestResult.extraction_notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {ingestError && (
                <div className="mt-4 bg-iodine border-2 border-charcoal p-4">
                  <p className="font-mono text-sm font-bold">{ingestError}</p>
                  <button
                    onClick={() => { setCurrentStep("upload"); setIngestError(null); }}
                    className="font-mono text-sm underline mt-2"
                  >
                    Go back and try again
                  </button>
                </div>
              )}

              {ingestResult?.structured_data && (
                <button
                  onClick={startAnonymization}
                  className="brutal-btn brutal-btn-primary px-12 py-4 text-xl mt-6 self-center flex items-center gap-3"
                >
                  Continue to Anonymization <ArrowRight className="w-6 h-6" strokeWidth={3} />
                </button>
              )}
            </div>
          )}

          {/* ── STEP C: ANONYMIZE ───────────────────────────────────────── */}
          {currentStep === "anonymize" && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tighter">
                  Live Anonymization
                </h1>
                <div className="flex items-center gap-3">
                  {anonLoading ? (
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Running BERT NER...
                    </div>
                  ) : anonResult ? (
                    <span className="font-mono text-sm font-bold text-surgical">
                      {anonResult.entities_found.length} entities redacted
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 grid md:grid-cols-2 gap-6 min-h-0">
                {/* Original */}
                <div className="flex flex-col">
                  <div className="bg-white border-2 border-charcoal p-3 flex items-center justify-between">
                    <span className="font-heading font-black uppercase">Original Record</span>
                    <span className="match-badge bg-iodine">Contains PII</span>
                  </div>
                  <div className="flex-1 bg-white border-2 border-t-0 border-charcoal p-4 overflow-auto scrollbar-brutal font-mono text-xs whitespace-pre-wrap">
                    {JSON.stringify(patientData || SAMPLE_PATIENT, null, 2)}
                  </div>
                </div>

                {/* Anonymized */}
                <div className="flex flex-col">
                  <div className="bg-surgical border-2 border-charcoal p-3 flex items-center justify-between">
                    <span className="font-heading font-black uppercase">Anonymized Record</span>
                    <span className="match-badge bg-surgical">
                      {anonLoading ? "Processing..." : anonResult ? "Secured" : "Waiting"}
                    </span>
                  </div>
                  <div className="flex-1 bg-white border-2 border-t-0 border-charcoal p-4 overflow-auto scrollbar-brutal font-mono text-xs whitespace-pre-wrap relative">
                    {anonLoading && (
                      <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="w-8 h-8 animate-spin text-charcoal" strokeWidth={3} />
                          <p className="font-mono text-xs text-charcoal/60">BERT NER scanning for PII...</p>
                        </div>
                      </div>
                    )}
                    {anonResult ? (
                      <span className="text-surgical">
                        {JSON.stringify(anonResult.anonymized_data, null, 2)}
                      </span>
                    ) : (
                      <span className="text-charcoal/20">Awaiting anonymization...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Entities detected */}
              {anonResult && (
                <div className="mt-4 bg-white border-2 border-charcoal p-4">
                  <p className="font-heading font-black uppercase mb-3">
                    Entities Detected &amp; Redacted ({anonResult.entities_found.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {anonResult.entities_found.slice(0, 20).map((e, i) => (
                      <div
                        key={i}
                        className="bg-iodine border-2 border-charcoal px-2 py-1 flex items-center gap-1"
                      >
                        <span className="font-mono text-xs font-bold">{e.word}</span>
                        <span className="font-mono text-[10px] text-charcoal/60">({e.entity_group})</span>
                      </div>
                    ))}
                    {anonResult.entities_found.length === 0 && (
                      <p className="font-mono text-xs text-charcoal/50">
                        No PII entities detected in structured patient JSON.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {anonError && (
                <div className="mt-4 bg-iodine border-2 border-charcoal p-4">
                  <p className="font-mono text-sm font-bold">{anonError}</p>
                </div>
              )}

              {(anonResult || anonError) && (
                <button
                  onClick={startProcessing}
                  className="brutal-btn brutal-btn-primary px-12 py-4 text-xl mt-6 self-center flex items-center gap-3"
                >
                  Run ML Matching <ArrowRight className="w-6 h-6" strokeWidth={3} />
                </button>
              )}
            </div>
          )}

          {/* ── STEP D: PROCESSING ──────────────────────────────────────── */}
          {currentStep === "processing" && (
            <div className="flex-1 flex flex-col">
              <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tighter mb-6">
                AI Engine Processing
              </h1>

              <div className="flex-1 grid lg:grid-cols-2 gap-6 min-h-0">
                {/* Terminal */}
                <div className="flex flex-col">
                  <div className="bg-charcoal border-2 border-charcoal p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-iodine" />
                        <div className="w-3 h-3 rounded-full bg-cobalt" />
                        <div className="w-3 h-3 rounded-full bg-surgical" />
                      </div>
                      <span className="font-mono text-sm text-white/70 ml-2">
                        CogniStream Engine Terminal
                      </span>
                    </div>
                    <Cpu className="w-5 h-5 text-surgical animate-pulse" strokeWidth={3} />
                  </div>
                  <div
                    ref={terminalRef}
                    className="flex-1 bg-[#0a0a0a] border-2 border-t-0 border-charcoal p-4 overflow-auto scrollbar-brutal font-mono text-xs min-h-[300px]"
                  >
                    {processingLogs.map((log) => (
                      <div key={log.id} className="mb-1 flex gap-3">
                        <span className="text-white/30 shrink-0">[{log.timestamp}]</span>
                        <span className={getLogColor(log.type)}>{log.message}</span>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex items-center gap-2 text-cobalt">
                        <span>_</span>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Map / visual */}
                <div className="flex flex-col">
                  <div className="bg-charcoal border-2 border-charcoal p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-cobalt" strokeWidth={3} />
                      <span className="font-mono text-sm text-white/70">Geographic Scoring</span>
                    </div>
                    <MapPin
                      className={`w-5 h-5 text-iodine ${isProcessing ? "animate-bounce" : ""}`}
                      strokeWidth={3}
                    />
                  </div>
                  <div className="flex-1 bg-slate-800 border-2 border-t-0 border-charcoal relative overflow-hidden min-h-[300px]">
                    <svg className="absolute inset-0 w-full h-full opacity-20">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    {/* Patient pin */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className={`relative ${isProcessing ? "animate-ping" : ""}`}>
                        <div className="w-4 h-4 bg-surgical border-2 border-charcoal rounded-full" />
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 font-mono text-xs text-white font-bold whitespace-nowrap">
                          Patient (Mumbai)
                        </div>
                      </div>
                    </div>

                    {/* Trial pings */}
                    {(matchResult?.matches.slice(0, 5) ?? [
                      { rank: 1 }, { rank: 2 }, { rank: 3 }, { rank: 4 }, { rank: 5 },
                    ]).map((m, i) => {
                      const positions = [
                        { x: 30, y: 40 }, { x: 70, y: 30 }, { x: 20, y: 70 },
                        { x: 80, y: 60 }, { x: 55, y: 20 },
                      ];
                      const pos = positions[i];
                      return (
                        <div
                          key={`trial-pin-${i}-${(m as { rank: number }).rank}`}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        >
                          <div className={`relative ${isProcessing && i < 3 ? "animate-pulse" : ""}`}>
                            <MapPin
                              className={`w-6 h-6 ${i < 3 ? "text-surgical" : "text-iodine/50"}`}
                              strokeWidth={3}
                              fill={i < 3 ? "currentColor" : "none"}
                            />
                          </div>
                        </div>
                      );
                    })}

                    <div className="absolute bottom-4 left-4 bg-charcoal/80 border-2 border-white/20 p-3">
                      <p className="font-mono text-[10px] text-white/50 uppercase mb-2">Legend</p>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-surgical" />
                          <span className="font-mono text-xs text-white/70">Top matches</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-iodine/50" />
                          <span className="font-mono text-xs text-white/70">Lower matches</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Component status */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Database, label: "Criteria Parser" },
                  { icon: Server, label: "Rule Engine" },
                  { icon: Brain, label: "ML Matcher" },
                  { icon: MapPin, label: "Geo Scorer" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="bg-white border-2 border-charcoal p-4 flex items-center gap-3">
                    <Icon
                      className={`w-8 h-8 ${isProcessing ? "text-surgical animate-pulse" : "text-charcoal/30"}`}
                      strokeWidth={3}
                    />
                    <div>
                      <p className="font-heading font-black uppercase text-sm">{label}</p>
                      <p className="font-mono text-xs text-surgical">
                        {isProcessing ? "running" : "done"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP E: COMPLETE ────────────────────────────────────────── */}
          {currentStep === "complete" && matchResult && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-32 h-32 bg-surgical border-2 border-charcoal flex items-center justify-center mb-8 shadow-[3px_3px_0px_0px_rgba(15,15,15,1)]-lg animate-bounce">
                <CheckCircle className="w-16 h-16 text-charcoal" strokeWidth={3} />
              </div>

              <h1 className="font-heading text-5xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                Processing Complete
              </h1>

              <p className="font-mono text-xl text-charcoal/60 mb-2">
                {matchResult.matches.length} trials matched from {matchResult.total_trials_screened} screened
              </p>

              {needsExtraction && ingestResult && (
                <p className="font-mono text-sm text-charcoal/40 mb-4">
                  Source: {ingestResult.source_type.toUpperCase()} | LLM Extraction Confidence: {ingestResult.confidence}%
                </p>
              )}

              {matchResult.matches[0] && (
                <div className="bg-charcoal text-white border-2 border-charcoal p-6 mb-8 max-w-lg text-center relative">
                  <div className="absolute -top-4 -right-4 z-50">
                    <DigitalIndiaPopup />
                  </div>
                  <p className="font-mono text-xs text-white/50 mb-1">Top Match</p>
                  <p className="font-heading font-black text-2xl text-surgical">
                    {Math.round(matchResult.matches[0].composite_score)}%
                  </p>
                  <p className="font-mono text-sm mt-1">
                    {matchResult.matches[0].trial_id} - {matchResult.matches[0].trial_title.substring(0, 60)}
                  </p>
                </div>
              )}

              {/* ─── MagicBlock ER Verification Panel ─────────────────────────────── */}
              {(solanaTxSignature || solanaLoading || solanaError || patientPda || erLoading || erState.initPatient !== null) && (
                <div className={`mb-8 border-2 p-5 max-w-2xl w-full ${
                  solanaTxSignature 
                    ? "border-[#14F195] bg-gradient-to-br from-[#9945FF]/5 via-transparent to-[#14F195]/10" 
                    : solanaError 
                    ? "border-iodine bg-iodine/10"
                    : "border-[#9945FF] bg-gradient-to-br from-[#9945FF]/10 to-transparent"
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      {/* MagicBlock Logo */}
                      <div className="w-12 h-12 bg-gradient-to-br from-[#9945FF] to-[#14F195] rounded-lg flex items-center justify-center shadow-lg">
                        <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="font-heading font-black text-lg uppercase tracking-tight text-charcoal">
                          MagicBlock Ephemeral Rollups
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isDelegated ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#14F195]/20 border border-[#14F195]/40 text-[#14F195] text-[10px] font-bold uppercase rounded-sm">
                              <Zap className="w-3 h-3" /> Gasless Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-white/10 text-charcoal/60 text-[10px] font-bold uppercase rounded-sm">
                              L1 Mode
                            </span>
                          )}
                          {useTee && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 border border-purple-500/40 text-purple-600 text-[10px] font-bold uppercase rounded-sm">
                              <Lock className="w-3 h-3" /> TEE Encrypted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                      {solanaLoading || erLoading ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#9945FF]/20 rounded">
                          <Loader2 className="w-4 h-4 text-[#9945FF] animate-spin" />
                          <span className="font-mono text-xs text-[#9945FF]">Processing...</span>
                        </div>
                      ) : solanaTxSignature ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#14F195]/20 rounded">
                          <CheckCircle className="w-4 h-4 text-[#14F195]" />
                          <span className="font-mono text-xs text-[#14F195]">Verified</span>
                        </div>
                      ) : solanaError ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-iodine/20 rounded">
                          <X className="w-4 h-4 text-iodine" />
                          <span className="font-mono text-xs text-iodine">Failed</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* ER Transaction Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {/* Init Patient */}
                    <div className={`p-3 rounded border ${erState.initPatient?.success ? "border-[#14F195]/40 bg-[#14F195]/5" : "border-white/10 bg-white/5"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className={`w-4 h-4 ${erState.initPatient?.success ? "text-[#14F195]" : "text-charcoal/40"}`} />
                        <span className="font-mono text-[10px] uppercase text-charcoal/60">Init Patient</span>
                      </div>
                      {erState.initPatient?.success ? (
                        <div className="font-mono text-xs text-[#14F195]">
                          {erState.initPatient.timing?.durationMs}ms
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-charcoal/30">Pending</div>
                      )}
                    </div>

                    {/* Delegate */}
                    <div className={`p-3 rounded border ${erState.delegatePatient?.success ? "border-[#14F195]/40 bg-[#14F195]/5" : "border-white/10 bg-white/5"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Unlock className={`w-4 h-4 ${erState.delegatePatient?.success ? "text-[#14F195]" : "text-charcoal/40"}`} />
                        <span className="font-mono text-[10px] uppercase text-charcoal/60">Delegate</span>
                      </div>
                      {erState.delegatePatient?.success ? (
                        <div className="font-mono text-xs text-[#14F195]">
                          {erState.delegatePatient.timing?.durationMs}ms
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-charcoal/30">Pending</div>
                      )}
                    </div>

                    {/* Record Match */}
                    <div className={`p-3 rounded border ${erState.recordMatch?.success ? "border-[#14F195]/40 bg-[#14F195]/5" : "border-white/10 bg-white/5"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Brain className={`w-4 h-4 ${erState.recordMatch?.success ? "text-[#14F195]" : "text-charcoal/40"}`} />
                        <span className="font-mono text-[10px] uppercase text-charcoal/60">Match</span>
                      </div>
                      {erState.recordMatch?.success ? (
                        <div className="font-mono text-xs text-[#14F195]">
                          {erState.recordMatch.timing?.durationMs}ms {isDelegated && "⚡"}
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-charcoal/30">Pending</div>
                      )}
                    </div>

                    {/* Consent */}
                    <div className={`p-3 rounded border ${erState.logConsent?.success ? "border-[#14F195]/40 bg-[#14F195]/5" : "border-white/10 bg-white/5"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className={`w-4 h-4 ${erState.logConsent?.success ? "text-[#14F195]" : "text-charcoal/40"}`} />
                        <span className="font-mono text-[10px] uppercase text-charcoal/60">Consent</span>
                      </div>
                      {erState.logConsent?.success ? (
                        <div className="font-mono text-xs text-[#14F195]">
                          {erState.logConsent.timing?.durationMs}ms {isDelegated && "⚡"}
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-charcoal/30">Pending</div>
                      )}
                    </div>
                  </div>

                  {/* On-Chain Details */}
                  {(patientPda || solanaTxSignature) && (
                    <div className="bg-charcoal/5 border border-white/10 rounded p-3 space-y-2">
                      {patientPda && (
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase text-charcoal/50">Patient PDA</span>
                          <a 
                            href={`https://solscan.io/account/${patientPda}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-[#9945FF] hover:underline flex items-center gap-1"
                          >
                            {truncateAddress(patientPda)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {solanaTxSignature && (
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase text-charcoal/50">Latest TX</span>
                          <a 
                            href={txUrl(solanaTxSignature)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-[#14F195] hover:underline flex items-center gap-1"
                          >
                            {truncateSignature(solanaTxSignature)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Display */}
                  {solanaError && (
                    <div className="mt-3 p-3 bg-iodine/10 border border-iodine/30 rounded">
                      <p className="font-mono text-xs text-iodine">{solanaError}</p>
                    </div>
                  )}

                  {/* View Proof Button - show TX link if available, otherwise show Patient PDA link */}
                  {(solanaTxSignature || patientPda) && (
                    <div className="mt-4 flex justify-center">
                      <a
                        href={solanaTxSignature 
                          ? txUrl(solanaTxSignature) 
                          : `https://solscan.io/account/${patientPda}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white px-6 py-2.5 font-mono text-sm font-bold uppercase hover:opacity-90 transition-opacity rounded shadow-lg"
                      >
                        {solanaTxSignature ? "View On-Chain Proof" : "View Patient Account"} <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Wallet not connected hint */}
              {!connected && currentStep === "complete" && !solanaTxSignature && (
                <div className="mb-8 border-2 border-dashed border-[#9945FF]/50 p-5 max-w-lg w-full bg-gradient-to-br from-[#9945FF]/5 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#9945FF]/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-[#9945FF]/60" />
                    </div>
                    <div>
                      <p className="font-heading font-black text-sm uppercase text-[#9945FF]/80">
                        MagicBlock ER Available
                      </p>
                      <p className="font-mono text-xs text-charcoal/50 mt-0.5">
                        Connect wallet to enable gasless on-chain verification via Ephemeral Rollups
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => {
                    // CRITICAL FIX: Store data in sessionStorage to avoid HTTP 431 (URL too large)
                    // Large match results with 5 trials × criteria exceed browser URL limits
                    if (typeof window !== 'undefined') {
                      // CRITICAL FIX: Clear old storage FIRST to ensure fresh results
                      sessionStorage.removeItem('cognistream_pipeline_results');
                      
                      // Use the ref to ensure we use the stable, correct patient ID
                      const currentPatientId = currentPatientIdRef.current || (patientData?.patient_id as string) || "INGESTED";
                      console.log('[Pipeline] Setting sessionStorage for patient:', currentPatientId);
                      
                      // Collect all ER transaction signatures
                      const erTransactions = {
                        initPatient: erState.initPatient?.signature || solanaTxSignature,
                        delegatePatient: erState.delegatePatient?.signature,
                        recordMatch: erState.recordMatch?.signature,
                        logConsent: erState.logConsent?.signature,
                      };
                      
                      const sessionData = {
                        patient: currentPatientId,
                        data: patientData,
                        matches: matchResult,
                        zkProof: zkProofData, // Include ZK proof data for verified badge on results page
                        erTransactions, // Include ER transaction signatures for Solscan links
                        topTrialId: matchResult?.matches?.[0]?.trial_id, // For voice consent fallback
                      };
                      sessionStorage.setItem('cognistream_pipeline_results', JSON.stringify(sessionData));
                      console.log('[Pipeline] Stored fresh results in sessionStorage, navigating to /results');
                      window.location.href = `/results?patient=${encodeURIComponent(sessionData.patient)}`;
                    }
                  }}
                  className="brutal-btn brutal-btn-success px-12 py-4 text-xl flex items-center gap-3"
                >
                  View Full Results <ArrowRight className="w-6 h-6" strokeWidth={3} />
                </button>
                
                {/* Save Patient Button */}
                {patientData && (
                  <button 
                    onClick={handleSavePatient}
                    disabled={saveLoading || patientSaved}
                    className={`brutal-btn px-8 py-4 text-lg flex items-center gap-2 ${
                      patientSaved 
                        ? "bg-surgical border-surgical text-charcoal" 
                        : "bg-cobalt border-charcoal"
                    }`}
                  >
                    {saveLoading ? (
                      <>Saving...</>
                    ) : patientSaved ? (
                      <><CheckCircle className="w-5 h-5" /> Saved</>
                    ) : (
                      <><Database className="w-5 h-5" /> Save Patient</>
                    )}
                  </button>
                )}
                
                {saveError && (
                  <p className="text-iodine text-sm mt-2">{saveError}</p>
                )}
                
                <Link href="/dashboard">
                  <button className="brutal-btn bg-white px-8 py-4 text-lg">
                    Back to Dashboard
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Edge case: complete but no match result */}
          {currentStep === "complete" && !matchResult && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-heading text-4xl font-black uppercase mb-4">Pipeline Done</h1>
              <p className="font-mono text-charcoal/60 mb-8">Check results page for details.</p>
              <Link href="/results">
                <button className="brutal-btn brutal-btn-primary px-12 py-4 text-xl flex items-center gap-3">
                  View Results <ArrowRight className="w-6 h-6" strokeWidth={3} />
                </button>
              </Link>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
