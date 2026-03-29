import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ragEngine } from "@/lib/ragEngine";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

interface VoiceRequest {
  message: string;
  generateAudio?: boolean;
  voiceId?: string;
}

let ragInitialized = false;

async function ensureRAGInit() {
  if (!ragInitialized) {
    await ragEngine.initialize();
    ragInitialized = true;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body: VoiceRequest = await req.json();
    const { message, generateAudio = false, voiceId = "21m00Tcm4TlvDq8ikWAM" } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    await ensureRAGInit();

    // Get context from RAG engine
    const context = ragEngine.getContextForQuery(message);
    const retrieved = ragEngine.retrieve(message, 3);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500, // Shorter for voice
      }
    });

    // Special prompt for voice assistant - shorter, more conversational
    const systemPrompt = `You are TrialMatch AI, a friendly voice assistant helping people find clinical trials in India.

IMPORTANT: Keep your responses SHORT and CONVERSATIONAL - suitable for voice output (2-4 sentences max).
Speak naturally as if having a conversation. Avoid bullet points and long lists.
Focus on the most important information first.

If you find matching trials, mention 1-2 top ones with their city locations.
If asked about eligibility, give a quick yes/no assessment with brief reason.

Clinical Data Context:
${context}

User said: "${message}"

Respond conversationally and concisely:`;

    const result = await model.generateContent(systemPrompt);
    const response = result.response.text();

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
    });

  } catch (error) {
    console.error("Voice API error:", error);
    return NextResponse.json(
      { error: "Failed to process voice request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    elevenlabs: !!ELEVENLABS_API_KEY,
    gemini: !!GEMINI_API_KEY,
    features: ["speech-to-text", "text-to-speech", "clinical-rag"],
  });
}
