import * as Notifications from "expo-server-sdk";

const expoClient = new Notifications.Expo();

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send push notification to a contractor
 */
export async function sendPushNotification(
  expoPushToken: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!Notifications.Expo.isExpoPushToken(expoPushToken)) {
    console.warn(`[Push] Invalid Expo push token: ${expoPushToken}`);
    return false;
  }

  try {
    const message: Notifications.ExpoPushMessage = {
      to: expoPushToken,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      badge: 1,
    };

    const tickets = await expoClient.sendPushNotificationsAsync([message]);
    console.log(`[Push] Sent notification to ${expoPushToken}`);
    return true;
  } catch (error) {
    console.error(`[Push] Failed to send notification:`, error);
    return false;
  }
}

/**
 * Send batch push notifications
 */
export async function sendBatchPushNotifications(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<number> {
  const validTokens = tokens.filter((token) => Notifications.Expo.isExpoPushToken(token));

  if (validTokens.length === 0) {
    console.warn("[Push] No valid tokens provided");
    return 0;
  }

  try {
    const messages: Notifications.ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      badge: 1,
    }));

    const tickets = await expoClient.sendPushNotificationsAsync(messages);
    console.log(`[Push] Sent ${validTokens.length} notifications`);
    return validTokens.length;
  } catch (error) {
    console.error("[Push] Failed to send batch notifications:", error);
    return 0;
  }
}

/**
 * Send notification when dispute is filed
 */
export async function notifyDisputeFiled(
  contractorPushToken: string,
  customerName: string,
  reviewId: number
): Promise<boolean> {
  return sendPushNotification(contractorPushToken, {
    title: "Review Disputed",
    body: `${customerName} has disputed your review`,
    data: {
      type: "dispute_filed",
      reviewId: String(reviewId),
    },
  });
}

/**
 * Send notification when review is posted
 */
export async function notifyReviewPosted(
  customerPushToken: string,
  contractorName: string,
  rating: number
): Promise<boolean> {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  return sendPushNotification(customerPushToken, {
    title: "New Review",
    body: `${contractorName} left a ${stars} review`,
    data: {
      type: "review_posted",
    },
  });
}

/**
 * Send trial expiration reminder
 */
export async function notifyTrialExpiring(
  contractorPushToken: string,
  daysRemaining: number
): Promise<boolean> {
  return sendPushNotification(contractorPushToken, {
    title: "Trial Expiring Soon",
    body: `Your trial expires in ${daysRemaining} days. Upgrade to continue.`,
    data: {
      type: "trial_expiring",
      daysRemaining: String(daysRemaining),
    },
  });
}

/**
 * Send verification status update
 */
export async function notifyVerificationStatus(
  contractorPushToken: string,
  status: "approved" | "rejected" | "pending",
  notes?: string
): Promise<boolean> {
  const statusText = {
    approved: "Your verification has been approved! You now have a verified badge.",
    rejected: "Your verification was not approved. Please review the feedback and resubmit.",
    pending: "Your verification is being reviewed. We'll notify you when it's complete.",
  };

  return sendPushNotification(contractorPushToken, {
    title: `Verification ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    body: statusText[status],
    data: {
      type: "verification_status",
      status,
    },
  });
}

/**
 * Check if push token is valid
 */
export function isValidPushToken(token: string): boolean {
  return Notifications.Expo.isExpoPushToken(token);
}
