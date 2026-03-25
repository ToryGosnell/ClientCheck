import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { DEMO_MODE, DEMO_USER } from "@/lib/demo-data";
import { identify, reset as resetAnalytics, track } from "@/lib/analytics";
import { trackSignupCompletedIfNew } from "@/lib/signup-completed-analytics";
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

    try {
      if (Platform.OS === "web") {
        // Web: check localStorage cache first — if user never logged in,
        // skip the API call entirely to avoid a noisy 401.
        const cachedUser = await Auth.getUserInfo();

        if (!cachedUser) {
          setUser(null);
          setAuthState("unauthenticated");
          return;
        }

        // Cached user exists → validate the session cookie is still good
        const apiUser = await Api.getMe();

        if (apiUser) {
          if (apiUser.id == null) {
            await Auth.clearUserInfo();
            setUser(null);
            setAuthState("unauthenticated");
            return;
          }
          try {
            const userInfo = Auth.userFromApiJson(apiUser as unknown as Record<string, unknown>);
            setUser(userInfo);
            setAuthState("authenticated");
            await Auth.setUserInfo(userInfo);
            void trackSignupCompletedIfNew({
              id: apiUser.id,
              isNewUser: apiUser.isNewUser === true,
            });
          } catch {
            await Auth.clearUserInfo();
            setUser(null);
            setAuthState("unauthenticated");
          }
        } else {
          // Session expired or cookie cleared — clean up
          await Auth.clearUserInfo();
          setUser(null);
          setAuthState("unauthenticated");
        }
        return;
      }

      // Native: token-based auth
      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        setUser(null);
        setAuthState("unauthenticated");
        return;
      }

      const cachedUser = await Auth.getUserInfo();
      if (cachedUser) {
        try {
          const normalized = Auth.userFromApiJson(cachedUser as unknown as Record<string, unknown>);
          setUser(normalized);
          setAuthState("authenticated");
          identify(String(normalized.id), { name: normalized.name, email: normalized.email });
          track("login", { method: "session" });
        } catch {
          setUser(null);
          setAuthState("unauthenticated");
        }
      } else {
        setUser(null);
        setAuthState("unauthenticated");
      }
    } catch (err) {
      const authError = err instanceof Error ? err : new Error("Failed to fetch user");
      console.warn("[useAuth] fetchUser failed:", authError.message);
      setError(authError);
      setUser(null);
      await Auth.clearUserInfo();
      setAuthState("unauthenticated");
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

    if (Platform.OS === "web") {
      fetchUser();
    } else {
      Auth.getUserInfo().then((cachedUser) => {
        if (cachedUser) {
          try {
            setUser(Auth.userFromApiJson(cachedUser as unknown as Record<string, unknown>));
            setAuthState("authenticated");
          } catch {
            void fetchUser();
          }
        } else {
          fetchUser();
        }
      });
    }
  }, [autoFetch, fetchUser]);

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
