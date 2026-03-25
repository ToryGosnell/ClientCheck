import { getPublicAppBaseUrl } from "@/lib/customer-share-link";

export function generateContractorReferralLink(userId: number): string {
  const base = getPublicAppBaseUrl();
  const uid = Math.floor(userId);
  return `${base}/invite?ref=${uid}`;
}
