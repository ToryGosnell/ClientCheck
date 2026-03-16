import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook for review submission and management
 * Handles review creation, fraud detection, and history
 */
export function useReviews() {
  // Create new review
  const createReviewMutation = trpc.reviews.create.useMutation();

  // Get review history for customer
  const reviewHistoryQuery = trpc.reviews.getHistory.useQuery(
    { customerId: 0 },
    { enabled: false }
  );

  // Get fraud signals for review
  const fraudSignalsQuery = trpc.fraud.getSignals.useQuery(
    { reviewId: 0 },
    { enabled: false }
  );

  // Record fraud signal
  const recordFraudSignalMutation = trpc.fraud.recordSignal.useMutation();

  // Get customer fraud stats
  const fraudStatsQuery = trpc.fraud.getCustomerStats.useQuery(
    { customerId: 0 },
    { enabled: false }
  );

  const submitReview = useCallback(
    async (input: {
      customerId: number;
      contractorUserId: number;
      overallRating: number;
      categoryRatings: Record<string, number>;
      reviewText: string;
      redFlags?: string[];
      tradeType?: string;
      jobAmount?: number;
    }) => {
      return createReviewMutation.mutateAsync({
        customerId: input.customerId,
        contractorUserId: input.contractorUserId,
        overallRating: input.overallRating,
        categoryRatings: input.categoryRatings,
        reviewText: input.reviewText,
        redFlags: input.redFlags || [],
        tradeType: input.tradeType,
        jobAmount: input.jobAmount,
      });
    },
    [createReviewMutation]
  );

  const getReviewHistory = useCallback(
    async (customerId: number) => {
      return reviewHistoryQuery.refetch({ customerId });
    },
    [reviewHistoryQuery]
  );

  const getFraudSignals = useCallback(
    async (reviewId: number) => {
      return fraudSignalsQuery.refetch({ reviewId });
    },
    [fraudSignalsQuery]
  );

  const recordFraudSignal = useCallback(
    async (input: {
      reviewId: number;
      customerId: number;
      contractorUserId: number;
      signals: string[];
      riskScore: number;
      flaggedForModeration: boolean;
    }) => {
      return recordFraudSignalMutation.mutateAsync(input);
    },
    [recordFraudSignalMutation]
  );

  const getFraudStats = useCallback(
    async (customerId: number) => {
      return fraudStatsQuery.refetch({ customerId });
    },
    [fraudStatsQuery]
  );

  return {
    submitReview,
    getReviewHistory,
    getFraudSignals,
    recordFraudSignal,
    getFraudStats,
    isSubmitting: createReviewMutation.isPending,
    isFetchingHistory: reviewHistoryQuery.isLoading,
    isFetchingSignals: fraudSignalsQuery.isLoading,
    isFetchingStats: fraudStatsQuery.isLoading,
    isRecordingSignal: recordFraudSignalMutation.isPending,
    submitError: createReviewMutation.error,
    historyError: reviewHistoryQuery.error,
    signalsError: fraudSignalsQuery.error,
    statsError: fraudStatsQuery.error,
  };
}
