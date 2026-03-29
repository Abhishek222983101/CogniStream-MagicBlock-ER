/**
 * TrialMatch AI - Backend API Client
 * Connects to FastAPI Python backend at localhost:8000
 * All frontend pages use this client - NEVER call backend directly from pages.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types matching backend Pydantic schemas exactly ─────────────────────────

export interface BackendPatient {
  patient_id: string;
  demographics: {
    age: number;
    gender: string;
    name?: string;
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
  };
  diagnosis: {
    primary: string;
    subtype?: string;
    stage?: string;
    icd10?: string;
    biomarkers?: Record<string, string> | null;
  };
  medical_history: string[];
  medications: string[];
  prior_treatments: {
    type?: string;
    name?: string;
    date?: string;
    hospital?: string;
  }[];
  lab_values?: {
    hemoglobin?: number;
    wbc?: number;
    platelets?: number;
    creatinine?: number;
    bilirubin?: number;
    alt?: number;
    ast?: number;
  } | null;
  ecog_status?: number | null;
  smoking_status?: string | null;
  allergies: string[];
  clinical_notes?: string | null;
}

export interface BackendTrial {
  trial_id: string;
  title: string;
  conditions: string[];
  phase: string;
  status: string;
  sponsor: string;
  locations: {
    facility: string;
    city: string;
    state: string;
    country?: string;
    lat?: number;
    lng?: number;
  }[];
  inclusion_criteria_raw?: string;
  exclusion_criteria_raw?: string;
  age_range?: { min: string; max: string };
  gender: string;
  fetched_at?: string;
}

export interface CriterionResult {
  criterion: string;
  type: string;        // "inclusion" | "exclusion"
  category: string;   // "hard" | "semantic"
  status: string;     // "PASS" | "FAIL" | "UNCLEAR"
  confidence: number; // 0-100
  detail?: string;
  reasoning?: string;
}

export interface ScoreBreakdown {
  rule_engine: number;
  embedding_similarity: number;
  llm_confidence: number;
  geographic: number;
}

export interface MatchResult {
  trial_id: string;
  trial_title: string;
  composite_score: number;
  rank: number;
  location?: {
    facility?: string;
    city?: string;
    state?: string;
  };
  distance_km?: number;
  criteria_results: CriterionResult[];
  score_breakdown: ScoreBreakdown;
  exclusion_triggered: boolean;
}

export interface MatchResponse {
  patient_id: string;
  patient_summary: string;
  total_trials_screened: number;
  matches: MatchResult[];
}

export interface HealthStatus {
  status: string;
  models_loaded: {
    ner_anonymizer: boolean;
    embedding_matcher: boolean;
    llm_matcher_local: boolean;
    llm_matcher_api: boolean;
    trials_count: number;
    patients_count: number;
  };
  gpu_available: boolean;
  gpu_name?: string;
  gpu_memory_gb?: number;
}

export interface PatientListItem {
  patient_id: string;
  age: number;
  gender: string;
  city?: string;
  diagnosis: string;
  stage?: string;
}

export interface AnonymizeResponse {
  anonymized_data: Record<string, unknown>;
  entities_found: { word: string; entity_group: string; score: number }[];
  replacements: Record<string, string>;
}

// ─── Fetch helper with error handling ────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  timeoutMs = 60000
): Promise<{ data: T | null; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.text();
      return { data: null, error: `HTTP ${res.status}: ${errBody}` };
    }

    const data: T = await res.json();
    return { data, error: null };
  } catch (e: unknown) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === "AbortError") {
      return { data: null, error: "Request timed out. Is the backend running?" };
    }
    return {
      data: null,
      error:
        e instanceof Error
          ? `Network error: ${e.message}. Make sure backend is running at ${API_BASE}`
          : "Unknown network error",
    };
  }
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Check if backend is running and models are loaded.
 */
export async function fetchHealth(): Promise<{
  data: HealthStatus | null;
  error: string | null;
}> {
  return apiFetch<HealthStatus>("/api/health", undefined, 10000);
}

/**
 * GET /api/patients
 * Get list of all patients from backend data/patients.json (50 real synthetic patients).
 */
export async function fetchPatients(): Promise<{
  data: { total: number; patients: PatientListItem[] } | null;
  error: string | null;
}> {
  return apiFetch<{ total: number; patients: PatientListItem[] }>("/api/patients");
}

/**
 * GET /api/trials
 * Get list of trials with optional filters.
 */
export async function fetchTrials(params?: {
  condition?: string;
  state?: string;
  status?: string;
  phase?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  data: { total: number; trials: BackendTrial[] } | null;
  error: string | null;
}> {
  const qs = new URLSearchParams();
  if (params?.condition) qs.set("condition", params.condition);
  if (params?.state) qs.set("state", params.state);
  if (params?.status) qs.set("status", params.status);
  if (params?.phase) qs.set("phase", params.phase);
  if (params?.limit) qs.set("limit", params.limit.toString());
  if (params?.offset) qs.set("offset", params.offset.toString());
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<{ total: number; trials: BackendTrial[] }>(`/api/trials${query}`);
}

/**
 * GET /api/trials/{trial_id}
 * Get a single trial by NCT ID.
 */
export async function fetchTrial(trialId: string): Promise<{
  data: BackendTrial | null;
  error: string | null;
}> {
  return apiFetch<BackendTrial>(`/api/trials/${trialId}`);
}

/**
 * POST /api/anonymize
 * Anonymize a patient record using BERT NER.
 * patient_data: raw dict (can include name, address, etc.)
 */
export async function anonymizePatient(patientData: Record<string, unknown>): Promise<{
  data: AnonymizeResponse | null;
  error: string | null;
}> {
  return apiFetch<AnonymizeResponse>("/api/anonymize", {
    method: "POST",
    body: JSON.stringify({ patient_data: patientData }),
  });
}

/**
 * POST /api/match-all
 * Match a patient (by ID or raw data) against ALL 97 trials.
 * Returns ranked results with composite ML scores.
 * timeout: 120s because ML inference takes time
 */
export async function matchAll(
  patientIdOrData: string | Record<string, unknown>,
  limit = 20
): Promise<{ data: MatchResponse | null; error: string | null }> {
  const body =
    typeof patientIdOrData === "string"
      ? { patient_id: patientIdOrData, limit }
      : { patient_data: patientIdOrData, limit };

  return apiFetch<MatchResponse>("/api/match-all", {
    method: "POST",
    body: JSON.stringify(body),
  }, 300000); // 5 min timeout - ML takes time
}

/**
 * POST /api/match
 * Match a patient against specific trial IDs only.
 */
export async function matchPatient(
  patientIdOrData: string | Record<string, unknown>,
  trialIds: string[]
): Promise<{ data: MatchResponse | null; error: string | null }> {
  const body =
    typeof patientIdOrData === "string"
      ? { patient_id: patientIdOrData, trial_ids: trialIds }
      : { patient_data: patientIdOrData, trial_ids: trialIds };

  return apiFetch<MatchResponse>("/api/match", {
    method: "POST",
    body: JSON.stringify(body),
  }, 300000);
}

/**
 * POST /api/parse-criteria
 * Parse raw criteria text into structured rules.
 */
export async function parseCriteria(
  inclusionCriteria: string,
  exclusionCriteria: string
): Promise<{ data: unknown | null; error: string | null }> {
  return apiFetch<unknown>("/api/parse-criteria", {
    method: "POST",
    body: JSON.stringify({
      inclusion_criteria: inclusionCriteria,
      exclusion_criteria: exclusionCriteria,
    }),
  });
}

// ─── Ingest: Upload unstructured files (PDF, DOCX, TXT) or paste clinical text ─

export interface IngestResponse {
  extracted_text: string;
  structured_data: Record<string, unknown> | null;
  source_type: "pdf" | "docx" | "json" | "text";
  confidence: number;
  llm_used: boolean;
  extraction_notes: string;
  llm_raw_response?: string;
}

/**
 * POST /api/ingest — multipart file upload
 * Sends a PDF/DOCX/TXT/JSON file to backend for text extraction + LLM parsing.
 */
export async function ingestFile(file: File): Promise<{
  data: IngestResponse | null;
  error: string | null;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/ingest`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
      // NOTE: do NOT set Content-Type — browser sets multipart boundary automatically
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.text();
      return { data: null, error: `HTTP ${res.status}: ${errBody}` };
    }

    const data: IngestResponse = await res.json();
    return { data, error: null };
  } catch (e: unknown) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === "AbortError") {
      return { data: null, error: "Ingest timed out. The file may be too large." };
    }
    return {
      data: null,
      error: e instanceof Error ? `Network error: ${e.message}` : "Unknown error",
    };
  }
}

/**
 * POST /api/ingest — raw clinical text (form field)
 * Sends pasted clinical notes to backend for LLM extraction.
 */
export async function ingestText(clinicalText: string): Promise<{
  data: IngestResponse | null;
  error: string | null;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);

  try {
    const formData = new FormData();
    formData.append("clinical_text", clinicalText);

    const res = await fetch(`${API_BASE}/api/ingest`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.text();
      return { data: null, error: `HTTP ${res.status}: ${errBody}` };
    }

    const data: IngestResponse = await res.json();
    return { data, error: null };
  } catch (e: unknown) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === "AbortError") {
      return { data: null, error: "Ingest timed out." };
    }
    return {
      data: null,
      error: e instanceof Error ? `Network error: ${e.message}` : "Unknown error",
    };
  }
}

// ─── Helper: Build a PatientRecord from a raw/uploaded JSON ─────────────────
// This transforms the format a user might upload into what the backend expects.

export function buildPatientRecord(raw: Record<string, any>): Record<string, unknown> {
  // Handle case where data is nested in demographics/diagnosis objects
  const demo = typeof raw.demographics === "object" && raw.demographics !== null ? raw.demographics : raw;
  const diag = typeof raw.diagnosis === "object" && raw.diagnosis !== null ? raw.diagnosis : raw;

  // Always sanitize and provide defaults - even for "complete" looking records
  // This fixes cases where LLM extraction returns null for required fields like gender
  return {
    patient_id: (raw.patient_id as string) || `UPLOAD_${Date.now()}`,
    demographics: {
      age: demo.age ?? 0,
      gender: demo.gender || "Unknown",  // CRITICAL: Backend requires non-null string
      name: demo.name || null,
      city: demo.city || null,
      state: demo.state || null,
      lat: demo.lat ?? null,
      lng: demo.lng ?? null,
    },
    diagnosis: {
      primary: diag.primary || diag.diagnosis || diag.primary_diagnosis || "Unknown",
      subtype: diag.subtype || null,
      stage: diag.stage || null,
      icd10: diag.icd10 || null,
      biomarkers: diag.biomarkers as Record<string, string> || null,
    },
    medical_history: (raw.medical_history as string[]) || [],
    medications: (raw.medications as string[]) || [],
    prior_treatments: (raw.prior_treatments as unknown[]) || [],
    lab_values: raw.lab_values || null,
    ecog_status: raw.ecog_status ?? null,
    smoking_status: raw.smoking_status || null,
    allergies: (raw.allergies as string[]) || [],
    clinical_notes: (raw.clinical_notes as string) || "",
  };
}

// ─── Score color helpers (used across multiple pages) ─────────────────────────

export function getScoreColor(score: number): string {
  if (score >= 70) return "#A7F3D0"; // lime-green - strong match
  if (score >= 50) return "#FFD700"; // cyber-yellow - partial match
  return "#FF6B6B"; // hot-coral - weak match
}

export function getScoreBadgeClass(score: number): string {
  if (score >= 70) return "match-badge-success";
  if (score >= 50) return "match-badge-warning";
  return "match-badge-danger";
}

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case "PASS": return "text-lime-green";
    case "FAIL": return "text-hot-coral";
    case "UNCLEAR": return "text-cyber-yellow";
    default: return "text-black/50";
  }
}

export function getStatusBg(status: string): string {
  switch (status.toUpperCase()) {
    case "PASS": return "bg-lime-green text-black";
    case "FAIL": return "bg-hot-coral text-black";
    case "UNCLEAR": return "bg-cyber-yellow text-black";
    default: return "bg-black/20 text-black";
  }
}

// ─── Patient Management: Save/Delete ────────────────────────────────────────

export interface SavePatientResponse {
  success: boolean;
  patient_id: string;
  message: string;
}

export interface DeletePatientResponse {
  success: boolean;
  patient_id: string;
  message: string;
}

/**
 * POST /api/patients
 * Save a patient record to data/patients.json
 */
export async function savePatient(patientData: Record<string, unknown>): Promise<{
  data: SavePatientResponse | null;
  error: string | null;
}> {
  return apiFetch<SavePatientResponse>("/api/patients", {
    method: "POST",
    body: JSON.stringify({ patient_data: patientData }),
  });
}

/**
 * DELETE /api/patients/{patient_id}
 * Delete a patient from data/patients.json
 */
export async function deletePatient(patientId: string): Promise<{
  data: DeletePatientResponse | null;
  error: string | null;
}> {
  return apiFetch<DeletePatientResponse>(`/api/patients/${patientId}`, {
    method: "DELETE",
  });
}

/**
 * GET /api/patients/{patient_id}
 * Get a specific patient by ID
 */
export async function getPatient(patientId: string): Promise<{
  data: BackendPatient | null;
  error: string | null;
}> {
  return apiFetch<BackendPatient>(`/api/patients/${patientId}`);
}
