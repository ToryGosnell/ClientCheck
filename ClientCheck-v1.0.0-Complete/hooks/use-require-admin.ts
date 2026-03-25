import { useEffect } from "react";
import { useRouter } from "expo-router";
import { setPostLoginRedirect } from "@/lib/post-login-redirect";
import { useAuth } from "@/hooks/use-auth";

/**
 * Redirects unauthenticated users to OAuth with return path /admin.
 * Does not redirect when still loading session.
 */
export function useAdminAuthRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) return;
    void setPostLoginRedirect("/admin");
    router.replace(`/select-account?redirect=${encodeURIComponent("/admin")}`);
  }, [loading, user, router]);

  return { user, loading };
}
