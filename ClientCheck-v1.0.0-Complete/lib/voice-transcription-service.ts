import React, { useState, useEffect } from "react";
import { Platform } from "react-native";
// Speech module removed - not needed for core functionality

export interface VoiceTranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export interface VoiceTranscriptionOptions {
  language?: string;
  maxResults?: number;
  onPartialResult?: (result: VoiceTranscriptionResult) => void;
  onError?: (error: string) => void;
}

/**
 * Voice Transcription Service using Expo Speech API
 * Note: This is a fallback implementation. For production speech-to-text,
 * consider using Google Cloud Speech-to-Text or AWS Transcribe APIs.
 */
class VoiceTranscriptionService {
  private isListening = false;
  private recognizedText = "";

  constructor() {
    // Initialize if needed
  }

  /**
   * Start voice recording and transcription
   * Note: Expo doesn't have built-in speech recognition.
   * This is a placeholder that logs to console.
   * For production, integrate with Google Cloud Speech-to-Text or similar.
   */
  async startRecording(options?: VoiceTranscriptionOptions): Promise<void> {
    if (this.isListening) {
      console.warn("Already listening");
      return;
    }

    try {
      this.isListening = true;
      this.recognizedText = "";
      console.log("🎤 Voice recording started (Expo fallback - no actual recording)");
      console.log("   For production speech-to-text, integrate with:");
      console.log("   - Google Cloud Speech-to-Text API");
      console.log("   - AWS Transcribe");
      console.log("   - Azure Speech Services");
    } catch (error) {
      console.error("Failed to start recording:", error);
      this.isListening = false;
      if (options?.onError) {
        options.onError(String(error));
      }
      throw error;
    }
  }

  /**
   * Stop voice recording and get transcription
   */
  async stopRecording(): Promise<string> {
    if (!this.isListening) {
      console.warn("Not currently listening");
      return this.recognizedText;
    }

    try {
      this.isListening = false;
      console.log("🎤 Stopped recording");
      return this.recognizedText;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      throw error;
    }
  }

  /**
   * Cancel voice recording
   */
  async cancelRecording(): Promise<void> {
    try {
      this.recognizedText = "";
      this.isListening = false;
      console.log("🎤 Recording cancelled");
    } catch (error) {
      console.error("Failed to cancel recording:", error);
    }
  }

  /**
   * Get current recognized text
   */
  getRecognizedText(): string {
    return this.recognizedText;
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Destroy voice service
   */
  destroy(): void {
    try {
      this.recognizedText = "";
      this.isListening = false;
    } catch (error) {
      console.error("Failed to destroy voice service:", error);
    }
  }

  /**
   * Use Expo Speech to speak text (text-to-speech)
   */
  async speak(text: string): Promise<void> {
    // Speech module removed - not needed for core functionality
    console.log("Text-to-speech feature removed:", text);
  }
}

// Export singleton instance
export const voiceTranscriptionService = new VoiceTranscriptionService();

/**
 * Hook for using voice transcription in React components
 */
export function useVoiceTranscription() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startRecording = async (options?: VoiceTranscriptionOptions) => {
    try {
      setError(null);
      setRecognizedText("");
      await voiceTranscriptionService.startRecording(options);
      setIsListening(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setIsListening(false);
    }
  };

  const stopRecording = async () => {
    try {
      const text = await voiceTranscriptionService.stopRecording();
      setRecognizedText(text);
      setIsListening(false);
      return text;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setIsListening(false);
      throw err;
    }
  };

  const cancelRecording = async () => {
    try {
      await voiceTranscriptionService.cancelRecording();
      setRecognizedText("");
      setIsListening(false);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    }
  };

  const speak = async (text: string) => {
    try {
      await voiceTranscriptionService.speak(text);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    }
  };

  useEffect(() => {
    return () => {
      if (isListening) {
        voiceTranscriptionService.destroy();
      }
    };
  }, [isListening]);

  return {
    isListening,
    recognizedText,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    speak,
  };
}
