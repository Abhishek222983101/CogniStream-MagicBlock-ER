import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ragEngine, RetrievedContext } from "@/lib/ragEngine";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
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

    const body: ChatRequest = await req.json();
    const { message, history = [] } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    await ensureRAGInit();

    const context = ragEngine.getContextForQuery(message);
    const retrieved = ragEngine.retrieve(message, 5);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });

    const systemPrompt = `You are TrialMatch AI, a clinical trial matching assistant specializing in Indian clinical trials. 

Your role is to help healthcare professionals, researchers, and patients find relevant clinical trials in India.

Guidelines:
1. Use the provided clinical data context to answer questions accurately
2. Be specific about trial IDs, locations, eligibility criteria
3. When discussing eligibility, consider: age, gender, diagnosis, stage, biomarkers, ECOG status, and geography
4. Provide actionable recommendations with trial IDs and locations
5. If you don't have enough information, say so clearly
6. Be concise but thorough in your explanations

Context from clinical database:
${context}

${history.map((m: ChatMessage) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}

User: ${message}
Assistant:`;

    const result = await model.generateContent(systemPrompt);
    const response = result.response.text();

    const sources = retrieved.map(r => ({
      id: r.chunk.id,
      type: r.chunk.type,
      title: r.chunk.title,
      relevance: r.score
    }));

    return NextResponse.json({
      response,
      sources,
      context: retrieved.map(r => ({
        id: r.chunk.id,
        type: r.chunk.type,
        title: r.chunk.title,
        preview: r.chunk.content.substring(0, 200) + "...",
        relevance: r.score
      }))
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await ensureRAGInit();
    const stats = ragEngine.getStats();
    
    return NextResponse.json({
      status: "ready",
      ...stats,
      model: "gemini-2.0-flash",
      rag: "keyword-based semantic retrieval"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to initialize" },
      { status: 500 }
    );
  }
}
