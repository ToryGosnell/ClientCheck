const SESSION_TOKEN_KEY = "app_session_token";

function getSessionToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return null;
}

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = getSessionToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("[AUTH] Using token:", token);
  } else {
    console.log("[AUTH] No token found");
  }

  const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  return res;
}

async function parseApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorText;
    } catch {
      // Not JSON, use raw text
    }
    throw new Error(errorMessage || `API call failed: ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

// Logout
export async function logout(): Promise<void> {
  const res = await apiCall("/api/auth/logout", {
    method: "POST",
  });
  await parseApiResponse<{ success: boolean }>(res);
}

/** JSON shape for GET /api/auth/me → `{ user }` (datetimes as ISO 8601 strings). */
export type MeUserJson = {
  id: number | null;
  openId?: string | null;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  emailVerifiedAt?: string | null;
  lastSignedIn: string;
};

export type AuthResponse = {
  user: MeUserJson;
  sessionToken?: string;
  app_session_id?: string;
};

function detectSessionToken(result: AuthResponse): string | null {
  if (result.sessionToken) return result.sessionToken;
  if (result.app_session_id) return result.app_session_id;
  return null;
}

async function persistSessionToken(result: AuthResponse): Promise<void> {
  const token = detectSessionToken(result);
  const storageWriteAttempted = Boolean(token);
  if (token && typeof window !== "undefined") {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  const localStorageHasTokenAfterWrite =
    typeof window !== "undefined"
      ? Boolean(window.localStorage.getItem(SESSION_TOKEN_KEY))
      : null;
  console.log("[AUTH] token persistence", {
    tokenDetected: Boolean(token),
    storageWriteAttempted,
    localStorageHasTokenAfterWrite,
  });
}

export async function me(): Promise<MeUserJson | null> {
  try {
    const tokenBeforeMe = getSessionToken();
    console.log("[AUTH] pre-/api/auth/me token check", { hasToken: Boolean(tokenBeforeMe) });
    const res = await apiCall("/api/auth/me");
    const result = await parseApiResponse<{ user: MeUserJson | null }>(res);
    return result.user ?? null;
  } catch (error) {
    // 401 / "Not authenticated" is expected when session expired — not a real error
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Not authenticated") || msg.includes("401")) {
      return null;
    }
    console.warn("[API] getMe unexpected error:", msg);
    return null;
  }
}

// Backward-compatible alias used by existing code.
export const getMe = me;

export async function signup(input: {
  email: string;
  password: string;
  name?: string;
  accountType?: "contractor" | "customer";
  legalAcceptanceVersion?: string;
}): Promise<AuthResponse> {
  const res = await apiCall("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const result = await parseApiResponse<AuthResponse>(res);
  await persistSessionToken(result);
  return result;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const res = await apiCall("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const result = await parseApiResponse<AuthResponse>(res);
  await persistSessionToken(result);
  return result;
}

export async function forgotPassword(email: string): Promise<{ success: boolean }> {
  const res = await apiCall("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return parseApiResponse<{ success: boolean }>(res);
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<{ success: boolean }> {
  const res = await apiCall("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ success: boolean }>(res);
}

export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  const res = await apiCall("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return parseApiResponse<{ success: boolean; error?: string }>(res);
}

export async function resendVerification(email?: string): Promise<{ success: boolean }> {
  const res = await apiCall("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(email ? { email } : {}),
  });
  return parseApiResponse<{ success: boolean }>(res);
}
