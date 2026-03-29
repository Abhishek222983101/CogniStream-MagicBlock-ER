"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles,
  FileText,
  Users,
  FlaskConical,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  ExternalLink
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: {
    id: string;
    type: "trial" | "patient";
    title: string;
    relevance: number;
  }[];
  loading?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<"loading" | "ready" | "error">("loading");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    checkApiStatus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkApiStatus = async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setApiStatus("ready");
        if (messages.length === 0) {
          setMessages([{
            id: "welcome",
            role: "assistant",
            content: `Hello! I'm TrialMatch AI, your clinical trial matching assistant. 

I have access to:
- ${data.trials || 30} Indian clinical trials
- ${data.patients || 35} patient records

I can help you with:
• Finding trials for specific diagnoses (e.g., "Find NSCLC trials in Mumbai")
• Checking patient eligibility for trials
• Understanding trial criteria and requirements
• Comparing trial locations and phases
• General questions about clinical trial matching

How can I help you today?`
          }]);
        }
      } else {
        setApiStatus("error");
      }
    } catch {
      setApiStatus("error");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim()
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      loading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => !m.loading)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage.content,
          history
        })
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();

      setMessages(prev => prev.map(m => 
        m.id === loadingMessage.id 
          ? { 
              ...m, 
              content: data.response, 
              loading: false,
              sources: data.sources
            }
          : m
      ));
    } catch (error) {
      setMessages(prev => prev.map(m => 
        m.id === loadingMessage.id 
          ? { 
              ...m, 
              content: "Sorry, I encountered an error. Please check if the GEMINI_API_KEY is configured in your environment variables.",
              loading: false
            }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    "Find NSCLC trials in Mumbai",
    "Which trials accept EGFR positive patients?",
    "Show me Phase 3 oncology trials",
    "Trials for diabetic patients in Karnataka"
  ];

  return (
    <div className="min-h-screen bg-paper font-mono">
      <header className="bg-charcoal text-white px-4 md:px-8 py-3 flex items-center justify-between border-b-4 border-charcoal">
        <Link href="/dashboard" className="flex items-center gap-3 hover:text-surgical">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-heading text-xl font-black uppercase">CogniStream</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${apiStatus === "ready" ? "bg-surgical animate-pulse" : apiStatus === "error" ? "bg-iodine" : "bg-cobalt"}`} />
          <span className="font-mono text-xs">
            {apiStatus === "ready" ? "AI Ready" : apiStatus === "error" ? "API Error" : "Loading..."}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white border-2 border-charcoal shadow-[3px_3px_0px_0px_rgba(15,15,15,1)] overflow-hidden">
          <div className="bg-gradient-to-r from-black to-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surgical rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-charcoal" strokeWidth={3} />
              </div>
              <div>
                <h1 className="font-heading font-black uppercase text-white">TrialMatch AI</h1>
                <p className="font-mono text-[10px] text-surgical">RAG-powered Clinical Trial Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cobalt" />
              <span className="font-mono text-xs text-white/70">Gemini 2.0</span>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-paper/30">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === "user" ? "bg-charcoal" : "bg-surgical"
                }`}>
                  {message.role === "user" ? (
                    <User className="w-4 h-4 text-white" strokeWidth={3} />
                  ) : (
                    <Bot className="w-4 h-4 text-charcoal" strokeWidth={3} />
                  )}
                </div>
                <div className={`flex-1 max-w-[80%] ${message.role === "user" ? "text-right" : ""}`}>
                  <div className={`inline-block p-3 border-2 border-charcoal ${
                    message.role === "user" 
                      ? "bg-charcoal text-white" 
                      : "bg-white"
                  }`}>
                    {message.loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-mono text-sm">Thinking...</span>
                      </div>
                    ) : (
                      <p className="font-mono text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  
                  {message.sources && message.sources.length > 0 && !message.loading && (
                    <div className="mt-2">
                      <button
                        onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                        className="flex items-center gap-1 font-mono text-xs text-charcoal/50 hover:text-charcoal"
                      >
                        <FileText className="w-3 h-3" />
                        {showSources === message.id ? "Hide" : "Show"} sources ({message.sources.length})
                        <ChevronDown className={`w-3 h-3 transition-transform ${showSources === message.id ? "rotate-180" : ""}`} />
                      </button>
                      
                      {showSources === message.id && (
                        <div className="mt-2 space-y-1">
                          {message.sources.map((source, i) => (
                            <div 
                              key={i}
                              className="flex items-center gap-2 text-xs font-mono bg-white border border-charcoal/10 px-2 py-1"
                            >
                              {source.type === "trial" ? (
                                <FlaskConical className="w-3 h-3 text-surgical" />
                              ) : (
                                <Users className="w-3 h-3 text-cobalt" />
                              )}
                              <span className="truncate flex-1">{source.title}</span>
                              <span className="text-charcoal/30">{source.relevance}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="font-mono text-[10px] text-charcoal/40 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(q); }}
                    className="font-mono text-xs bg-paper border border-charcoal/20 px-2 py-1 hover:bg-surgical hover:border-charcoal transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t-4 border-charcoal p-4 bg-white">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about clinical trials, patient eligibility..."
                className="flex-1 bg-paper border-2 border-charcoal px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="bg-charcoal text-white px-6 border-2 border-charcoal hover:bg-surgical hover:text-charcoal disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-heading font-black uppercase text-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="font-mono text-[10px] text-charcoal/30 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
