import React from "react";
import { useCallDetection } from "@/lib/call-detection-context";
import { IncomingCallOverlay } from "@/components/incoming-call-overlay";

/**
 * Wrapper component that displays the incoming call overlay.
 * This must be placed inside the CallDetectionProvider.
 */
export function CallDetectionWrapper() {
  const { currentCall, dismissCall } = useCallDetection();

  if (!currentCall) {
    return null;
  }

  return (
    <IncomingCallOverlay
      visible={!!currentCall}
      callData={currentCall}
      onAccept={() => {
        // Accept call - in a real app, this would integrate with native call handling
        console.log("Call accepted:", currentCall.phoneNumber);
        dismissCall();
      }}
      onReject={() => {
        // Reject call - in a real app, this would integrate with native call handling
        console.log("Call rejected:", currentCall.phoneNumber);
        dismissCall();
      }}
      onDismiss={dismissCall}
    />
  );
}
