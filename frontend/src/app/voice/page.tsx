"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  Activity,
  Brain,
  Waves,
  CircleDot,
  MessageSquare,
  FlaskConical,
  Users,
  MapPin,
  Zap,
  Settings,
  Info,
} from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface ConversationItem {
  id: string;
  type: "user" | "assistant";
  text: string;
  timestamp: Date;
  sources?: { id: string; type: string; title: string }[];
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
  onClick 
}: { 
  state: "idle" | "listening" | "thinking" | "speaking";
  onClick: () => void;
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
    listening: "Listening...",
    thinking: "Processing...",
    speaking: "Speaking...",
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        onClick={onClick}
        className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${stateColors[state]} 
                   flex items-center justify-center shadow-2xl border-4 border-white/20
                   hover:scale-105 active:scale-95 transition-transform cursor-pointer`}
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
        {/* Outer ring animations */}
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
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-surgical/50"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          </>
        )}

        {stateIcons[state]}
      </motion.button>
      
      <motion.p 
        className="font-mono text-sm text-charcoal/70 uppercase tracking-widest"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {stateLabels[state]}
      </motion.p>
    </div>
  );
};

// Conversation bubble
const ConversationBubble = ({ item }: { item: ConversationItem }) => {
  const isUser = item.type === "user";
  
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
              : "bg-white border-2 border-charcoal/10 text-charcoal rounded-bl-sm"
          }`}
        >
          <p className="font-mono text-sm leading-relaxed">{item.text}</p>
        </div>
        
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
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize speech recognition
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: speechError,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: "en-IN",
    onResult: (text, isFinal) => {
      if (isFinal) {
        setCurrentTranscript(prev => prev + " " + text);
      }
    },
    onEnd: () => {
      if (currentTranscript.trim()) {
        processVoiceInput(currentTranscript.trim());
      }
    },
  });

  // Check API status on mount
  useEffect(() => {
    fetch("/api/voice")
      .then((res) => res.json())
      .then((data) => {
        setApiReady(data.status === "ready");
      })
      .catch(() => setApiReady(false));
  }, []);

  // Update voice state based on listening status
  useEffect(() => {
    if (isListening) {
      setVoiceState("listening");
    }
  }, [isListening]);

  // Scroll to bottom of conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Handle speech errors
  useEffect(() => {
    if (speechError) {
      setError(speechError);
      setVoiceState("idle");
    }
  }, [speechError]);

  const processVoiceInput = async (text: string) => {
    if (!text.trim()) return;

    // Add user message to conversation
    const userMessage: ConversationItem = {
      id: Date.now().toString(),
      type: "user",
      text: text.trim(),
      timestamp: new Date(),
    };
    setConversation((prev) => [...prev, userMessage]);
    setCurrentTranscript("");
    resetTranscript();
    setVoiceState("thinking");

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          generateAudio: !isMuted,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      // Add assistant response
      const assistantMessage: ConversationItem = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        text: data.response,
        timestamp: new Date(),
        sources: data.sources,
      };
      setConversation((prev) => [...prev, assistantMessage]);

      // Play audio if available and not muted
      if (data.audio && !isMuted) {
        setVoiceState("speaking");
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
          setVoiceState("idle");
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.play().catch(() => setVoiceState("idle"));
      } else if (!isMuted) {
        // Fallback to browser TTS
        setVoiceState("speaking");
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.rate = 0.9;
        utterance.onend = () => setVoiceState("idle");
        utterance.onerror = () => setVoiceState("idle");
        window.speechSynthesis.speak(utterance);
      } else {
        setVoiceState("idle");
      }
    } catch (err) {
      setError("Failed to process your request. Please try again.");
      setVoiceState("idle");
    }
  };

  const handleOrbClick = () => {
    if (voiceState === "idle") {
      setError(null);
      setCurrentTranscript("");
      startListening();
    } else if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "speaking") {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis.cancel();
      setVoiceState("idle");
    }
  };

  const suggestedQueries = [
    "Find lung cancer trials in Mumbai",
    "Are there any diabetes trials for elderly patients?",
    "Which trials accept EGFR positive patients?",
    "Tell me about Phase 3 oncology trials in Bangalore",
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
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg border-2 transition-colors ${
              isMuted 
                ? "border-iodine/30 bg-iodine/10 text-iodine" 
                : "border-charcoal/10 bg-white text-charcoal hover:bg-paper"
            }`}
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
        
        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-4 min-h-[200px]">
          {conversation.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cobalt/10 to-surgical/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-cobalt" strokeWidth={1.5} />
              </div>
              <h2 className="font-heading text-xl font-bold text-charcoal mb-2">
                Voice-Powered Trial Matching
              </h2>
              <p className="font-mono text-sm text-charcoal/60 max-w-md mx-auto mb-8">
                Speak naturally about your medical condition or trial requirements. 
                I'll find the best matching clinical trials in India for you.
              </p>
              
              {/* Suggested queries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg mx-auto">
                {suggestedQueries.map((query, i) => (
                  <button
                    key={i}
                    onClick={() => processVoiceInput(query)}
                    className="text-left px-4 py-3 bg-white border-2 border-charcoal/10 rounded-lg 
                             hover:border-cobalt/30 hover:bg-cobalt/5 transition-colors group"
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
        <div className="mb-6">
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
              className="bg-surgical/10 border-2 border-surgical/20 rounded-2xl p-4 mb-4"
            >
              <VoiceWaveform isActive={true} intensity={0.7} />
              <p className="font-mono text-xs text-center text-surgical mt-2 uppercase tracking-widest">
                AI is speaking...
              </p>
            </motion.div>
          )}
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-iodine/10 border-2 border-iodine/30 rounded-xl text-center"
            >
              <p className="font-mono text-sm text-iodine">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 font-mono text-xs text-iodine/70 underline"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Browser Support Warning */}
        {!isSupported && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl text-center">
            <p className="font-mono text-sm text-amber-800">
              Speech recognition is not supported in your browser. 
              Please use Chrome or Edge for the best experience.
            </p>
          </div>
        )}

        {/* Voice Orb */}
        <div className="flex justify-center">
          <VoiceOrb state={voiceState} onClick={handleOrbClick} />
        </div>

        {/* Feature Pills */}
        <div className="flex justify-center gap-3 mt-8 flex-wrap">
          {[
            { icon: <Mic className="w-3 h-3" />, label: "Voice Input" },
            { icon: <Brain className="w-3 h-3" />, label: "Gemini AI" },
            { icon: <Volume2 className="w-3 h-3" />, label: "ElevenLabs TTS" },
            { icon: <FlaskConical className="w-3 h-3" />, label: "30+ Indian Trials" },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-charcoal/10 rounded-full"
            >
              <span className="text-charcoal/50">{feature.icon}</span>
              <span className="font-mono text-[10px] text-charcoal/70 uppercase tracking-wider">
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
          Designed for accessibility - perfect for elderly or visually impaired users
        </p>
      </footer>
    </div>
  );
}
