import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook for admin moderation functionality
 * Handles review flagging, moderation queue, and review actions
 */
export function useModeration() {
  // Get flagged reviews for moderation
  const flaggedQuery = trpc.fraud.getFlaggedForModeration.useQuery({
    limit: 50,
  });

  // Mark fraud signal as reviewed
  const markReviewedMutation = trpc.fraud.markReviewed.useMutation();

  // Get customer fraud history
  const customerHistoryQuery = trpc.fraud.getCustomerFraudHistory.useQuery(
    { customerId: 0, limit: 50 },
    { enabled: false }
  );

  // Get contractor fraud history
  const contractorHistoryQuery = trpc.fraud.getContractorFraudHistory.useQuery(
    { contractorUserId: 0, limit: 50 },
    { enabled: false }
  );

  const getFlaggedReviews = useCallback(
    async (limit: number = 50) => {
      return flaggedQuery.refetch({ limit });
    },
    [flaggedQuery]
  );

  const markReviewed = useCallback(
    async (signalId: number, action: "approved" | "rejected" | "escalated") => {
      return markReviewedMutation.mutateAsync({ signalId, action });
    },
    [markReviewedMutation]
  );

  const getCustomerFraudHistory = useCallback(
    async (customerId: number, limit: number = 50) => {
      return customerHistoryQuery.refetch({ customerId, limit });
    },
    [customerHistoryQuery]
  );

  const getContractorFraudHistory = useCallback(
    async (contractorUserId: number, limit: number = 50) => {
      return contractorHistoryQuery.refetch({ contractorUserId, limit });
    },
    [contractorHistoryQuery]
  );

  return {
    flaggedReviews: flaggedQuery.data || [],
    getFlaggedReviews,
    markReviewed,
    getCustomerFraudHistory,
    getContractorFraudHistory,
    isLoadingFlagged: flaggedQuery.isLoading,
    isLoadingCustomerHistory: customerHistoryQuery.isLoading,
    isLoadingContractorHistory: contractorHistoryQuery.isLoading,
    isMarkingReviewed: markReviewedMutation.isPending,
    flaggedError: flaggedQuery.error,
    customerHistoryError: customerHistoryQuery.error,
    contractorHistoryError: contractorHistoryQuery.error,
    markReviewedError: markReviewedMutation.error,
  };
}
