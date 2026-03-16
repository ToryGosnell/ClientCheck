import { apiFetch } from "@/lib/api";
/**
 * Cancel Subscription Service
 * Handles subscription cancellation logic and API calls
 */

export interface CancelSubscriptionRequest {
  userId: string;
  reason?: string;
  feedback?: string;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  cancelledAt: string;
  accessEndsAt: string;
}

/**
 * Cancel user subscription
 */
export async function cancelSubscription(
  request: CancelSubscriptionRequest
): Promise<CancelSubscriptionResponse> {
  try {
    const response = await apiFetch("/api/subscription/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel subscription: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Subscription cancelled successfully");
    return data;
  } catch (error) {
    console.error("❌ Error cancelling subscription:", error);
    throw error;
  }
}

/**
 * Get cancellation confirmation details
 */
export async function getCancellationDetails(userId: string) {
  try {
    const response = await apiFetch(`/api/subscription/cancellation-details?userId=${userId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch cancellation details");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching cancellation details:", error);
    throw error;
  }
}

/**
 * Get cancellation reasons for feedback
 */
export const CANCELLATION_REASONS = [
  "Too expensive",
  "Don't need it anymore",
  "Found a better alternative",
  "Technical issues",
  "Poor customer support",
  "Other",
];

/**
 * Submit cancellation feedback
 */
export async function submitCancellationFeedback(
  userId: string,
  reason: string,
  feedback?: string
): Promise<void> {
  try {
    const response = await apiFetch("/api/subscription/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        reason,
        feedback,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to submit feedback");
    }

    console.log("✅ Cancellation feedback submitted");
  } catch (error) {
    console.error("Error submitting feedback:", error);
    // Don't throw - feedback is optional
  }
}

/**
 * Reactivate cancelled subscription
 */
export async function reactivateSubscription(userId: string): Promise<void> {
  try {
    const response = await apiFetch("/api/subscription/reactivate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error("Failed to reactivate subscription");
    }

    console.log("✅ Subscription reactivated");
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    throw error;
  }
}