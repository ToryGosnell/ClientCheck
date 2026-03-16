import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook for search and risk check functionality
 * Handles customer search, risk scoring, and pre-job risk checks
 */
export function useSearch() {
  // Search customers by query
  const searchQuery = trpc.customers.search.useQuery(
    { query: "" },
    { enabled: false }
  );

  // Get flagged customers (high risk)
  const flaggedQuery = trpc.customers.getFlagged.useQuery(
    undefined,
    { enabled: false }
  );

  // Get top rated customers (low risk)
  const topRatedQuery = trpc.customers.getTopRated.useQuery(
    undefined,
    { enabled: false }
  );

  // Get customer risk profile
  const riskProfileQuery = trpc.customers.getRiskProfile.useQuery(
    { customerId: 0 },
    { enabled: false }
  );

  // Run pre-job risk check
  const preJobRiskCheckMutation = trpc.risk.preJobRiskCheck.useMutation();

  const search = useCallback(
    async (query: string) => {
      if (query.length < 2) return [];
      return searchQuery.refetch({ query });
    },
    [searchQuery]
  );

  const getFlaggedCustomers = useCallback(async () => {
    return flaggedQuery.refetch();
  }, [flaggedQuery]);

  const getTopRatedCustomers = useCallback(async () => {
    return topRatedQuery.refetch();
  }, [topRatedQuery]);

  const getRiskProfile = useCallback(
    async (customerId: number) => {
      return riskProfileQuery.refetch({ customerId });
    },
    [riskProfileQuery]
  );

  const runPreJobRiskCheck = useCallback(
    async (customerId: number, jobAmount?: number) => {
      return preJobRiskCheckMutation.mutateAsync({
        customerId,
        jobAmount,
      });
    },
    [preJobRiskCheckMutation]
  );

  return {
    search,
    getFlaggedCustomers,
    getTopRatedCustomers,
    getRiskProfile,
    runPreJobRiskCheck,
    isSearching: searchQuery.isLoading,
    isFetchingFlagged: flaggedQuery.isLoading,
    isFetchingTopRated: topRatedQuery.isLoading,
    isRunningRiskCheck: preJobRiskCheckMutation.isPending,
    searchError: searchQuery.error,
    riskCheckError: preJobRiskCheckMutation.error,
  };
}
