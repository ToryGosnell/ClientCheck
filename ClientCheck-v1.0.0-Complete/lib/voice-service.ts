import { Platform } from "react-native";

export interface VoiceRecordingState {
  isRecording: boolean;
  transcript: string;
  isSpeaking: boolean;
  error: string | null;
}

export class VoiceService {
  private static isAvailable = true;

  static async checkAvailability(): Promise<boolean> {
    try {
      // In production, check actual Speech API availability
      this.isAvailable = Platform.OS !== "web";
      return this.isAvailable;
    } catch (error) {
      console.warn("Speech API not available:", error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Start voice recording and transcription
   * Note: Expo Speech doesn't have direct recording, so we use platform-specific APIs
   * For production, consider using expo-av or react-native-voice
   */
  static async startRecording(): Promise<void> {
    if (!this.isAvailable) {
      throw new Error("Speech API not available");
    }

    try {
      // This is a placeholder for actual voice recording
      // In production, you would use:
      // - react-native-voice for actual speech recognition
      // - expo-av for audio recording
      console.log("Voice recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }

  /**
   * Stop recording and get transcript
   */
  static async stopRecording(): Promise<string> {
    try {
      // This would return the actual transcript from the speech recognition API
      // For now, returning placeholder
      return "";
    } catch (error) {
      console.error("Failed to stop recording:", error);
      throw error;
    }
  }

  /**
   * Speak text aloud (for review playback)
   */
  static async speak(text: string, options?: { rate?: number; pitch?: number }): Promise<void> {
    if (!this.isAvailable) {
      console.warn("Speech API not available");
      return;
    }

    try {
      // In production, use: await Speech.speak(text, {...})
      console.log("Speaking:", text);
    } catch (error) {
      console.error("Failed to speak:", error);
    }
  }

  /**
   * Stop speaking
   */
  static async stop(): Promise<void> {
    try {
      // In production, use: await Speech.stop()
      console.log("Speech stopped");
    } catch (error) {
      console.error("Failed to stop speaking:", error);
    }
  }

  /**
   * Get available voices
   */
  static async getAvailableVoices(): Promise<any[]> {
    try {
      // In production, use: await Speech.getAvailableVoicesAsync()
      return [];
    } catch (error) {
      console.error("Failed to get voices:", error);
      return [];
    }
  }

  /**
   * Check if currently speaking
   */
  static async isSpeaking(): Promise<boolean> {
    try {
      // In production, use: await Speech.isSpeakingAsync()
      return false;
    } catch (error) {
      console.error("Failed to check speaking status:", error);
      return false;
    }
  }
}

/**
 * Mock voice recording for testing
 * In production, replace with actual speech recognition
 */
export function getMockTranscript(): string {
  const mockReviews = [
    "This customer was great to work with. Paid on time, knew exactly what they wanted, and was very professional.",
    "Had some issues with scope creep. Customer kept adding extras without discussing budget. Payment was delayed by 2 weeks.",
    "Terrible experience. Customer was rude, disputed the invoice, and tried to get work done without paying.",
    "Average customer. Communication was okay but they were indecisive about project details.",
    "Excellent! Very organized, clear about expectations, and paid early. Would definitely work with them again.",
  ];

  return mockReviews[Math.floor(Math.random() * mockReviews.length)];
}
