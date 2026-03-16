import { Platform } from "react-native";

export interface IncomingCall {
  phoneNumber: string;
  displayName?: string;
  callType: "incoming" | "outgoing" | "missed";
}

export interface CallDetectionListener {
  onIncomingCall: (call: IncomingCall) => void;
  onCallEnded: () => void;
}

/**
 * Native call-state detection was removed to keep the Android build compliant
 * with Google Play restricted-permission policies.
 */
export function startCallDetection(_listener: CallDetectionListener): void {
  console.info("Native call detection is disabled in this build.");
}

export function stopCallDetection(): void {}

export function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, "");
}

export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = normalizePhoneNumber(phoneNumber);
  if (cleaned.length === 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  if (cleaned.length === 11 && cleaned[0] === "1") return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  return phoneNumber;
}

export const CALL_DETECTION_SUPPORTED = Platform.OS === "android" && false;
