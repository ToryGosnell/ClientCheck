import { Redirect } from "expo-router";

/** @deprecated Use `/select-account` and the subtle “Admin Access” link (same OAuth, role = admin). */
export default function LegacyAdminLoginRedirect() {
  return <Redirect href="/select-account" />;
}
