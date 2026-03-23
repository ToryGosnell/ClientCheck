import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const RECENT_SEARCHES_KEY = "cc_recent_searches";
const WATCHED_CUSTOMERS_KEY = "cc_watched_customers";
const ALERTS_KEY = "cc_customer_alerts";
const WATCH_SNAPSHOTS_KEY = "cc_watch_snapshots";
const WATCH_LAST_SYNC_KEY = "cc_watch_last_sync_ms";
const MAX_RECENT = 10;

export interface RecentSearch {
  query: string;
  timestamp: number;
}

export interface WatchedCustomer {
  id: number;
  firstName: string;
  lastName: string;
  riskLevel: string;
  overallRating: string;
  city?: string;
  state?: string;
  addedAt: number;
}

/** Latest metrics used to diff and create in-app alerts for saved customers */
export interface WatchSnapshotState {
  reviewCount: number;
  disputeCount: number;
  customerScore: number;
  anyReviewUnderReview: boolean;
}

// ── Native in-memory cache (hydrated from AsyncStorage) ────────────────────
let memWatched: WatchedCustomer[] | null = null;
let memRecent: RecentSearch[] | null = null;
let memAlerts: CustomerAlert[] | null = null;
let memSnapshots: Record<string, WatchSnapshotState> | null = null;
let memLastWatchSync: number | null = null;

function webGet(key: string): string | null {
  if (Platform.OS !== "web") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function webSet(key: string, value: string) {
  if (Platform.OS !== "web") return;
  try {
    localStorage.setItem(key, value);
  } catch {}
}

async function nativeSet(key: string, value: string) {
  if (Platform.OS === "web") return;
  await AsyncStorage.setItem(key, value);
}

/**
 * Load persisted user-data on native (call once from root layout).
 */
export async function hydrateUserDataFromDevice(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  const [w, r, a, snap, sync] = await Promise.all([
    AsyncStorage.getItem(WATCHED_CUSTOMERS_KEY),
    AsyncStorage.getItem(RECENT_SEARCHES_KEY),
    AsyncStorage.getItem(ALERTS_KEY),
    AsyncStorage.getItem(WATCH_SNAPSHOTS_KEY),
    AsyncStorage.getItem(WATCH_LAST_SYNC_KEY),
  ]);
  try {
    memWatched = w ? JSON.parse(w) : [];
  } catch {
    memWatched = [];
  }
  try {
    memRecent = r ? JSON.parse(r) : [];
  } catch {
    memRecent = [];
  }
  try {
    memAlerts = a ? JSON.parse(a) : [];
  } catch {
    memAlerts = [];
  }
  try {
    memSnapshots = snap ? JSON.parse(snap) : {};
  } catch {
    memSnapshots = {};
  }
  memLastWatchSync = sync ? parseInt(sync, 10) || 0 : 0;
}

export function getRecentSearches(): RecentSearch[] {
  if (Platform.OS === "web") {
    const raw = webGet(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return memRecent ?? [];
}

export function addRecentSearch(query: string) {
  const searches = getRecentSearches().filter((s) => s.query !== query);
  searches.unshift({ query, timestamp: Date.now() });
  const sliced = searches.slice(0, MAX_RECENT);
  const ser = JSON.stringify(sliced);
  if (Platform.OS === "web") {
    webSet(RECENT_SEARCHES_KEY, ser);
  } else {
    memRecent = sliced;
    void nativeSet(RECENT_SEARCHES_KEY, ser);
  }
}

export function getWatchedCustomers(): WatchedCustomer[] {
  if (Platform.OS === "web") {
    const raw = webGet(WATCHED_CUSTOMERS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return memWatched ?? [];
}

export function isWatching(customerId: number): boolean {
  return getWatchedCustomers().some((c) => c.id === customerId);
}

export function toggleWatch(customer: WatchedCustomer): boolean {
  const list = [...getWatchedCustomers()];
  const idx = list.findIndex((c) => c.id === customer.id);
  let added: boolean;
  if (idx >= 0) {
    list.splice(idx, 1);
    added = false;
  } else {
    list.unshift(customer);
    added = true;
  }
  const ser = JSON.stringify(list);
  if (Platform.OS === "web") {
    webSet(WATCHED_CUSTOMERS_KEY, ser);
  } else {
    memWatched = list;
    void nativeSet(WATCHED_CUSTOMERS_KEY, ser);
  }
  return added;
}

// ── Customer Alerts ───────────────────────────────────────────────────────

export type AlertType = "new_review" | "dispute" | "score_change" | "moderation_status";

export interface CustomerAlert {
  id: string;
  customerId: number;
  customerName: string;
  type: AlertType;
  message: string;
  timestamp: number;
  read: boolean;
  /** Visual emphasis in UI (disputes / score drops). Optional for older stored alerts. */
  priority?: "high" | "standard";
}

function persistAlerts(list: CustomerAlert[]) {
  const ser = JSON.stringify(list.slice(0, 50));
  if (Platform.OS === "web") {
    webSet(ALERTS_KEY, ser);
  } else {
    memAlerts = list.slice(0, 50);
    void nativeSet(ALERTS_KEY, ser);
  }
}

export function getAlerts(): CustomerAlert[] {
  if (Platform.OS === "web") {
    const raw = webGet(ALERTS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return memAlerts ?? [];
}

export function addAlert(alert: Omit<CustomerAlert, "id" | "timestamp" | "read">): void {
  const list = getAlerts();
  list.unshift({
    ...alert,
    id: `${alert.customerId}_${alert.type}_${Date.now()}`,
    timestamp: Date.now(),
    read: false,
  });
  persistAlerts(list);
}

export function markAlertRead(alertId: string): void {
  const list = getAlerts();
  const item = list.find((a) => a.id === alertId);
  if (item) item.read = true;
  persistAlerts(list);
}

export function markAllAlertsRead(): void {
  const list = getAlerts();
  list.forEach((a) => {
    a.read = true;
  });
  persistAlerts(list);
}

export function getUnreadAlertCount(): number {
  return getAlerts().filter((a) => !a.read).length;
}

// ── Watch snapshots (retention diff) ──────────────────────────────────────

function persistSnapshots(map: Record<string, WatchSnapshotState>) {
  const ser = JSON.stringify(map);
  if (Platform.OS === "web") {
    webSet(WATCH_SNAPSHOTS_KEY, ser);
  } else {
    memSnapshots = { ...map };
    void nativeSet(WATCH_SNAPSHOTS_KEY, ser);
  }
}

export function getWatchSnapshot(customerId: number): WatchSnapshotState | undefined {
  let map: Record<string, WatchSnapshotState>;
  if (Platform.OS === "web") {
    const raw = webGet(WATCH_SNAPSHOTS_KEY);
    if (!raw) return undefined;
    try {
      map = JSON.parse(raw);
    } catch {
      return undefined;
    }
  } else {
    map = memSnapshots ?? {};
  }
  return map[String(customerId)];
}

export function setWatchSnapshot(customerId: number, state: WatchSnapshotState): void {
  let map: Record<string, WatchSnapshotState>;
  if (Platform.OS === "web") {
    const raw = webGet(WATCH_SNAPSHOTS_KEY);
    try {
      map = raw ? JSON.parse(raw) : {};
    } catch {
      map = {};
    }
  } else {
    map = { ...(memSnapshots ?? {}) };
  }
  map[String(customerId)] = state;
  if (Platform.OS !== "web") memSnapshots = map;
  persistSnapshots(map);
}

export function getLastWatchAlertsSyncMs(): number {
  if (Platform.OS === "web") {
    const raw = webGet(WATCH_LAST_SYNC_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  }
  return memLastWatchSync ?? 0;
}

export function setLastWatchAlertsSyncMs(t: number): void {
  const s = String(t);
  if (Platform.OS === "web") {
    webSet(WATCH_LAST_SYNC_KEY, s);
  } else {
    memLastWatchSync = t;
    void nativeSet(WATCH_LAST_SYNC_KEY, s);
  }
}

export function shouldThrottleWatchAutoSync(minIntervalMs: number): boolean {
  return Date.now() - getLastWatchAlertsSyncMs() < minIntervalMs;
}
