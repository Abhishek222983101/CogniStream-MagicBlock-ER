/**
 * Reclaim Protocol ZK-TLS Integration for CogniStream
 * Enables patients to prove their medical diagnosis without revealing identity
 * 
 * IMPORTANT: This is a demonstration/mock implementation for hackathon purposes.
 * In production, you would need to:
 * 1. Register with Reclaim Protocol to get actual APP_ID and APP_SECRET
 * 2. Configure real healthcare provider schemas (Apollo, AIIMS, etc.)
 * 3. Handle actual ZK proof verification on-chain
 */

import { sha256Hex } from "./hash";

// Demo constants - in production these would come from .env
// Register at https://dev.reclaimprotocol.org/applications
const DEMO_APP_ID = "0x8b9E85f8FfE4eCc65B0B30b70f6D2f9C7C0D9e3A";
const DEMO_APP_SECRET = "demo-secret-for-hackathon";

// Provider schemas for Indian healthcare portals
export const HEALTHCARE_PROVIDERS = {
  APOLLO: {
    id: "apollo-patient-portal",
    name: "Apollo Patient Portal",
    description: "Verify diagnosis from Apollo Hospitals",
    icon: "/icons/apollo.png",
    extractFields: ["diagnosis", "patient_age", "patient_gender", "hospital_branch"],
  },
  AIIMS: {
    id: "aiims-patient-portal", 
    name: "AIIMS Patient Portal",
    description: "Verify diagnosis from AIIMS hospitals",
    icon: "/icons/aiims.png",
    extractFields: ["diagnosis", "patient_age", "patient_gender", "department"],
  },
  MAX: {
    id: "max-healthcare-portal",
    name: "Max Healthcare Portal",
    description: "Verify diagnosis from Max hospitals",
    icon: "/icons/max.png",
    extractFields: ["diagnosis", "patient_age", "patient_gender", "facility"],
  },
  GENERIC: {
    id: "generic-medical-record",
    name: "Medical Record Verification",
    description: "Verify medical diagnosis from any supported provider",
    icon: "/icons/medical.png",
    extractFields: ["diagnosis", "patient_age", "patient_gender"],
  },
};

export type HealthcareProviderId = keyof typeof HEALTHCARE_PROVIDERS;

// ZK Proof data structure
export interface ZKProofData {
  proofHash: string;
  provider: HealthcareProviderId;
  claimedFields: {
    diagnosis?: string;
    diagnosisCategory?: string;
    patientAge?: string;
    patientGender?: string;
    hospitalBranch?: string;
    verificationTime: number;
  };
  signature: string;
  isValid: boolean;
  confidence: number;
}

// Verification result
export interface VerificationResult {
  success: boolean;
  proofData?: ZKProofData;
  error?: string;
  explorerUrl?: string;
}

// Mock proof generation state
export interface ProofGenerationState {
  status: "idle" | "connecting" | "authenticating" | "generating" | "verifying" | "complete" | "error";
  progress: number;
  message: string;
  qrCodeUrl?: string;
  proofData?: ZKProofData;
  error?: string;
}

/**
 * Generate a mock ZK proof for demo purposes
 * In production, this would use the actual Reclaim SDK
 */
export async function generateZKProof(
  provider: HealthcareProviderId,
  patientData: {
    diagnosis: string;
    age?: number;
    gender?: string;
    city?: string;
  },
  onProgress?: (state: ProofGenerationState) => void
): Promise<VerificationResult> {
  // Simulate proof generation flow
  const states: ProofGenerationState[] = [
    { status: "connecting", progress: 10, message: "Connecting to Reclaim Protocol..." },
    { status: "authenticating", progress: 30, message: "Requesting ZK-TLS session..." },
    { status: "generating", progress: 50, message: "Generating zero-knowledge proof..." },
    { status: "generating", progress: 70, message: "Computing cryptographic commitment..." },
    { status: "verifying", progress: 90, message: "Verifying proof integrity..." },
  ];

  for (const state of states) {
    onProgress?.(state);
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
  }

  // Generate deterministic proof hash based on patient data
  const proofInput = JSON.stringify({
    diagnosis: patientData.diagnosis,
    age: patientData.age || "unknown",
    gender: patientData.gender || "unknown",
    provider,
    timestamp: Math.floor(Date.now() / 60000), // Minute-level granularity for demo
  });

  // FIXED: Use sha256Hex to get proper hex string instead of byte array
  const proofHash = await sha256Hex(proofInput);
  const signatureInput = `${proofHash}:${DEMO_APP_ID}`;
  const signature = await sha256Hex(signatureInput);

  // Detect diagnosis category for matching
  const diagnosisLower = patientData.diagnosis.toLowerCase();
  let diagnosisCategory = "other";
  if (diagnosisLower.includes("lung") || diagnosisLower.includes("nsclc") || diagnosisLower.includes("sclc")) {
    diagnosisCategory = "lung_cancer";
  } else if (diagnosisLower.includes("breast")) {
    diagnosisCategory = "breast_cancer";
  } else if (diagnosisLower.includes("colon") || diagnosisLower.includes("colorectal")) {
    diagnosisCategory = "colorectal_cancer";
  } else if (diagnosisLower.includes("diabetes")) {
    diagnosisCategory = "diabetes";
  } else if (diagnosisLower.includes("heart") || diagnosisLower.includes("cardiac")) {
    diagnosisCategory = "cardiac";
  }

  const proofData: ZKProofData = {
    proofHash: `0x${proofHash}`,  // Already a hex string from sha256Hex
    provider,
    claimedFields: {
      diagnosis: patientData.diagnosis,
      diagnosisCategory,
      patientAge: patientData.age?.toString(),
      patientGender: patientData.gender,
      hospitalBranch: patientData.city ? `${HEALTHCARE_PROVIDERS[provider].name} - ${patientData.city}` : undefined,
      verificationTime: Date.now(),
    },
    signature: `0x${signature}`,  // Already a hex string from sha256Hex
    isValid: true,
    confidence: 95 + Math.random() * 5, // 95-100% confidence
  };

  onProgress?.({
    status: "complete",
    progress: 100,
    message: "Verification complete!",
    proofData,
  });

  return {
    success: true,
    proofData,
    // NOTE: This is a demo proof - the explorer URL won't resolve on Reclaim's actual explorer.
    // In production with real Reclaim integration, proofs would be registered and viewable.
    // We keep this field for API compatibility but UI should not link to it for demo proofs.
    explorerUrl: undefined,
  };
}

/**
 * Verify a ZK proof on backend
 */
export async function verifyZKProof(
  proofHash: string,
  signature: string,
  claimedFields: Record<string, any>
): Promise<{ valid: boolean; error?: string }> {
  // In production, this would call the Reclaim verification API
  // For demo, we do basic signature validation
  
  if (!proofHash || !proofHash.startsWith("0x")) {
    return { valid: false, error: "Invalid proof hash format" };
  }
  
  if (!signature || !signature.startsWith("0x")) {
    return { valid: false, error: "Invalid signature format" };
  }
  
  if (!claimedFields.diagnosis) {
    return { valid: false, error: "Missing diagnosis claim" };
  }
  
  // Check timestamp is within 24 hours
  const now = Date.now();
  const verificationTime = claimedFields.verificationTime;
  if (verificationTime && now - verificationTime > 24 * 60 * 60 * 1000) {
    return { valid: false, error: "Proof expired (>24 hours old)" };
  }
  
  return { valid: true };
}

/**
 * Store proof in sessionStorage for pipeline use
 */
export function storeProofInSession(proofData: ZKProofData): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("cognistream_zk_proof", JSON.stringify(proofData));
    console.log("[ZK-TLS] Stored proof in session:", proofData.proofHash);
  }
}

/**
 * Retrieve proof from sessionStorage
 */
export function getProofFromSession(): ZKProofData | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("cognistream_zk_proof");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Clear proof from session
 */
export function clearProofFromSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("cognistream_zk_proof");
  }
}

/**
 * Format proof for display
 */
export function formatProofForDisplay(proofData: ZKProofData): string {
  return `ZK Proof: ${proofData.proofHash.slice(0, 10)}...${proofData.proofHash.slice(-6)}`;
}

/**
 * Get human-readable provider name
 */
export function getProviderName(providerId: HealthcareProviderId): string {
  return HEALTHCARE_PROVIDERS[providerId]?.name || "Unknown Provider";
}

/**
 * Check if ZK-TLS feature is available (demo mode always returns true)
 */
export function isZKTLSAvailable(): boolean {
  return true; // Demo mode
}

/**
 * Get demo instructions for hackathon judges
 */
export function getDemoInstructions(): string {
  return `
ZK-TLS Data Provenance Demo

This demonstration shows how patients can verify their medical diagnosis 
without revealing their identity:

1. Click "Verify with Reclaim" on the Pipeline page
2. Select a healthcare provider (Apollo, AIIMS, Max)
3. The system generates a ZK proof of your diagnosis
4. The proof hash is stored on-chain via MagicBlock ER
5. Trial matchers can verify the proof without seeing PII

In production, patients would:
- Log into their actual hospital portal (Apollo MyHealth, etc.)
- Reclaim's ZK-TLS technology captures the diagnosis data
- A cryptographic proof is generated client-side
- Only the proof (not the data) is shared with trial coordinators

This combines:
- MagicBlock ER: Fast, gasless on-chain verification
- Reclaim ZK-TLS: Privacy-preserving data provenance  
- NER Anonymization: PII removal from clinical notes
`.trim();
}
