
export type DisputeStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface Dispute {
  id:string;
  reviewId:string;
  customerId:string;
  contractorId:string;
  status:DisputeStatus;
}
