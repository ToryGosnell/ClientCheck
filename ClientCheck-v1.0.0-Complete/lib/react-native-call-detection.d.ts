declare module "react-native-call-detection" {
  export interface CallData {
    phoneNumber?: string;
    number?: string;
    displayName?: string;
    name?: string;
  }

  export default class RNCallDetection {
    addListener(
      eventType: "Incoming" | "Disconnected" | "Outgoing",
      callback: (data: CallData) => void
    ): RNCallDetectionSubscription;
  }

  export interface RNCallDetectionSubscription {
    addListener(
      eventType: "Incoming" | "Disconnected" | "Outgoing",
      callback: (data: CallData) => void
    ): void;
    remove(): void;
  }
}
