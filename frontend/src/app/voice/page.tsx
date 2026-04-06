"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  Brain,
  Waves,
  MessageSquare,
  FlaskConical,
  Users,
  Info,
  Send,
  Keyboard,
  X,
  Zap,
  Shield,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

// Wallet imports
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

// ER Integration
import { createERClient, ERClient } from "@/lib/er-client";
import { 
  logVoiceConsent, 
  ConsentType, 
  getConsentTypeName,
  getConsentTypeDescription,
  ConsentTransactionResult,
} from "@/lib/voice-consent";
import { txUrl } from "@/lib/explorer";

interface ConversationItem {
  id: string;
  type: "user" | "assistant" | "consent";
  text: string;
  timestamp: Date;
  sources?: { id: string; type: string; title: string }[];
  consentData?: {
    type: ConsentType;
    trialId: string;
    status: "pending" | "processing" | "success" | "error";
    signature?: string;
    timing?: number;
    error?: string;
  };
}

interface ConsentIntent {
  detected: boolean;
  consentType?: number;
  consentTypeName?: string;
  trialId?: string;
  confidence: number;
  matchedPattern?: string;
  requiresWalletAction: boolean;
}

// Animated waveform component
const VoiceWaveform = ({ isActive, intensity = 1 }: { isActive: boolean; intensity?: number }) => {
  const bars = 24;
  
  return (
    <div className="flex items-center justify-center gap-[2px] h-16">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-cobalt to-surgical rounded-full"
          animate={isActive ? {
            height: [8, 40 * intensity * (0.5 + Math.random() * 0.5), 8],
          } : { height: 8 }}
          transition={{
            duration: 0.5 + Math.random() * 0.3,
            repeat: isActive ? Infinity : 0,
            repeatType: "reverse",
            delay: i * 0.02,
          }}
        />
      ))}
    </div>
  );
};

// Pulsing orb component
const VoiceOrb = ({ 
  state, 
  onClick,
  disabled
}: { 
  state: "idle" | "listening" | "thinking" | "speaking";
  onClick: () => void;
  disabled?: boolean;
}) => {
  const stateColors = {
    idle: "from-charcoal/80 to-charcoal",
    listening: "from-iodine to-red-500",
    thinking: "from-cobalt to-blue-600",
    speaking: "from-surgical to-emerald-500",
  };

  const stateIcons = {
    idle: <Mic className="w-8 h-8 text-white" strokeWidth={2} />,
    listening: <Mic className="w-8 h-8 text-white animate-pulse" strokeWidth={2} />,
    thinking: <Brain className="w-8 h-8 text-white animate-spin" strokeWidth={2} />,
    speaking: <Volume2 className="w-8 h-8 text-white" strokeWidth={2} />,
  };

  const stateLabels = {
    idle: "Tap to speak",
    listening: "Listening... (tap to stop)",
    thinking: "Processing...",
    speaking: "Speaking... (tap to stop)",
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        onClick={onClick}
        disabled={disabled || state === "thinking"}
        className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${stateColors[state]} 
                   flex items-center justify-center shadow-2xl border-4 border-white/20
                   hover:scale-105 active:scale-95 transition-transform cursor-pointer
                   disabled:opacity-50 disabled:cursor-not-allowed`}
        whileTap={{ scale: 0.95 }}
        animate={state !== "idle" ? {
          boxShadow: [
            "0 0 0 0 rgba(255,255,255,0)",
            "0 0 0 20px rgba(255,255,255,0.1)",
            "0 0 0 40px rgba(255,255,255,0)",
          ],
        } : {}}
        transition={{
          duration: 1.5,
          repeat: state !== "idle" ? Infinity : 0,
        }}
      >
        {state === "listening" && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-iodine/50"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-iodine/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
          </>
        )}
        
        {state === "speaking" && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-surgical/50"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}

        {stateIcons[state]}
      </motion.button>
      
      <motion.p 
        className="font-mono text-xs text-charcoal/70 uppercase tracking-widest text-center"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {stateLabels[state]}
      </motion.p>
    </div>
  );
};

// Consent Transaction Card
const ConsentTransactionCard = ({ 
  consentData 
}: { 
  consentData: ConversationItem['consentData'] 
}) => {
  if (!consentData) return null;

  const statusColors = {
    pending: "border-cobalt/50 bg-cobalt/10",
    processing: "border-[#9945FF]/50 bg-[#9945FF]/10",
    success: "border-[#14F195]/50 bg-[#14F195]/10",
    error: "border-iodine/50 bg-iodine/10",
  };

  const statusIcons = {
    pending: <Shield className="w-5 h-5 text-cobalt" />,
    processing: <Loader2 className="w-5 h-5 text-[#9945FF] animate-spin" />,
    success: <CheckCircle className="w-5 h-5 text-[#14F195]" />,
    error: <AlertTriangle className="w-5 h-5 text-iodine" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mt-3 p-4 rounded-xl border-2 ${statusColors[consentData.status]}`}
    >
      <div className="flex items-center gap-3 mb-3">
        {statusIcons[consentData.status]}
        <div>
          <p className="font-heading font-black text-sm uppercase">
            {getConsentTypeName(consentData.type)}
          </p>
          <p className="font-mono text-[10px] text-charcoal/60">
            {consentData.trialId}
          </p>
        </div>
        {consentData.status === "success" && consentData.timing && (
          <div className="ml-auto flex items-center gap-1 px-2 py-1 bg-[#14F195]/20 rounded">
            <Zap className="w-3 h-3 text-[#14F195]" />
            <span className="font-mono text-[10px] text-[#14F195] font-bold">
              {consentData.timing}ms
            </span>
          </div>
        )}
      </div>

      {consentData.status === "success" && consentData.signature && (
        // Only show Solscan link for real transaction signatures (not special status strings)
        consentData.signature.includes("-") ? (
          <div className="flex items-center gap-2 text-[#14F195] font-mono text-xs">
            <CheckCircle className="w-3 h-3" />
            <span>Already recorded on-chain</span>
          </div>
        ) : (
          <a
            href={txUrl(consentData.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#14F195] hover:underline font-mono text-xs"
          >
            View on Solscan <ExternalLink className="w-3 h-3" />
          </a>
        )
      )}

      {consentData.status === "error" && consentData.error && (
        <p className="font-mono text-xs text-iodine">{consentData.error}</p>
      )}

      {consentData.status === "processing" && (
        <p className="font-mono text-xs text-[#9945FF]">
          Recording consent on Solana via MagicBlock ER...
        </p>
      )}
    </motion.div>
  );
};

// Conversation bubble
const ConversationBubble = ({ item }: { item: ConversationItem }) => {
  const isUser = item.type === "user";
  const isConsent = item.type === "consent";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[85%] ${isUser ? "order-1" : "order-2"}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-charcoal text-white rounded-br-sm"
              : isConsent
              ? "bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 border-2 border-[#9945FF]/30 text-charcoal rounded-bl-sm"
              : "bg-white border-2 border-charcoal/10 text-charcoal rounded-bl-sm"
          }`}
        >
          {isConsent && (
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#9945FF]" />
              <span className="font-mono text-[10px] uppercase text-[#9945FF] font-bold">
                On-Chain Consent
              </span>
            </div>
          )}
          <p className="font-mono text-sm leading-relaxed">{item.text}</p>
        </div>

        {item.consentData && (
          <ConsentTransactionCard consentData={item.consentData} />
        )}
        
        {item.sources && item.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.sources.slice(0, 2).map((source, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-paper border border-charcoal/10 rounded-full text-[10px] font-mono text-charcoal/60"
              >
                {source.type === "trial" ? (
                  <FlaskConical className="w-3 h-3" />
                ) : (
                  <Users className="w-3 h-3" />
                )}
                {source.title.substring(0, 30)}...
              </span>
            ))}
          </div>
        )}
        
        <p className={`mt-1 font-mono text-[10px] text-charcoal/30 ${isUser ? "text-right" : "text-left"}`}>
          {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
};

export default function VoiceAssistantPage() {
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);
  
  // ER Client State
  const [erClient, setERClient] = useState<ERClient | null>(null);
  const [currentTrialId, setCurrentTrialId] = useState<string | null>(null);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  
  // Wallet
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize ER Client when wallet connects
  useEffect(() => {
    if (publicKey && connected && signTransaction && signAllTransactions) {
      const client = createERClient(connection, {
        publicKey,
        signTransaction: signTransaction as any,
        signAllTransactions: signAllTransactions as any,
      });
      setERClient(client);
      console.log("[Voice] ER Client initialized");
    } else {
      setERClient(null);
    }
  }, [publicKey, connected, signTransaction, signAllTransactions, connection]);

  // Load patient/trial context from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem('cognistream_pipeline_results');
        console.log("[Voice] Checking sessionStorage for pipeline results...");
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("[Voice] Found pipeline results:", {
            patient: parsed.patient,
            hasMatches: !!parsed.matches?.matches?.length,
            topTrialId: parsed.matches?.matches?.[0]?.trial_id
          });
          
          if (parsed.patient) {
            setCurrentPatientId(parsed.patient);
            console.log("[Voice] Loaded patient context:", parsed.patient);
          }
          
          // Load trial ID from matches - try multiple paths
          const trialId = parsed.matches?.matches?.[0]?.trial_id || 
                          parsed.topTrialId ||
                          parsed.currentTrialId;
          if (trialId) {
            setCurrentTrialId(trialId);
            console.log("[Voice] Loaded trial context:", trialId);
          } else {
            console.warn("[Voice] No trial ID found in session, using fallback");
            // Set a reasonable default based on pipeline results
            setCurrentTrialId("NCT05894239"); // Default to common trial ID
          }
        } else {
          console.warn("[Voice] No pipeline results in sessionStorage - run pipeline first!");
        }
      } catch (e) {
        console.warn("[Voice] Failed to load session context:", e);
      }
    }
  }, []);

  // Check API status on mount
  useEffect(() => {
    fetch("/api/voice")
      .then((res) => res.json())
      .then((data) => {
        setApiReady(data.status === "ready");
      })
      .catch(() => setApiReady(false));

    // Check if speech recognition is supported
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsVoiceSupported(!!SpeechRecognition);
    }
  }, []);

  // Scroll to bottom of conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Handle consent transaction
  const handleConsentTransaction = useCallback(async (
    consentIntent: ConsentIntent,
    conversationId: string
  ) => {
    if (!erClient || !publicKey || !connected) {
      // Update conversation with error
      setConversation(prev => prev.map(item => {
        if (item.id === conversationId && item.consentData) {
          return {
            ...item,
            consentData: {
              ...item.consentData,
              status: "error" as const,
              error: "Wallet not connected. Please connect your Phantom wallet to log consent on-chain.",
            }
          };
        }
        return item;
      }));
      return;
    }

    const patientId = currentPatientId as string;
    if (!currentPatientId) {
      setConversation(prev => prev.map(item => {
        if (item.id === conversationId && item.consentData) {
          return {
            ...item,
            consentData: {
              ...item.consentData,
              status: "error" as const,
              error: "Patient not initialized. Please run the pipeline first from the Dashboard.",
            }
          };
        }
        return item;
      }));
      return;
    }
    
    // Use a valid trial ID - fallback chain with better defaults
    const trialId = consentIntent.trialId || currentTrialId || "NCT05894239";
    console.log("[Voice] Using trial ID for consent:", trialId, {
      fromIntent: consentIntent.trialId,
      fromState: currentTrialId,
      usingFallback: !consentIntent.trialId && !currentTrialId
    });
    const consentType = consentIntent.consentType ?? ConsentType.ContactForEnrollment;

    // Update status to processing
    setConversation(prev => prev.map(item => {
      if (item.id === conversationId && item.consentData) {
        return {
          ...item,
          consentData: {
            ...item.consentData,
            status: "processing" as const,
          }
        };
      }
      return item;
    }));

    try {
      const result = await logVoiceConsent(
        erClient,
        patientId,
        trialId,
        consentType,
        true // isDelegated - use gasless ER
      );

      // Update conversation with result
      setConversation(prev => prev.map(item => {
        if (item.id === conversationId && item.consentData) {
          return {
            ...item,
            consentData: {
              ...item.consentData,
              status: result.success ? "success" as const : "error" as const,
              signature: result.signature,
              timing: result.timing?.durationMs,
              error: result.error,
            }
          };
        }
        return item;
      }));

      if (result.success) {
        console.log("[Voice] Consent logged on-chain:", result.signature);
      }
    } catch (err: any) {
      setConversation(prev => prev.map(item => {
        if (item.id === conversationId && item.consentData) {
          return {
            ...item,
            consentData: {
              ...item.consentData,
              status: "error" as const,
              error: err.message || "Failed to log consent",
            }
          };
        }
        return item;
      }));
    }
  }, [erClient, publicKey, connected, currentPatientId, currentTrialId]);

  // Initialize speech recognition
  const startListening = () => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in your browser. Please use text input instead.");
      setInputMode("text");
      return;
    }

    try {
      // Clean up any existing recognition
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Single utterance mode - more stable
      recognition.interimResults = true;
      recognition.lang = "en-IN";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState("listening");
        setError(null);
        setCurrentTranscript("");
        setInterimTranscript("");
      };

      recognition.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (finalText) {
          setCurrentTranscript(prev => prev + " " + finalText);
        }
        setInterimTranscript(interimText);
      };

      recognition.onend = () => {
        // Get the current transcript value at the time of onend
        setCurrentTranscript(prev => {
          const finalText = prev.trim();
          if (finalText) {
            // Process the input after a brief delay to ensure state is updated
            setTimeout(() => {
              processInput(finalText);
            }, 100);
          } else {
            setVoiceState("idle");
          }
          return "";
        });
        setInterimTranscript("");
      };

      recognition.onerror = (event: any) => {
        console.log("Speech recognition error:", event.error);
        
        // Don't show error for aborted or no-speech - these are normal
        if (event.error === "aborted" || event.error === "no-speech") {
          setVoiceState("idle");
          return;
        }

        // For network errors, try to process any captured text first
        if (event.error === "network") {
          setCurrentTranscript(prev => {
            const text = prev.trim() || interimTranscript.trim();
            if (text) {
              setTimeout(() => processInput(text), 100);
              return "";
            }
            setError("Voice recognition had a network issue. Try using text input instead.");
            setInputMode("text");
            return "";
          });
          setVoiceState("idle");
          return;
        }

        // Other errors
        const errorMessages: Record<string, string> = {
          "not-allowed": "Microphone access denied. Please allow microphone access or use text input.",
          "audio-capture": "No microphone found. Please use text input instead.",
          "service-not-allowed": "Speech service not available. Please use text input.",
        };
        
        setError(errorMessages[event.error] || `Speech error: ${event.error}. Try text input.`);
        setVoiceState("idle");
        setInputMode("text");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setError("Failed to start voice input. Please use text input instead.");
      setInputMode("text");
      setVoiceState("idle");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
  };

  const processInput = async (text: string) => {
    if (!text.trim()) {
      setVoiceState("idle");
      return;
    }

    // Add user message to conversation
    const userMessage: ConversationItem = {
      id: Date.now().toString(),
      type: "user",
      text: text.trim(),
      timestamp: new Date(),
    };
    setConversation((prev) => [...prev, userMessage]);
    setVoiceState("thinking");
    setTextInput("");

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          generateAudio: !isMuted,
          currentTrialId,
          patientId: currentPatientId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();

      // Check if consent intent was detected
      const consentIntent = data.consentIntent as ConsentIntent | undefined;
      
      // Add assistant response
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: ConversationItem = {
        id: assistantMessageId,
        type: consentIntent?.detected ? "consent" : "assistant",
        text: data.response,
        timestamp: new Date(),
        sources: data.sources,
        consentData: consentIntent?.detected ? {
          type: consentIntent.consentType ?? ConsentType.ContactForEnrollment,
          trialId: consentIntent.trialId || currentTrialId || "UNKNOWN",
          status: "pending",
        } : undefined,
      };
      setConversation((prev) => [...prev, assistantMessage]);

      // If consent detected, trigger on-chain transaction
      if (consentIntent?.detected && consentIntent.requiresWalletAction) {
        // Small delay to show pending state
        setTimeout(() => {
          handleConsentTransaction(consentIntent, assistantMessageId);
        }, 500);
      }

      // Update current trial ID if mentioned in response
      if (consentIntent?.trialId) {
        setCurrentTrialId(consentIntent.trialId);
      }

      // Play audio if available and not muted
      if (data.audio && !isMuted) {
        setVoiceState("speaking");
        try {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0))],
            { type: "audio/mpeg" }
          );
          const audioUrl = URL.createObjectURL(audioBlob);
          
          if (audioRef.current) {
            audioRef.current.pause();
          }
          
          audioRef.current = new Audio(audioUrl);
          audioRef.current.onended = () => {
            setVoiceState("idle");
            URL.revokeObjectURL(audioUrl);
          };
          audioRef.current.onerror = () => {
            // Fallback to browser TTS
            speakWithBrowserTTS(data.response);
            URL.revokeObjectURL(audioUrl);
          };
          await audioRef.current.play();
        } catch (audioErr) {
          speakWithBrowserTTS(data.response);
        }
      } else if (!isMuted) {
        speakWithBrowserTTS(data.response);
      } else {
        setVoiceState("idle");
      }
    } catch (err: any) {
      console.error("Process input error:", err);
      setError(err.message || "Failed to process your request. Please try again.");
      setVoiceState("idle");
    }
  };

  const speakWithBrowserTTS = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setVoiceState("idle");
      return;
    }

    setVoiceState("speaking");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.onend = () => setVoiceState("idle");
    utterance.onerror = () => setVoiceState("idle");
    window.speechSynthesis.speak(utterance);
  };

  const handleOrbClick = () => {
    if (voiceState === "idle") {
      setError(null);
      startListening();
    } else if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "speaking") {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setVoiceState("idle");
    }
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (textInput.trim() && voiceState === "idle") {
      processInput(textInput.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const suggestedQueries = [
    "Find lung cancer trials in Mumbai",
    "Are there any diabetes trials for elderly patients?",
    "I want to participate in a KRAS G12C trial",
    "Contact me about the top matching trial",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-paper via-white to-paper/50 font-mono flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b-2 border-charcoal/10 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-50">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5 text-charcoal" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cobalt to-surgical rounded-lg flex items-center justify-center">
              <Waves className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-heading text-lg font-black uppercase text-charcoal">Voice AI</h1>
              <p className="font-mono text-[9px] text-charcoal/50 uppercase tracking-widest">TrialMatch Assistant</p>
            </div>
          </div>
        </Link>
        
        <div className="flex items-center gap-3">
          {/* Wallet Connect */}
          <div className="wallet-adapter-button-wrapper">
            <WalletMultiButton className="!bg-gradient-to-r !from-[#9945FF] !to-[#14F195] !border-2 !border-white/20 !rounded-lg !font-mono !text-[10px] !font-bold !uppercase !h-8 !py-1 !px-3 hover:!opacity-90 !transition-opacity" />
          </div>
          
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg border-2 transition-colors ${
              isMuted 
                ? "border-iodine/30 bg-iodine/10 text-iodine" 
                : "border-charcoal/10 bg-white text-charcoal hover:bg-paper"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${
            apiReady ? "border-surgical/30 bg-surgical/10" : "border-charcoal/20 bg-paper"
          }`}>
            <div className={`w-2 h-2 rounded-full ${apiReady ? "bg-surgical animate-pulse" : "bg-charcoal/30"}`} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-charcoal/70">
              {apiReady ? "Ready" : "Loading"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6">
        
        {/* ER Status Banner */}
        {connected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-gradient-to-r from-[#9945FF]/10 to-[#14F195]/10 border-2 border-[#9945FF]/30 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#9945FF] to-[#14F195] rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-heading font-black text-xs uppercase text-charcoal">
                  MagicBlock ER Active
                </p>
                <p className="font-mono text-[10px] text-charcoal/60">
                  Voice consent will be recorded gasless on Solana
                </p>
              </div>
              {currentPatientId && (
                <div className="ml-auto px-2 py-1 bg-white/50 rounded border border-charcoal/10">
                  <span className="font-mono text-[10px] text-charcoal/60">
                    Patient: <span className="text-charcoal font-bold">{currentPatientId}</span>
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[150px]">
          {conversation.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cobalt/10 to-surgical/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-cobalt" strokeWidth={1.5} />
              </div>
              <h2 className="font-heading text-lg font-bold text-charcoal mb-2">
                Voice-Powered Trial Matching
              </h2>
              <p className="font-mono text-sm text-charcoal/60 max-w-md mx-auto mb-6">
                Speak or type your query to find clinical trials. Say "I want to participate" to log consent on-chain.
              </p>
              
              {/* Suggested queries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg mx-auto">
                {suggestedQueries.map((query, i) => (
                  <button
                    key={i}
                    onClick={() => processInput(query)}
                    disabled={voiceState !== "idle"}
                    className="text-left px-4 py-3 bg-white border-2 border-charcoal/10 rounded-lg 
                             hover:border-cobalt/30 hover:bg-cobalt/5 transition-colors group
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-charcoal/30 group-hover:text-cobalt mt-0.5" />
                      <span className="font-mono text-xs text-charcoal/70 group-hover:text-charcoal">
                        "{query}"
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {conversation.map((item) => (
                <ConversationBubble key={item.id} item={item} />
              ))}
            </AnimatePresence>
          )}
          <div ref={conversationEndRef} />
        </div>

        {/* Voice Waveform / Transcript Display */}
        <AnimatePresence>
          {(voiceState === "listening" || interimTranscript || currentTranscript) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white border-2 border-charcoal/10 rounded-2xl p-4 mb-4"
            >
              <VoiceWaveform isActive={voiceState === "listening"} />
              {(interimTranscript || currentTranscript) && (
                <p className="font-mono text-sm text-center text-charcoal/70 mt-3">
                  {currentTranscript} <span className="text-charcoal/40">{interimTranscript}</span>
                </p>
              )}
            </motion.div>
          )}
          
          {voiceState === "speaking" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-surgical/10 border-2 border-surgical/20 rounded-2xl p-4 mb-4"
            >
              <VoiceWaveform isActive={true} intensity={0.7} />
              <p className="font-mono text-xs text-center text-surgical mt-2 uppercase tracking-widest">
                AI is speaking... (tap orb to stop)
              </p>
            </motion.div>
          )}

          {voiceState === "thinking" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-cobalt/10 border-2 border-cobalt/20 rounded-2xl p-4 mb-4 flex items-center justify-center gap-3"
            >
              <Loader2 className="w-5 h-5 animate-spin text-cobalt" />
              <p className="font-mono text-xs text-cobalt uppercase tracking-widest">
                Processing your request...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-iodine/10 border-2 border-iodine/30 rounded-xl flex items-center justify-between"
            >
              <p className="font-mono text-xs text-iodine">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-2 p-1 hover:bg-iodine/20 rounded"
              >
                <X className="w-4 h-4 text-iodine" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Mode Toggle */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex bg-white border-2 border-charcoal/10 rounded-full p-1">
            <button
              onClick={() => setInputMode("voice")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold uppercase transition-colors ${
                inputMode === "voice" 
                  ? "bg-charcoal text-white" 
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              <Mic className="w-4 h-4" />
              Voice
            </button>
            <button
              onClick={() => {
                setInputMode("text");
                setTimeout(() => textInputRef.current?.focus(), 100);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold uppercase transition-colors ${
                inputMode === "text" 
                  ? "bg-charcoal text-white" 
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Text
            </button>
          </div>
        </div>

        {/* Voice Input Mode */}
        {inputMode === "voice" && (
          <div className="flex flex-col items-center">
            {!isVoiceSupported && (
              <div className="mb-4 p-3 bg-amber-50 border-2 border-amber-200 rounded-xl text-center">
                <p className="font-mono text-xs text-amber-800">
                  Speech recognition is not supported. Switch to text input.
                </p>
              </div>
            )}
            <VoiceOrb 
              state={voiceState} 
              onClick={handleOrbClick} 
              disabled={!isVoiceSupported}
            />
          </div>
        )}

        {/* Text Input Mode */}
        {inputMode === "text" && (
          <form onSubmit={handleTextSubmit} className="w-full">
            <div className="flex gap-2">
              <textarea
                ref={textInputRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question about clinical trials..."
                className="flex-1 bg-white border-2 border-charcoal/20 rounded-xl px-4 py-3 font-mono text-sm 
                         focus:outline-none focus:border-cobalt resize-none min-h-[50px]"
                rows={2}
                disabled={voiceState !== "idle"}
              />
              <button
                type="submit"
                disabled={!textInput.trim() || voiceState !== "idle"}
                className="bg-charcoal text-white px-6 rounded-xl border-2 border-charcoal 
                         hover:bg-cobalt hover:border-cobalt disabled:opacity-50 disabled:cursor-not-allowed 
                         flex items-center justify-center transition-colors"
              >
                {voiceState === "thinking" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="font-mono text-[10px] text-charcoal/40 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        )}

        {/* Feature Pills */}
        <div className="flex justify-center gap-2 mt-6 flex-wrap">
          {[
            { icon: <Mic className="w-3 h-3" />, label: "Voice Input" },
            { icon: <Keyboard className="w-3 h-3" />, label: "Text Input" },
            { icon: <Brain className="w-3 h-3" />, label: "AI Powered" },
            { icon: <Zap className="w-3 h-3" />, label: "Gasless Consent" },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 bg-white border border-charcoal/10 rounded-full"
            >
              <span className="text-charcoal/50">{feature.icon}</span>
              <span className="font-mono text-[9px] text-charcoal/70 uppercase tracking-wider">
                {feature.label}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* Accessibility Note */}
      <footer className="bg-white/50 border-t border-charcoal/10 px-4 py-3 text-center">
        <p className="font-mono text-[10px] text-charcoal/40 flex items-center justify-center gap-2">
          <Info className="w-3 h-3" />
          Say "I want to participate" or "Contact me" to log consent on Solana
        </p>
      </footer>
    </div>
  );
}
