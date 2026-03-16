import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SearchFilters {
  tradeType?: string;
  minRating?: number;
  maxRating?: number;
  paymentStatus?: "all" | "paid-on-time" | "paid-late" | "never-paid";
  sortBy?: "rating" | "recent" | "most-reviewed";
  hasRedFlags?: boolean;
  isVerified?: boolean;
}

const STORAGE_KEY = "@contractor_vet_search_filters";

/**
 * Save search filters to AsyncStorage
 */
export async function saveSearchFilters(filters: SearchFilters): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error("Error saving search filters:", error);
  }
}

/**
 * Load search filters from AsyncStorage
 */
export async function loadSearchFilters(): Promise<SearchFilters | null> {
  try {
    const filters = await AsyncStorage.getItem(STORAGE_KEY);
    return filters ? JSON.parse(filters) : null;
  } catch (error) {
    console.error("Error loading search filters:", error);
    return null;
  }
}

/**
 * Clear saved search filters
 */
export async function clearSearchFilters(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing search filters:", error);
  }
}

/**
 * Merge new filters with existing ones
 */
export async function mergeSearchFilters(
  newFilters: Partial<SearchFilters>
): Promise<SearchFilters> {
  const existing = await loadSearchFilters();
  const merged = { ...existing, ...newFilters };
  await saveSearchFilters(merged);
  return merged;
}

/**
 * Get default filters
 */
export function getDefaultFilters(): SearchFilters {
  return {
    tradeType: undefined,
    minRating: 1,
    maxRating: 5,
    paymentStatus: "all",
    sortBy: "recent",
    hasRedFlags: false,
    isVerified: false,
  };
}
