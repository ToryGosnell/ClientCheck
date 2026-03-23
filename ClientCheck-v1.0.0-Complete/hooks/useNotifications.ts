import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook for notification management
 * Handles notification history and delivery tracking
 */
export function useNotifications() {
  // Get notification history
  const historyQuery = trpc.notificationHistory.getHistory.useQuery({
    limit: 50,
  });

  const getHistory = useCallback(
    async () => {
      return historyQuery.refetch();
    },
    [historyQuery]
  );

  const refresh = useCallback(async () => {
    return historyQuery.refetch();
  }, [historyQuery]);

  return {
    notifications: historyQuery.data || [],
    getHistory,
    refresh,
    isLoading: historyQuery.isLoading,
    error: historyQuery.error,
    hasMore: (historyQuery.data?.length || 0) >= 50,
  };
}
