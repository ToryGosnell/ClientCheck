import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { DEMO_MODE } from "@/lib/demo-data";

type UseAuthReturn = ReturnType<typeof useAuth>;

export type AuthWithLoginRedirect = UseAuthReturn & { contentReady: boolean };

/**
 * Single `useAuth()` source of truth. Redirects confirmed guests to `/select-account`.
 * Use `contentReady` to render protected UI (spinner until auth is resolved and user is signed in).
 */
export function useAuthWithLoginRedirect(): AuthWithLoginRedirect {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (DEMO_MODE) return;
    if (auth.loading) return;
    if (!auth.isAuthenticated) {
      router.replace("/select-account" as never);
    }
  }, [auth.loading, auth.isAuthenticated, router]);

  const contentReady = DEMO_MODE || (!auth.loading && auth.isAuthenticated);
  return { ...auth, contentReady };
}
