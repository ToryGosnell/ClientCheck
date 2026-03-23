import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { API_BASE } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { DEMO_MODE, getDemoResponse } from "@/lib/demo-data";

const RAILWAY_TRPC_URL = `${API_BASE.replace(/\/$/, "")}/api/trpc`;

export const trpc = createTRPCReact<AppRouter>();

/**
 * Parse batch inputs from every possible location tRPC might put them.
 */
function parseBatchInputs(
  urlObj: URL,
  init?: RequestInit,
): Record<string, unknown> {
  // Try URL query param (GET queries)
  const rawInput = urlObj.searchParams.get("input");
  if (rawInput) {
    try {
      const parsed = JSON.parse(rawInput);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }

  // Try request body (POST mutations / POST-fallback for long batched queries)
  if (init?.body) {
    try {
      let bodyStr: string;
      if (typeof init.body === "string") {
        bodyStr = init.body;
      } else if (init.body instanceof ArrayBuffer) {
        bodyStr = new TextDecoder().decode(init.body);
      } else if (typeof (init.body as any).text === "function") {
        // ReadableStream won't be awaited here, skip
        bodyStr = "";
      } else {
        bodyStr = String(init.body);
      }
      if (bodyStr) {
        const parsed = JSON.parse(bodyStr);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
  }

  return {};
}

/**
 * Unwrap superjson batch entry: { json: <actual>, meta: ... } → <actual>
 */
function unwrapInput(entry: unknown): unknown {
  if (!entry || typeof entry !== "object") return undefined;
  const e = entry as Record<string, unknown>;
  return "json" in e ? e.json : e;
}

function createDemoFetch(): typeof fetch {
  return async (
    reqInfo: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const rawUrl =
      typeof reqInfo === "string"
        ? reqInfo
        : reqInfo instanceof URL
          ? reqInfo.href
          : reqInfo.url;

    const urlObj = new URL(rawUrl, "http://localhost");
    const procPath = urlObj.pathname.replace(/^\/api\/trpc\//, "");
    const procedures = procPath.split(",");
    const batchInputs = parseBatchInputs(urlObj, init);

    const results = procedures.map((proc, idx) => {
      const procInput = unwrapInput(batchInputs[String(idx)]);
      const data = getDemoResponse(proc, procInput);
      return {
        result: { data: { json: data, meta: { values: {} } } },
      };
    });

    const body = JSON.stringify(results.length === 1 ? results[0] : results);
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: DEMO_MODE ? "http://localhost/api/trpc" : RAILWAY_TRPC_URL,
        transformer: superjson,
        async headers() {
          if (DEMO_MODE) return {};
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        fetch: DEMO_MODE
          ? createDemoFetch()
          : (u, o) => fetch(u, { ...o, credentials: "include" }),
      }),
    ],
  });
}
