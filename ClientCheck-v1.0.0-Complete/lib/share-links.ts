import { Platform } from "react-native";

/**
 * Public URL for sharing a customer profile (web uses current origin when available).
 */
export function customerProfileShareUrl(customerId: number): string {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/customer/${customerId}`;
  }
  return `https://dist-web-alpha.vercel.app/customer/${customerId}`;
}
