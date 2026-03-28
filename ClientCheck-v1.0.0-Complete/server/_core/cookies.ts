import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const configuredDomain = (process.env.COOKIE_DOMAIN ?? "").trim();

  // Default to host-only cookies unless COOKIE_DOMAIN is explicitly configured.
  // Auto-derived parent domains can produce invalid values on managed hosts.
  const domain = configuredDomain.length > 0 ? configuredDomain : undefined;

  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? true : isSecureRequest(req);
  // Browsers require Secure when SameSite=None. Use Lax for non-HTTPS local/dev.
  const sameSite: CookieOptions["sameSite"] = secure ? "none" : "lax";

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
  };
}
