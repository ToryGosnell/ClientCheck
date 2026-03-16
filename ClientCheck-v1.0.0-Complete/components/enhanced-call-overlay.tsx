import React, { useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CallData {
  phoneNumber: string;
  customerName?: string;
  clientScore?: number;
  redFlags?: string[];
  paymentReliability?: number;
  reviewCount?: number;
}

interface EnhancedCallOverlayProps {
  visible: boolean;
  callData: CallData | null;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
  onQuickReview?: (rating: number, redFlags: string[]) => void;
}

export function EnhancedCallOverlay({
  visible,
  callData,
  onAccept,
  onReject,
  onDismiss,
  onQuickReview,
}: EnhancedCallOverlayProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showQuickReview, setShowQuickReview] = useState(false);
  const [quickRating, setQuickRating] = useState(3);
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  if (!callData) return null;

  const getScoreColor = (score?: number) => {
    if (!score) return colors.muted;
    if (score >= 80) return "#22C55E";
    if (score >= 60) return "#EAB308";
    if (score >= 40) return "#F97316";
    return "#DC2626";
  };

  const getScoreLabel = (score?: number) => {
    if (!score) return "Unknown";
    if (score >= 80) return "Safe";
    if (score >= 60) return "Caution";
    if (score >= 40) return "Warning";
    return "High Risk";
  };

  const redFlagOptions = [
    "Payment Issues",
    "Scope Creep",
    "Communication",
    "Quality Issues",
    "Disputes",
  ];

  const handleSubmitQuickReview = () => {
    onQuickReview?.(quickRating, selectedFlags);
    Alert.alert("Review Submitted", "Thank you for helping the community!");
    setShowQuickReview(false);
    setQuickRating(3);
    setSelectedFlags([]);
    setNotes("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "flex-end",
        }}
      >
        {/* Call Overlay */}
        {!showQuickReview && (
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 20,
              paddingHorizontal: 16,
              paddingBottom: Math.max(insets.bottom, 16),
              maxHeight: "80%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Close Button */}
              <Pressable onPress={onDismiss} style={{ alignSelf: "flex-end", marginBottom: 12 }}>
                <Text style={{ fontSize: 24, color: colors.muted }}>✕</Text>
              </Pressable>

              {/* Customer Info */}
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 32, fontWeight: "bold", color: "#fff" }}>
                    {callData.customerName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "?"}
                  </Text>
                </View>

                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground }}>
                  {callData.customerName || "Unknown"}
                </Text>
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
                  {callData.phoneNumber}
                </Text>
              </View>

              {/* Client Score Badge */}
              {callData.clientScore !== undefined && (
                <View
                  style={{
                    backgroundColor: getScoreColor(callData.clientScore),
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: callData.clientScore >= 60 ? "#000" : "#fff",
                      fontWeight: "600",
                    }}
                  >
                    CLIENT SCORE
                  </Text>
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: "bold",
                      color: callData.clientScore >= 60 ? "#000" : "#fff",
                      marginTop: 4,
                    }}
                  >
                    {callData.clientScore}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: callData.clientScore >= 60 ? "#000" : "#fff",
                      marginTop: 4,
                    }}
                  >
                    {getScoreLabel(callData.clientScore)}
                  </Text>
                </View>
              )}

              {/* Stats */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.muted }}>Payment Reliability</Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: colors.foreground,
                      marginTop: 4,
                    }}
                  >
                    {callData.paymentReliability || 0}%
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.muted }}>Reviews</Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: colors.foreground,
                      marginTop: 4,
                    }}
                  >
                    {callData.reviewCount || 0}
                  </Text>
                </View>
              </View>

              {/* Red Flags */}
              {callData.redFlags && callData.redFlags.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
                    Top Red Flags
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {callData.redFlags.slice(0, 3).map((flag, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: "#DC2626",
                          borderRadius: 16,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>
                          {flag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ gap: 8, marginBottom: 16 }}>
                <Pressable
                  onPress={onAccept}
                  style={({ pressed }) => ({
                    backgroundColor: colors.success,
                    borderRadius: 12,
                    paddingVertical: 14,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ textAlign: "center", fontWeight: "bold", color: "#fff" }}>
                    Accept Call
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onReject}
                  style={({ pressed }) => ({
                    backgroundColor: colors.error,
                    borderRadius: 12,
                    paddingVertical: 14,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ textAlign: "center", fontWeight: "bold", color: "#fff" }}>
                    Decline Call
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowQuickReview(true)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ textAlign: "center", fontWeight: "bold", color: "#fff" }}>
                    Quick Review
                  </Text>
                </Pressable>
              </View>

              {/* Additional Actions */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                    paddingVertical: 10,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ textAlign: "center", fontSize: 12, color: colors.foreground }}>
                    🚫 Block
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                    paddingVertical: 10,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ textAlign: "center", fontSize: 12, color: colors.foreground }}>
                    ⚠️ Spam
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Quick Review Modal */}
        {showQuickReview && (
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 20,
              paddingHorizontal: 16,
              paddingBottom: Math.max(insets.bottom, 16),
              maxHeight: "90%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable
                onPress={() => setShowQuickReview(false)}
                style={{ alignSelf: "flex-end", marginBottom: 12 }}
              >
                <Text style={{ fontSize: 24, color: colors.muted }}>✕</Text>
              </Pressable>

              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground, marginBottom: 16 }}>
                Quick Review
              </Text>

              {/* Rating */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
                  How would you rate this customer?
                </Text>
                <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Pressable
                      key={rating}
                      onPress={() => setQuickRating(rating)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 28,
                          opacity: quickRating >= rating ? 1 : 0.3,
                        }}
                      >
                        ★
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Red Flags */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
                  Select any red flags
                </Text>
                <View style={{ gap: 8 }}>
                  {redFlagOptions.map((flag) => (
                    <Pressable
                      key={flag}
                      onPress={() => {
                        setSelectedFlags((prev) =>
                          prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
                        );
                      }}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          backgroundColor: colors.surface,
                          borderRadius: 8,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderColor: selectedFlags.includes(flag) ? colors.primary : colors.border,
                          borderWidth: 1,
                        }}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            backgroundColor: selectedFlags.includes(flag) ? colors.primary : "transparent",
                            borderColor: colors.border,
                            borderWidth: 1,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {selectedFlags.includes(flag) && (
                            <Text style={{ color: "#fff", fontWeight: "bold" }}>✓</Text>
                          )}
                        </View>
                        <Text style={{ color: colors.foreground, fontWeight: "500" }}>{flag}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
                  Additional notes (optional)
                </Text>
                <TextInput
                  placeholder="Add any additional details..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.muted}
                  style={{
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                  }}
                />
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmitQuickReview}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ textAlign: "center", fontWeight: "bold", color: "#fff" }}>
                  Submit Review
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}
