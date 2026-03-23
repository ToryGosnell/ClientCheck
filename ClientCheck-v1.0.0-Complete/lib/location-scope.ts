import { Platform } from "react-native";

export type LocationScope = "city" | "state" | "national";

export interface UserLocation {
  defaultState: string | null;
  defaultCity: string | null;
  preferredSearchScope: LocationScope;
}

const STORAGE_KEY = "cc_location_prefs";

const DEFAULT_LOCATION: UserLocation = {
  defaultState: "AZ",
  defaultCity: "Phoenix",
  preferredSearchScope: "state",
};

function getStorage(): UserLocation | null {
  if (Platform.OS !== "web") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStorage(loc: UserLocation) {
  if (Platform.OS !== "web") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {}
}

export function getUserLocation(): UserLocation {
  return getStorage() ?? DEFAULT_LOCATION;
}

export function saveUserLocation(loc: Partial<UserLocation>) {
  const current = getUserLocation();
  const updated = { ...current, ...loc };
  setStorage(updated);
  return updated;
}

export function shouldShowCustomer(
  customer: { city?: string | null; state?: string | null },
  scope: LocationScope,
  userState: string | null,
  userCity: string | null,
): boolean {
  if (scope === "national") return true;

  if (scope === "state") {
    if (!userState) return true;
    if (!customer.state) return false;
    return customer.state.toLowerCase() === userState.toLowerCase();
  }

  if (scope === "city") {
    if (!userState || !userCity) return true;
    if (!customer.state || !customer.city) return false;
    return (
      customer.state.toLowerCase() === userState.toLowerCase() &&
      customer.city.toLowerCase() === userCity.toLowerCase()
    );
  }

  return true;
}

export function filterByLocation<T extends { city?: string | null; state?: string | null }>(
  items: T[],
  scope: LocationScope,
  userState: string | null,
  userCity: string | null,
): T[] {
  return items.filter((item) => shouldShowCustomer(item, scope, userState, userCity));
}

export function rankByLocalRelevance<T extends { city?: string | null; state?: string | null }>(
  items: T[],
  userState: string | null,
  userCity: string | null,
): T[] {
  if (!userCity && !userState) return items;
  return [...items].sort((a, b) => {
    const aScore = localScore(a, userState, userCity);
    const bScore = localScore(b, userState, userCity);
    return bScore - aScore;
  });
}

function localScore(
  item: { city?: string | null; state?: string | null },
  userState: string | null,
  userCity: string | null,
): number {
  let score = 0;
  if (userState && item.state?.toLowerCase() === userState.toLowerCase()) score += 1;
  if (userCity && item.city?.toLowerCase() === userCity.toLowerCase()) score += 2;
  return score;
}

export const SCOPE_OPTIONS: { key: LocationScope; label: string; shortLabel: string }[] = [
  { key: "city", label: "My City", shortLabel: "City" },
  { key: "state", label: "My State", shortLabel: "State" },
  { key: "national", label: "All States", shortLabel: "All" },
];
