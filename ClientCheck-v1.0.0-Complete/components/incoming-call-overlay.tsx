import React, { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, Image, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { ClientScoreBadge } from "./client-score-badge";
import { formatPhoneNumber } from "@/lib/call-detection-service";

export interface IncomingCallData {
  phoneNumber: string;
  displayName?: string;
  customerName?: string;
  clientScore?: number;
  redFlags?: string[];
  paymentReliability?: string;
  reviewCount?: number;
  lastReviewDate?: string;
  isFlagged: boolean;
}

interface IncomingCallOverlayProps {
  visible: boolean;
  callData: IncomingCallData | null;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
}

export function IncomingCallOverlay({
  visible,
  callData,
  onAccept,
  onReject,
  onDismiss,
}: IncomingCallOverlayProps) {
  const colors = useColors();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (visible) {
      setAnimateIn(true);
    }
  }, [visible]);

  if (!callData) return null;

  const getScoreColor = (score: number) => {
    if (score < 20) return colors.error;
    if (score < 40) return "#DC2626";
    if (score < 70) return "#EAB308";
    return colors.success;
  };

  const getScoreLabel = (score: number) => {
    if (score < 20) return "NOT RECOMMENDED";
    if (score < 40) return "RED FLAG";
    if (score < 70) return "CAUTION";
    return "GREAT CUSTOMER";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
          scrollEnabled={callData.redFlags && callData.redFlags.length > 3}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 400,
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              borderWidth: 2,
              borderColor: callData.isFlagged ? "#DC2626" : colors.border,
            }}
          >
            {/* Incoming Call Header */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.muted,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              INCOMING CALL
            </Text>

            {/* Phone Number */}
            <Text
              style={{
                fontSize: 28,
                fontWeight: "bold",
                color: colors.foreground,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {formatPhoneNumber(callData.phoneNumber)}
            </Text>

            {/* Display Name */}
            {callData.displayName && (
              <Text
                style={{
                  fontSize: 16,
                  color: colors.muted,
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                {callData.displayName}
              </Text>
            )}

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginVertical: 16,
              }}
            />

            {/* Customer Info */}
            {callData.isFlagged && callData.clientScore !== undefined ? (
              <View>
                {/* Client Score Badge */}
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <View
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      backgroundColor: getScoreColor(callData.clientScore),
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 36,
                        fontWeight: "bold",
                        color: "#fff",
                      }}
                    >
                      {callData.clientScore}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: getScoreColor(callData.clientScore),
                      textAlign: "center",
                    }}
                  >
                    {getScoreLabel(callData.clientScore)}
                  </Text>
                </View>

                {/* Payment Reliability */}
                {callData.paymentReliability && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.muted,
                        marginBottom: 4,
                      }}
                    >
                      PAYMENT RELIABILITY
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: colors.foreground,
                      }}
                    >
                      {callData.paymentReliability}
                    </Text>
                  </View>
                )}

                {/* Red Flags */}
                {callData.redFlags && callData.redFlags.length > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.muted,
                        marginBottom: 8,
                      }}
                    >
                      RED FLAGS ({callData.redFlags.length})
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {callData.redFlags.slice(0, 3).map((flag, i) => (
                        <View
                          key={i}
                          style={{
                            backgroundColor: "#7f1d1d",
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#fca5a5",
                              fontWeight: "600",
                            }}
                          >
                            {flag}
                          </Text>
                        </View>
                      ))}
                      {callData.redFlags.length > 3 && (
                        <View
                          style={{
                            backgroundColor: "#7f1d1d",
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#fca5a5",
                              fontWeight: "600",
                            }}
                          >
                            +{callData.redFlags.length - 3} more
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Review Count */}
                {callData.reviewCount !== undefined && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.muted,
                        marginBottom: 4,
                      }}
                    >
                      REVIEWS
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: colors.foreground,
                      }}
                    >
                      {callData.reviewCount} contractor reviews
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ alignItems: "center", marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.success,
                    textAlign: "center",
                  }}
                >
                  ✓ No red flags
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  This customer has a good track record
                </Text>
              </View>
            )}

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginVertical: 16,
              }}
            />

            {/* Action Buttons */}
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                justifyContent: "center",
              }}
            >
              <Pressable
                onPress={onReject}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: "#DC2626",
                  paddingVertical: 14,
                  borderRadius: 12,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#fff",
                  }}
                >
                  Decline
                </Text>
              </Pressable>

              <Pressable
                onPress={onAccept}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  borderRadius: 12,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#fff",
                  }}
                >
                  Accept
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
