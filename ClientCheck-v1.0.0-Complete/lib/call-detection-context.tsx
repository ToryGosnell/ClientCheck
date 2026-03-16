import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { trpc } from "@/lib/trpc";
import {
  startCallDetection,
  stopCallDetection,
  normalizePhoneNumber,
  type IncomingCall,
} from "@/lib/call-detection-service";
import type { IncomingCallData } from "@/components/incoming-call-overlay";
import { apiFetch } from "@/lib/api";

interface CallDetectionContextType {
  isSupported: boolean;
  isListening: boolean;
  currentCall: IncomingCallData | null;
  startListening: () => void;
  stopListening: () => void;
  dismissCall: () => void;
}

const CallDetectionContext = createContext<CallDetectionContextType | undefined>(undefined);

export function CallDetectionProvider({ children }: { children: React.ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const [currentCall, setCurrentCall] = useState<IncomingCallData | null>(null);
  const isSupported = false;


  const handleIncomingCall = useCallback(
    (call: IncomingCall) => {
      // Normalize phone number
      const normalizedPhone = normalizePhoneNumber(call.phoneNumber);

      // Look up customer in database using the query
      // Since we can't use queries in event handlers, we'll fetch directly via the API
      const fetchCustomer = async () => {
        try {
          const response = await apiFetch("/api/trpc/customers.getByPhone", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: { phone: normalizedPhone },
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to fetch customer");
          }

          const data = await response.json();
          const customer = data.result?.data;

          if (customer) {
            // Calculate client score from ratings
            const ratings = [
              parseFloat(customer.ratingPaymentReliability || "0"),
              parseFloat(customer.ratingCommunication || "0"),
              parseFloat(customer.ratingScopeChanges || "0"),
              parseFloat(customer.ratingPropertyRespect || "0"),
              parseFloat(customer.ratingPermitPulling || "0"),
              parseFloat(customer.ratingOverallJobExperience || "0"),
            ];

            const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
            const clientScore = Math.round(avgRating * 20); // Convert 1-5 scale to 0-100

            // Determine if flagged
            const isFlagged = clientScore < 70;

            setCurrentCall({
              phoneNumber: call.phoneNumber,
              displayName: call.displayName,
              customerName: `${customer.firstName} ${customer.lastName}`,
              clientScore,
              redFlags: [], // Red flags are stored in reviews, not customers
              paymentReliability:
                customer.ratingPaymentReliability > 0
                  ? `${parseFloat(customer.ratingPaymentReliability).toFixed(1)}/5`
                  : "Not rated",
              reviewCount: customer.reviewCount || 0,
              lastReviewDate: customer.updatedAt
                ? new Date(customer.updatedAt).toLocaleDateString()
                : undefined,
              isFlagged,
            });
          } else {
            // Customer not found in database
            setCurrentCall({
              phoneNumber: call.phoneNumber,
              displayName: call.displayName,
              isFlagged: false,
            });
          }
        } catch (error) {
          console.error("Failed to lookup customer:", error);
          // Show basic call info if lookup fails
          setCurrentCall({
            phoneNumber: call.phoneNumber,
            displayName: call.displayName,
            isFlagged: false,
          });
        }
      };

      fetchCustomer();
    },
    []
  );

  const handleCallEnded = useCallback(() => {
    setCurrentCall(null);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      console.warn("Call detection not supported on this platform");
      return;
    }

    try {
      startCallDetection({
        onIncomingCall: handleIncomingCall,
        onCallEnded: handleCallEnded,
      });
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start call detection:", error);
    }
  }, [isSupported, handleIncomingCall, handleCallEnded]);

  const stopListening = useCallback(() => {
    try {
      stopCallDetection();
      setIsListening(false);
    } catch (error) {
      console.error("Failed to stop call detection:", error);
    }
  }, []);

  const dismissCall = useCallback(() => {
    setCurrentCall(null);
  }, []);

  // Start listening on mount (if supported)
  useEffect(() => {
    if (isSupported) {
      startListening();
    }

    return () => {
      if (isSupported) {
        stopListening();
      }
    };
  }, [isSupported, startListening, stopListening]);

  return (
    <CallDetectionContext.Provider
      value={{
        isSupported,
        isListening,
        currentCall,
        startListening,
        stopListening,
        dismissCall,
      }}
    >
      {children}
    </CallDetectionContext.Provider>
  );
}

export function useCallDetection() {
  const context = useContext(CallDetectionContext);
  if (!context) {
    throw new Error("useCallDetection must be used within CallDetectionProvider");
  }
  return context;
}