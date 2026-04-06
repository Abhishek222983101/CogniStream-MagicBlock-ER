/**
 * Voice Consent Integration for CogniStream
 * Enables gasless on-chain consent logging triggered by voice commands
 */

import { PublicKey, Connection } from "@solana/web3.js";
import { ERClient, LogConsentParams, TransactionResult } from "./er-client";
import { derivePatientPda, deriveConsentPda } from "./pdas";
import { txUrl, truncateSignature } from "./explorer";

// Consent types matching on-chain enum
export enum ConsentType {
  ViewResults = 0,
  ContactForEnrollment = 1,
  ShareData = 2,
  FullParticipation = 3,
}

// Voice consent intent detection patterns
export const CONSENT_INTENT_PATTERNS = {
  VIEW_RESULTS: [
    "i want to see",
    "show me results",
    "view results",
    "let me see",
    "i consent to view",
    "yes show me",
    "yes i want to see",
  ],
  CONTACT_ENROLLMENT: [
    "contact me",
    "reach out",
    "get in touch",
    "call me",
    "i want to be contacted",
    "enroll me",
    "sign me up",
    "i'm interested",
    "i want to participate",
    "yes contact",
    "yes enroll",
  ],
  SHARE_DATA: [
    "share my data",
    "share data",
    "share information",
    "share my medical",
    "i consent to share",
    "yes share",
  ],
  FULL_PARTICIPATION: [
    "full consent",
    "fully participate",
    "complete consent",
    "all permissions",
    "i agree to everything",
    "full participation",
    "yes to everything",
  ],
};

export interface VoiceConsentResult {
  detected: boolean;
  consentType?: ConsentType;
  trialId?: string;
  confidence: number;
  matchedPattern?: string;
}

export interface ConsentTransactionResult {
  success: boolean;
  signature?: string;
  timing?: {
    startMs: number;
    endMs: number;
    durationMs: number;
  };
  error?: string;
  explorerUrl?: string;
}

/**
 * Detect consent intent from voice/text input
 */
export function detectConsentIntent(
  text: string,
  currentTrialId?: string
): VoiceConsentResult {
  const normalizedText = text.toLowerCase().trim();
  let highestConfidence = 0;
  let detectedType: ConsentType | undefined;
  let matchedPattern: string | undefined;

  // Check each consent type
  for (const [typeKey, patterns] of Object.entries(CONSENT_INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (normalizedText.includes(pattern)) {
        const confidence = pattern.length / normalizedText.length * 100;
        if (confidence > highestConfidence) {
          highestConfidence = Math.min(confidence * 1.5, 95); // Scale up but cap at 95
          matchedPattern = pattern;
          
          switch (typeKey) {
            case "VIEW_RESULTS":
              detectedType = ConsentType.ViewResults;
              break;
            case "CONTACT_ENROLLMENT":
              detectedType = ConsentType.ContactForEnrollment;
              break;
            case "SHARE_DATA":
              detectedType = ConsentType.ShareData;
              break;
            case "FULL_PARTICIPATION":
              detectedType = ConsentType.FullParticipation;
              break;
          }
        }
      }
    }
  }

  // Try to extract trial ID from text
  let trialId = currentTrialId;
  const trialIdMatch = normalizedText.match(/nct\d{8}/i);
  if (trialIdMatch) {
    trialId = trialIdMatch[0].toUpperCase();
  }

  return {
    detected: detectedType !== undefined && highestConfidence >= 30,
    consentType: detectedType,
    trialId,
    confidence: Math.round(highestConfidence),
    matchedPattern,
  };
}

/**
 * Execute consent logging on-chain via Ephemeral Rollups
 */
export async function logVoiceConsent(
  erClient: ERClient,
  patientId: string,
  trialId: string,
  consentType: ConsentType,
  isDelegated: boolean = true
): Promise<ConsentTransactionResult> {
  const startMs = Date.now();

  try {
    const params: LogConsentParams = {
      patientId,
      trialId,
      consentType,
    };

    const result = await erClient.logConsent(params, isDelegated);

    if (result.success && result.signature) {
      const endMs = Date.now();
      return {
        success: true,
        signature: result.signature,
        timing: {
          startMs,
          endMs,
          durationMs: endMs - startMs,
        },
        explorerUrl: result.signature.includes("-") 
          ? undefined 
          : txUrl(result.signature),
      };
    } else {
      return {
        success: false,
        error: result.error || "Failed to log consent on-chain",
        timing: result.timing,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unknown error during consent logging",
      timing: {
        startMs,
        endMs: Date.now(),
        durationMs: Date.now() - startMs,
      },
    };
  }
}

/**
 * Get human-readable consent type name
 */
export function getConsentTypeName(type: ConsentType): string {
  switch (type) {
    case ConsentType.ViewResults:
      return "View Results";
    case ConsentType.ContactForEnrollment:
      return "Contact for Enrollment";
    case ConsentType.ShareData:
      return "Share Medical Data";
    case ConsentType.FullParticipation:
      return "Full Participation";
    default:
      return "Unknown";
  }
}

/**
 * Get consent type description
 */
export function getConsentTypeDescription(type: ConsentType): string {
  switch (type) {
    case ConsentType.ViewResults:
      return "Permission to view trial matching results";
    case ConsentType.ContactForEnrollment:
      return "Permission for trial coordinators to contact you";
    case ConsentType.ShareData:
      return "Permission to share anonymized medical data with researchers";
    case ConsentType.FullParticipation:
      return "Full consent for trial participation including data sharing and contact";
    default:
      return "Unknown consent type";
  }
}

/**
 * Format consent for voice assistant response
 */
export function formatConsentConfirmation(
  result: ConsentTransactionResult,
  consentType: ConsentType,
  trialId: string
): string {
  if (result.success) {
    const typeName = getConsentTypeName(consentType);
    const timing = result.timing?.durationMs || 0;
    
    if (timing < 500) {
      return `Done! Your ${typeName.toLowerCase()} consent for trial ${trialId} has been recorded on-chain in ${timing} milliseconds. This was a gasless transaction powered by MagicBlock Ephemeral Rollups.`;
    } else {
      return `Your ${typeName.toLowerCase()} consent for trial ${trialId} has been securely recorded on the Solana blockchain. Transaction completed in ${timing} milliseconds.`;
    }
  } else {
    return `I wasn't able to record your consent on-chain. ${result.error || "Please try again or check your wallet connection."}`;
  }
}
