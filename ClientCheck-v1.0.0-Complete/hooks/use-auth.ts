import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { DEMO_MODE, DEMO_USER } from "@/lib/demo-data";
import { identify, reset as resetAnalytics, track } from "@/lib/analytics";
import { clearPostLoginRedirect } from "@/lib/post-login-redirect";
import { clearPendingContractorInviteReferrer } from "@/lib/contractor-invite-pending";
import { clearPendingShareReferrer } from "@/lib/share-referral-pending";

export type AuthState = "loading" | "authenticated" | "unauthenticated";

type UseAuthOptions = {
  autoFetch?: boolean;
};

function makeDemoUser(): Auth.User {
  return {
    id: DEMO_USER.id,
    openId: DEMO_USER.openId,
    name: DEMO_USER.name,
    email: DEMO_USER.email,
    loginMethod: DEMO_USER.loginMethod,
    role: DEMO_USER.role,
    isVerified: false,
    verifiedAt: null,
    lastSignedIn: new Date(DEMO_USER.lastSignedIn),
  };
}

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(() =>
    DEMO_MODE ? makeDemoUser() : null
  );
  const [authState, setAuthState] = useState<AuthState>(() =>
    DEMO_MODE ? "authenticated" : "loading"
  );
  const [error, setError] = useState<Error | null>(null);

  const loading = authState === "loading";

  const fetchUser = useCallback(async () => {
    setAuthState("loading");
    setError(null);
    let nextUser: Auth.User | null = null;
    let nextAuthState: AuthState = "unauthenticated";

    try {
      // Native requires a stored token. Web relies on cookie auth.
      if (Platform.OS !== "web") {
        const sessionToken = await Auth.getSessionToken();
        if (!sessionToken) {
          await Auth.clearUserInfo();
          await Auth.removeSessionToken();
          return;
        }
      }

      // `/api/auth/me` is the source of truth for both web and native.
      console.log("[AUTH] before /api/auth/me");
      const apiUser = await Api.me();
      console.log("[AUTH] after /api/auth/me", {
        hasApiUser: Boolean(apiUser),
        apiUserId: apiUser?.id ?? null,
        apiUserRole: apiUser?.role ?? null,
      });
      if (!apiUser || apiUser.id == null) {
        await Auth.clearUserInfo();
        await Auth.removeSessionToken();
        return;
      }

      const userInfo = Auth.userFromApiJson(apiUser as unknown as Record<string, unknown>);
      nextUser = userInfo;
      nextAuthState = "authenticated";
      await Auth.setUserInfo(userInfo);
      identify(String(userInfo.id), { name: userInfo.name, email: userInfo.email });
    } catch (err) {
      const authError = err instanceof Error ? err : new Error("Failed to fetch user");
      console.warn("[useAuth] fetchUser failed:", authError.message);
      setError(authError);
      await Auth.clearUserInfo();
      await Auth.removeSessionToken();
    } finally {
      setUser(nextUser);
      setAuthState(nextAuthState);
      console.log("[AUTH STATE]", {
        loading: nextAuthState === "loading",
        hasUser: !!nextUser,
        role: nextUser?.role ?? null,
      });
    }
  }, []);

  const logout = useCallback(async () => {
    if (DEMO_MODE) {
      setUser(makeDemoUser());
      setAuthState("authenticated");
      return;
    }
    try {
      await Api.logout();
    } catch (err) {
      // Continue with local cleanup even if server-side logout fails
    } finally {
      track("logout");
      resetAnalytics();
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      await clearPostLoginRedirect();
      await clearPendingShareReferrer();
      await clearPendingContractorInviteReferrer();
      setUser(null);
      setError(null);
      setAuthState("unauthenticated");
    }
  }, []);

  const isAuthenticated = useMemo(() => authState === "authenticated", [authState]);
  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  useEffect(() => {
    if (DEMO_MODE) {
      const demoUser: Auth.User = {
        id: DEMO_USER.id,
        openId: DEMO_USER.openId,
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        loginMethod: DEMO_USER.loginMethod,
        role: DEMO_USER.role,
        isVerified: false,
        verifiedAt: null,
        lastSignedIn: new Date(DEMO_USER.lastSignedIn),
      };
      setUser(demoUser);
      setAuthState("authenticated");
      return;
    }

    if (!autoFetch) {
      setAuthState("unauthenticated");
      return;
    }

    void fetchUser();
  }, [autoFetch, fetchUser]);

  useEffect(() => {
    console.log("[AUTH STATE]", {
      loading,
      hasUser: !!user,
      role: user?.role ?? null,
    });
  }, [loading, user]);

  return {
    user,
    loading,
    authState,
    error,
    isAuthenticated,
    isAdmin,
    refresh: fetchUser,
    logout,
  };
}
