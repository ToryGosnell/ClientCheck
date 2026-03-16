import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook for referral program management
 * Handles referral invitations, tracking, and rewards
 */
export function useReferrals() {
  // Get referral status
  const statusQuery = trpc.referrals.getReferralStatus.useQuery();

  // Get referral rewards
  const rewardsQuery = trpc.referrals.getReferralRewards.useQuery();

  // Get user's referrals
  const referralsQuery = trpc.referrals.getUserReferrals.useQuery();

  // Send referral invitation
  const sendInvitationMutation = trpc.referrals.sendInvitation.useMutation();

  const getStatus = useCallback(async () => {
    return statusQuery.refetch();
  }, [statusQuery]);

  const getRewards = useCallback(async () => {
    return rewardsQuery.refetch();
  }, [rewardsQuery]);

  const getReferrals = useCallback(async () => {
    return referralsQuery.refetch();
  }, [referralsQuery]);

  const sendInvitation = useCallback(
    async (email: string) => {
      return sendInvitationMutation.mutateAsync({ email });
    },
    [sendInvitationMutation]
  );

  return {
    status: statusQuery.data,
    rewards: rewardsQuery.data,
    referrals: referralsQuery.data,
    getStatus,
    getRewards,
    getReferrals,
    sendInvitation,
    isLoadingStatus: statusQuery.isLoading,
    isLoadingRewards: rewardsQuery.isLoading,
    isLoadingReferrals: referralsQuery.isLoading,
    isSendingInvitation: sendInvitationMutation.isPending,
    statusError: statusQuery.error,
    rewardsError: rewardsQuery.error,
    referralsError: referralsQuery.error,
    invitationError: sendInvitationMutation.error,
  };
}
