import { Redirect } from "expo-router";

/** Alias for Stripe success / marketing links that expect `/dashboard`. Main home is the tab stack. */
export default function DashboardRedirect() {
  return <Redirect href="/(tabs)" />;
}
