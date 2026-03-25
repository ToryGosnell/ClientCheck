/**
 * Search ranking after SQL relevance fetch. Verified directory customers (identity match) get a boost.
 * `originalIndex` preserves base relevance order when scores tie (lower index = stronger SQL match).
 */

export const VERIFIED_CUSTOMER_SEARCH_RANK_BOOST = 20;

export type CustomerSearchRankInput = {
  reviewCount?: number | null;
  overallRating?: string | number | null;
  identityVerified?: boolean | null;
};

export function getCustomerRankingScore(customer: CustomerSearchRankInput, originalIndex: number): number {
  const reviewScore = Number(customer.reviewCount ?? 0);
  const rating = parseFloat(String(customer.overallRating ?? "0"));
  const ratingPart = Number.isFinite(rating) ? rating : 0;
  let score = reviewScore + ratingPart;
  if (customer.identityVerified) {
    score += VERIFIED_CUSTOMER_SEARCH_RANK_BOOST;
  }
  // Tie-break toward original SQL order (smaller index = better relevance)
  score -= originalIndex * 0.05;
  return score;
}

export function sortCustomersBySearchRanking<T extends CustomerSearchRankInput>(rows: T[]): T[] {
  return [...rows]
    .map((row, originalIndex) => ({ row, originalIndex }))
    .sort((a, b) => getCustomerRankingScore(b.row, b.originalIndex) - getCustomerRankingScore(a.row, a.originalIndex))
    .map(({ row }) => row);
}
