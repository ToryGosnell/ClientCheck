import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

/**
 * Send admin users away from purchase / paywall routes so they can preview the app without Stripe.
 */
export function useAdminPaywallBypassRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user?.role === "admin") {
      router.replace("/(tabs)" as never);
    }
  }, [loading, user?.role, router]);
}
