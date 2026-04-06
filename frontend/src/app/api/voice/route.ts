import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ragEngine } from "@/lib/ragEngine";
import { 
  detectConsentIntent, 
  ConsentType, 
  getConsentTypeName,
  formatConsentConfirmation 
} from "@/lib/voice-consent";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

interface VoiceRequest {
  message: string;
  generateAudio?: boolean;
  voiceId?: string;
  currentTrialId?: string; // Current trial being discussed
  patientId?: string; // Patient ID for consent logging
}

interface ConsentIntentResponse {
  detected: boolean;
  consentType?: number;
  consentTypeName?: string;
  trialId?: string;
  confidence: number;
  matchedPattern?: string;
  requiresWalletAction: boolean;
}

let ragInitialized = false;

async function ensureRAGInit() {
  if (!ragInitialized) {
    await ragEngine.initialize();
    ragInitialized = true;
  }
}

// Call Groq API as fallback when Gemini fails
async function callGroq(prompt: string): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

// Call Gemini API
async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
    }
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY && !GROQ_API_KEY) {
      console.error("Voice API: No AI API key configured (need GEMINI_API_KEY or GROQ_API_KEY)");
      return NextResponse.json(
        { error: "No AI API key configured" },
        { status: 500 }
      );
    }

    const body: VoiceRequest = await req.json();
    const { 
      message, 
      generateAudio = false, 
      voiceId = "21m00Tcm4TlvDq8ikWAM",
      currentTrialId,
      patientId,
    } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    console.log("Voice API: Processing message:", message);

    // ─── CONSENT INTENT DETECTION ────────────────────────────────────────────
    // Check if the user is expressing consent intent
    const consentIntent = detectConsentIntent(message, currentTrialId);
    
    let consentIntentResponse: ConsentIntentResponse | null = null;
    
    if (consentIntent.detected && consentIntent.consentType !== undefined) {
      console.log("Voice API: Consent intent detected!", {
        type: getConsentTypeName(consentIntent.consentType),
        trialId: consentIntent.trialId,
        confidence: consentIntent.confidence,
      });
      
      consentIntentResponse = {
        detected: true,
        consentType: consentIntent.consentType,
        consentTypeName: getConsentTypeName(consentIntent.consentType),
        trialId: consentIntent.trialId,
        confidence: consentIntent.confidence,
        matchedPattern: consentIntent.matchedPattern,
        requiresWalletAction: true,
      };
    }

    await ensureRAGInit();

    // Get context from RAG engine
    const context = ragEngine.getContextForQuery(message);
    const retrieved = ragEngine.retrieve(message, 3);

    console.log("Voice API: RAG retrieved", retrieved.length, "chunks");

    // Special prompt for voice assistant - includes consent awareness
    let systemPrompt: string;
    
    if (consentIntentResponse?.detected) {
      // User is giving consent - respond appropriately
      systemPrompt = `You are TrialMatch AI, a friendly voice assistant helping people find clinical trials in India.

The user just expressed consent intent: "${consentIntent.matchedPattern}"
Consent Type: ${consentIntentResponse.consentTypeName}
${consentIntent.trialId ? `Trial ID: ${consentIntent.trialId}` : 'No specific trial mentioned'}

IMPORTANT: Acknowledge their consent request warmly and let them know their consent will be recorded on-chain.
Keep your response SHORT (1-2 sentences). Be encouraging but professional.
Mention that this is being recorded on the Solana blockchain using MagicBlock Ephemeral Rollups for instant, gasless verification.

User said: "${message}"

Respond:`;
    } else {
      // Normal conversation
      systemPrompt = `You are TrialMatch AI, a friendly voice assistant helping people find clinical trials in India.

IMPORTANT: Keep your responses SHORT and CONVERSATIONAL - suitable for voice output (2-4 sentences max).
Speak naturally as if having a conversation. Avoid bullet points and long lists.
Focus on the most important information first.

If you find matching trials, mention 1-2 top ones with their city locations.
If asked about eligibility, give a quick yes/no assessment with brief reason.

If the user seems interested in a trial, you can guide them to say phrases like:
- "I want to participate" or "Contact me about this trial" to log consent
- "Show me the results" to view detailed matching

Clinical Data Context:
${context}

User said: "${message}"

Respond conversationally and concisely:`;
    }

    // Try Gemini first, fallback to Groq
    let response: string;
    let usedModel: string;
    
    try {
      console.log("Voice API: Trying Gemini...");
      response = await callGemini(systemPrompt);
      usedModel = "gemini-2.0-flash";
      console.log("Voice API: Gemini success");
    } catch (geminiError: any) {
      console.log("Voice API: Gemini failed, trying Groq...", geminiError?.message);
      response = await callGroq(systemPrompt);
      usedModel = "llama-3.1-8b-instant";
      console.log("Voice API: Groq success");
    }

    console.log("Voice API: Response received, length:", response.length);

    // Generate audio if requested and ElevenLabs key is available
    let audioBase64: string | null = null;
    if (generateAudio && ELEVENLABS_API_KEY) {
      try {
        const audioResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: response,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (audioResponse.ok) {
          const audioBuffer = await audioResponse.arrayBuffer();
          audioBase64 = Buffer.from(audioBuffer).toString("base64");
        }
      } catch (audioError) {
        console.error("ElevenLabs TTS error:", audioError);
        // Continue without audio
      }
    }

    const sources = retrieved.map(r => ({
      id: r.chunk.id,
      type: r.chunk.type,
      title: r.chunk.title,
      relevance: r.score
    }));

    return NextResponse.json({
      response,
      audio: audioBase64,
      sources,
      hasAudio: !!audioBase64,
      usedModel,
      // Consent intent data for frontend to handle wallet interaction
      consentIntent: consentIntentResponse,
    });

  } catch (error: any) {
    console.error("Voice API error:", error?.message || error);
    console.error("Voice API error stack:", error?.stack);
    return NextResponse.json(
      { error: `Failed to process voice request: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    elevenlabs: !!ELEVENLABS_API_KEY,
    gemini: !!GEMINI_API_KEY,
    groq: !!GROQ_API_KEY,
    features: [
      "speech-to-text", 
      "text-to-speech", 
      "clinical-rag",
      "consent-detection",
      "magicblock-er-integration",
    ],
  });
}
