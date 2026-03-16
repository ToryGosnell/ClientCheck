import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook for third-party integration management
 * Handles import jobs, history, and statistics
 */
export function useIntegrations() {
  // Create import job
  const createJobMutation = trpc.integrations.createImportJob.useMutation();

  // Get import job details
  const jobDetailsQuery = trpc.integrations.getImportJobDetails.useQuery(
    { jobId: 0 },
    { enabled: false }
  );

  // Get import history
  const historyQuery = trpc.integrations.getImportHistory.useQuery(
    { integrationId: 0, limit: 50 },
    { enabled: false }
  );

  // Get import statistics
  const statsQuery = trpc.integrations.getImportStats.useQuery(
    { integrationId: 0 },
    { enabled: false }
  );

  // Retry failed imports
  const retryMutation = trpc.integrations.retryFailedImports.useMutation();

  const createImportJob = useCallback(
    async (input: {
      integrationId: number;
      integrationName: "servicetitan" | "jobber" | "housecall_pro";
      externalJobId: string;
      jobData: Record<string, any>;
      metadata?: Record<string, any>;
    }) => {
      return createJobMutation.mutateAsync(input);
    },
    [createJobMutation]
  );

  const getJobDetails = useCallback(
    async (jobId: number) => {
      return jobDetailsQuery.refetch({ jobId });
    },
    [jobDetailsQuery]
  );

  const getImportHistory = useCallback(
    async (integrationId: number, limit: number = 50, status?: string) => {
      return historyQuery.refetch({
        integrationId,
        limit,
        status: status as any,
      });
    },
    [historyQuery]
  );

  const getImportStats = useCallback(
    async (integrationId: number) => {
      return statsQuery.refetch({ integrationId });
    },
    [statsQuery]
  );

  const retryFailedImports = useCallback(
    async (integrationId: number, maxAttempts: number = 3) => {
      return retryMutation.mutateAsync({ integrationId, maxAttempts });
    },
    [retryMutation]
  );

  return {
    createImportJob,
    getJobDetails,
    getImportHistory,
    getImportStats,
    retryFailedImports,
    isCreatingJob: createJobMutation.isPending,
    isFetchingDetails: jobDetailsQuery.isLoading,
    isFetchingHistory: historyQuery.isLoading,
    isFetchingStats: statsQuery.isLoading,
    isRetrying: retryMutation.isPending,
    createError: createJobMutation.error,
    detailsError: jobDetailsQuery.error,
    historyError: historyQuery.error,
    statsError: statsQuery.error,
    retryError: retryMutation.error,
  };
}
