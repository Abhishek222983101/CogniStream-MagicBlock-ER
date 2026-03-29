// Web Speech API Hook for Voice Input
// Provides speech-to-text capabilities

import { useState, useEffect, useCallback, useRef } from "react";

interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  error: string | null;
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): SpeechRecognitionHook {
  const {
    continuous = false,
    interimResults = true,
    lang = "en-IN", // Default to Indian English
    onResult,
    onError,
    onStart,
    onEnd,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.lang = lang;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
          onResult?.(finalTranscript, true);
        }
        
        setInterimTranscript(interimText);
        if (interimText) {
          onResult?.(interimText, false);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMessage = getErrorMessage(event.error);
        setError(errorMessage);
        setIsListening(false);
        onError?.(errorMessage);
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
        onStart?.();
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
        onEnd?.();
      };
    } else {
      setIsSupported(false);
      setError("Speech recognition is not supported in this browser");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, interimResults, lang]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError("Speech recognition not initialized");
      return;
    }

    setError(null);
    setTranscript("");
    setInterimTranscript("");

    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started, restart
      recognitionRef.current.stop();
      setTimeout(() => {
        recognitionRef.current?.start();
      }, 100);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  };
}

function getErrorMessage(error: string): string {
  switch (error) {
    case "no-speech":
      return "No speech was detected. Please try again.";
    case "audio-capture":
      return "No microphone was found. Please check your device.";
    case "not-allowed":
      return "Microphone permission was denied. Please allow microphone access.";
    case "network":
      return "Network error occurred. Please check your connection.";
    case "aborted":
      return "Speech recognition was aborted.";
    case "language-not-supported":
      return "Language not supported.";
    case "service-not-allowed":
      return "Speech recognition service not allowed.";
    default:
      return `Speech recognition error: ${error}`;
  }
}

export default useSpeechRecognition;
