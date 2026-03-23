/**
 * Client-side Algolia customer search (search-only API key — never admin key).
 * Falls back to tRPC when not configured or when callers catch errors.
 */
import { algoliasearch } from "algoliasearch";
import type { Customer } from "@/drizzle/schema";

function algoliaSearchKey(): string {
  return (
    process.env.EXPO_PUBLIC_ALGOLIA_SEARCH_API_KEY ||
    process.env.EXPO_PUBLIC_ALGOLIA_SEARCH_KEY ||
    ""
  );
}

export function isAlgoliaClientSearchConfigured(): boolean {
  const appId = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID ?? "";
  const key = algoliaSearchKey();
  const index = process.env.EXPO_PUBLIC_ALGOLIA_CUSTOMERS_INDEX_NAME ?? "";
  return !!(appId && key && index);
}

function algoliaHitToCustomer(hit: Record<string, unknown>): Customer {
  const id = Number(hit.id);
  return {
    id,
    firstName: String(hit.firstName ?? ""),
    lastName: String(hit.lastName ?? ""),
    phone: String(hit.phone ?? ""),
    email: hit.email != null ? String(hit.email) : null,
    address: "",
    city: String(hit.city ?? ""),
    state: String(hit.state ?? ""),
    zip: "",
    normalizedName: null,
    normalizedPhone: null,
    normalizedEmail: null,
    normalizedAddressKey: null,
    searchText: null,
    mergedIntoId: null,
    isDuplicate: false,
    overallRating: String(hit.overallRating ?? "0"),
    calculatedOverallScore: String(hit.calculatedOverallScore ?? "0"),
    reviewCount: Number(hit.reviewCount ?? 0),
    wouldWorkAgainYesCount: 0,
    wouldWorkAgainNoCount: Number(hit.wouldWorkAgainNoCount ?? 0),
    wouldWorkAgainNaCount: 0,
    redFlagCount: 0,
    criticalRedFlagCount: Number(hit.criticalRedFlagCount ?? 0),
    greenFlagCount: 0,
    ratingPaymentReliability: "0.00",
    ratingCommunication: "0.00",
    ratingScopeChanges: "0.00",
    ratingPropertyRespect: "0.00",
    ratingPermitPulling: "0.00",
    ratingOverallJobExperience: "0.00",
    riskLevel: (hit.riskLevel as Customer["riskLevel"]) ?? "unknown",
    createdByUserId: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  } as Customer;
}

export async function searchCustomersViaAlgolia(input: {
  query: string;
  state?: string;
  hitsPerPage: number;
}): Promise<Customer[]> {
  if (!isAlgoliaClientSearchConfigured()) {
    throw new Error("Algolia client search is not configured");
  }

  const appId = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID as string;
  const searchKey = algoliaSearchKey();
  const indexName = process.env.EXPO_PUBLIC_ALGOLIA_CUSTOMERS_INDEX_NAME as string;

  const client = algoliasearch(appId, searchKey);

  const state = input.state?.trim();
  const filters =
    state && state.length === 2 ? `state:${state.toUpperCase()}` : undefined;

  const res = await client.searchSingleIndex<Record<string, unknown>>({
    indexName,
    searchParams: {
      query: input.query.trim(),
      hitsPerPage: input.hitsPerPage,
      ...(filters ? { filters } : {}),
    },
  });

  return (res.hits ?? []).map((h) => algoliaHitToCustomer(h as Record<string, unknown>));
}
