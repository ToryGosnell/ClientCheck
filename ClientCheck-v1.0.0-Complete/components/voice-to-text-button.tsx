import React, { useState } from "react";
import { Pressable, Text, View, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { getMockTranscript } from "@/lib/voice-service";

interface VoiceToTextButtonProps {
  onTranscriptReceived: (text: string) => void;
  isLoading?: boolean;
}

export function VoiceToTextButton({ onTranscriptReceived, isLoading = false }: VoiceToTextButtonProps) {
  const colors = useColors();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);

      // Simulate recording for 3 seconds
      const recordingInterval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // After 3 seconds, stop recording and get transcript
      setTimeout(() => {
        clearInterval(recordingInterval);
        setIsRecording(false);

        // Get mock transcript
        const transcript = getMockTranscript();
        onTranscriptReceived(transcript);

        Alert.alert("Review Transcribed", "Your voice review has been converted to text. You can edit it before submitting.");
      }, 3000);
    } catch (error) {
      setIsRecording(false);
      Alert.alert("Error", "Failed to start voice recording. Please try again.");
      console.error("Voice recording error:", error);
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={isRecording ? handleStopRecording : handleStartRecording}
        disabled={isLoading}
        style={({ pressed }) => ({
          backgroundColor: isRecording ? colors.error : colors.primary,
          borderRadius: 12,
          paddingVertical: 12,
          opacity: pressed || isLoading ? 0.8 : 1,
        })}
      >
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 18 }}>{isRecording ? "🎙️ Recording..." : "🎙️ Tap to Record"}</Text>
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
            {isRecording ? `${recordingTime}s` : "Speak your review"}
          </Text>
        </View>
      </Pressable>

      <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center" }}>
        Tap and speak naturally. We'll convert your voice to text that you can edit.
      </Text>
    </View>
  );
}
