import { ThemedView } from "@/components/themed-view";
import { startOAuthLogin } from "@/constants/oauth";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { consumePostLoginRedirect } from "@/lib/post-login-redirect";
import { resolvePostLoginDestination } from "@/lib/resolve-post-login-destination";
import { tryApplyPendingContractorInviteReferral } from "@/lib/contractor-invite-after-login";
import { tryApplyPendingShareReferral } from "@/lib/share-referral-after-login";
import { trackSignupCompletedIfNew } from "@/lib/signup-completed-analytics";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
    sessionToken?: string;
    user?: string;
  }>();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const navigateAfterSession = async () => {
      await tryApplyPendingContractorInviteReferral();
      await tryApplyPendingShareReferral();
      const dest = await consumePostLoginRedirect();
      const path = await resolvePostLoginDestination(dest);
      setTimeout(() => router.replace(path as never), 800);
    };

    const handleCallback = async () => {
      try {
        // 1. Session token already present (web OAuth callback from server redirect)
        if (params.sessionToken) {
          await Auth.setSessionToken(params.sessionToken);

          if (params.user) {
            try {
              const userJson =
                typeof atob !== "undefined"
                  ? atob(params.user)
                  : Buffer.from(params.user, "base64").toString("utf-8");
              const userData = JSON.parse(userJson) as Record<string, unknown>;
              const userInfo = Auth.userFromApiJson(userData);
              await Auth.setUserInfo(userInfo);
              void trackSignupCompletedIfNew({
                id: userInfo.id,
                isNewUser: userData.isNewUser === true,
              });
            } catch {
              // User data parsing failed — session token is still valid
            }
          }

          setStatus("success");
          await navigateAfterSession();
          return;
        }

        // 2. Provider returned an error (cancelled, denied, expired)
        const providerError = params.error;
        if (providerError) {
          const desc = params.error_description?.replace(/\+/g, " ");
          const friendly =
            providerError === "access_denied"
              ? "Sign-in was cancelled."
              : desc || "Sign-in could not be completed.";
          setStatus("error");
          setErrorMessage(friendly);
          return;
        }

        // 3. Extract code + state from route params or URL
        let code: string | null = params.code ?? null;
        let state: string | null = params.state ?? null;
        let sessionToken: string | null = null;

        if (!code && !state) {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            try {
              const urlObj = new URL(initialUrl);
              code = urlObj.searchParams.get("code");
              state = urlObj.searchParams.get("state");
              sessionToken = urlObj.searchParams.get("sessionToken");
            } catch {
              const match = initialUrl.match(/[?&](code|state|sessionToken)=([^&]+)/g);
              if (match) {
                match.forEach((param) => {
                  const [key, value] = param.substring(1).split("=");
                  if (key === "code") code = decodeURIComponent(value);
                  if (key === "state") state = decodeURIComponent(value);
                  if (key === "sessionToken") sessionToken = decodeURIComponent(value);
                });
              }
            }
          }
        }

        // Session token found in URL
        if (sessionToken) {
          await Auth.setSessionToken(sessionToken);
          setStatus("success");
          await navigateAfterSession();
          return;
        }

        // 4. Missing code or state — user navigated here directly or session expired
        if (!code || !state) {
          setStatus("error");
          setErrorMessage("Sign-in could not be completed. Please try again.");
          return;
        }

        // 5. Exchange code for session token
        const result = await Api.exchangeOAuthCode(code, state);

        if (result.sessionToken) {
          await Auth.setSessionToken(result.sessionToken);

          if (result.user) {
            const raw = result.user as Record<string, unknown>;
            const userInfo = Auth.userFromApiJson(raw);
            await Auth.setUserInfo(userInfo);
            void trackSignupCompletedIfNew({
              id: userInfo.id,
              isNewUser: raw.isNewUser === true,
            });
          }

          setStatus("success");
          await navigateAfterSession();
        } else {
          setStatus("error");
          setErrorMessage("Sign-in could not be completed. Please try again.");
        }
      } catch {
        setStatus("error");
        setErrorMessage("Something went wrong. Please try again.");
      }
    };

    handleCallback();
  }, []);

  const handleRetry = () => {
    startOAuthLogin();
  };

  const handleGoBack = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <ThemedView style={styles.center}>
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" />
            <Text style={styles.statusText}>Completing sign-in...</Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.statusText}>Signed in successfully!</Text>
            <Text style={styles.subText}>Redirecting...</Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text style={styles.errorTitle}>Sign-in failed</Text>
            <Text style={styles.errorDesc}>{errorMessage}</Text>
            <Pressable
              onPress={handleRetry}
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
            <Pressable onPress={handleGoBack} style={styles.backLink}>
              <Text style={styles.backLinkText}>Go back</Text>
            </Pressable>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    color: "#999",
  },
  subText: {
    fontSize: 14,
    color: "#666",
  },
  successIcon: {
    fontSize: 48,
    color: "#22c55e",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ef4444",
    marginBottom: 4,
  },
  errorDesc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#999",
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backLink: {
    marginTop: 12,
    padding: 8,
  },
  backLinkText: {
    color: "#666",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
