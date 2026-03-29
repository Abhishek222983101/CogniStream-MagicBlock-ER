// ElevenLabs Voice Service for TrialMatch AI
// Provides text-to-speech capabilities using ElevenLabs API

export interface VoiceConfig {
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

// Default voice configuration - using "Rachel" voice (calm, professional)
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - calm, professional female voice
  modelId: "eleven_multilingual_v2",
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  useSpeakerBoost: true,
};

// Alternative voices for variety
export const VOICES = {
  rachel: "21m00Tcm4TlvDq8ikWAM", // Calm, professional
  josh: "TxGEqnHWrfWFTfGW9XjX", // Deep, authoritative
  bella: "EXAVITQu4vr4xnSDxMaL", // Warm, friendly
  adam: "pNInz6obpgDQGcFmaJgB", // Clear, articulate
  domi: "AZnzlk1XvdvUeBnXmlld", // Strong, confident
} as const;

export type VoiceName = keyof typeof VOICES;

class ElevenLabsService {
  private apiKey: string | null = null;
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;

  initialize(apiKey: string) {
    this.apiKey = apiKey;
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async speak(
    text: string,
    config: Partial<VoiceConfig> = {},
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    if (!this.apiKey) {
      console.error("ElevenLabs API key not set");
      // Fallback to browser TTS
      return this.fallbackSpeak(text, onStart, onEnd);
    }

    const fullConfig = { ...DEFAULT_VOICE_CONFIG, ...config };

    try {
      onStart?.();
      this.isPlaying = true;

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${fullConfig.voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: fullConfig.modelId,
            voice_settings: {
              stability: fullConfig.stability,
              similarity_boost: fullConfig.similarityBoost,
              style: fullConfig.style,
              use_speaker_boost: fullConfig.useSpeakerBoost,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Stop any currently playing audio
      this.stop();

      this.currentAudio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        if (!this.currentAudio) return reject(new Error("Audio not initialized"));

        this.currentAudio.onended = () => {
          this.isPlaying = false;
          URL.revokeObjectURL(audioUrl);
          onEnd?.();
          resolve();
        };

        this.currentAudio.onerror = (e) => {
          this.isPlaying = false;
          URL.revokeObjectURL(audioUrl);
          onEnd?.();
          reject(e);
        };

        this.currentAudio.play().catch(reject);
      });
    } catch (error) {
      console.error("ElevenLabs TTS error:", error);
      this.isPlaying = false;
      // Fallback to browser TTS
      return this.fallbackSpeak(text, onStart, onEnd);
    }
  }

  private fallbackSpeak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        onEnd?.();
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to use a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.name.includes("Google") || v.name.includes("Natural")
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        this.isPlaying = true;
        onStart?.();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        onEnd?.();
        resolve();
      };

      utterance.onerror = () => {
        this.isPlaying = false;
        onEnd?.();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
  }

  getIsPlaying() {
    return this.isPlaying;
  }
}

export const elevenLabsService = new ElevenLabsService();
