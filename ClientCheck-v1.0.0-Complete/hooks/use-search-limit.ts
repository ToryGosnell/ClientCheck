import { useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";

const STORAGE_KEY = "cc_search_usage";
const FREE_DAILY_LIMIT = 3;

interface UsageRecord {
  date: string;
  count: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUsage(): UsageRecord {
  if (Platform.OS !== "web") return { date: todayKey(), count: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), count: 0 };
    const parsed = JSON.parse(raw) as UsageRecord;
    if (parsed.date !== todayKey()) return { date: todayKey(), count: 0 };
    return parsed;
  } catch {
    return { date: todayKey(), count: 0 };
  }
}

function saveUsage(record: UsageRecord) {
  if (Platform.OS !== "web") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {}
}

/**
 * Tracks daily search usage for free-tier users.
 * isPaid users bypass the limit entirely.
 */
export function useSearchLimit(isPaid: boolean) {
  const [usage, setUsage] = useState<UsageRecord>(() => getUsage());

  useEffect(() => {
    setUsage(getUsage());
  }, []);

  const remaining = Math.max(0, FREE_DAILY_LIMIT - usage.count);
  const isLimited = !isPaid && remaining <= 0;

  const recordSearch = useCallback(() => {
    if (isPaid) return;
    const current = getUsage();
    const updated = { date: todayKey(), count: current.count + 1 };
    saveUsage(updated);
    setUsage(updated);
  }, [isPaid]);

  return {
    remaining,
    limit: FREE_DAILY_LIMIT,
    used: usage.count,
    isLimited,
    isPaid,
    recordSearch,
  };
}
