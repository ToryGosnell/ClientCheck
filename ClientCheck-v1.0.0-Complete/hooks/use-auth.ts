import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { DEMO_MODE, DEMO_USER } from "@/lib/demo-data";
import { identify, reset as resetAnalytics, track } from "@/lib/analytics";

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
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            role: (apiUser as any).role ?? "user",
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          setAuthState("authenticated");
          await Auth.setUserInfo(userInfo);
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
        setUser(cachedUser);
        setAuthState("authenticated");
        identify(String(cachedUser.id), { name: cachedUser.name, email: cachedUser.email });
        track("login", { method: "session" });
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
          setUser(cachedUser);
          setAuthState("authenticated");
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
