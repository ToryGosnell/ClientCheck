import * as Auth from "@/lib/_core/auth";
import { isAdminOnlyDestination } from "@/lib/admin-paths";

const DEFAULT_APP_HOME = "/(tabs)" as const;

/**
 * After OAuth, send admins to stored paths like `/admin`; everyone else stays out of admin routes.
 */
export async function resolvePostLoginDestination(consumedPath: string | null): Promise<string> {
  const path = consumedPath?.trim() ? consumedPath.trim() : DEFAULT_APP_HOME;
  if (!isAdminOnlyDestination(path)) return path;

  const u = await Auth.getUserInfo();
  const role = u?.role ?? "";
  if (role !== "admin") return DEFAULT_APP_HOME;
  return path;
}
