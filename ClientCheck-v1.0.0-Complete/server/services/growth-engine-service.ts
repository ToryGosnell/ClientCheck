import { referrals, growthCampaigns, growthEvents } from "../../drizzle/schema";
import { getDb } from "../db";

export async function getGrowthDashboard() {
  const db = await getDb();
  if (!db) {
    return {
      activeCampaigns: 0,
      referralInvites: 0,
      completedReferrals: 0,
      conversionRate: 0,
      recentEvents: [],
      acquisitionChannels: []
    };
  }

  const [campaignRows, referralRows, growthRows] = await Promise.all([
    db.select().from(growthCampaigns),
    db.select().from(referrals),
    db.select().from(growthEvents),
  ]);

  const activeCampaigns = campaignRows.filter((c) => c.status === "active").length;
  const referralInvites = referralRows.length;
  const completedReferrals = referralRows.filter((r) => r.status === "completed").length;
  const conversionRate = referralInvites === 0 ? 0 : Math.round((completedReferrals / referralInvites) * 100);

  const acquisitionChannels = campaignRows.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    channel: campaign.channel,
    status: campaign.status,
    incentiveType: campaign.incentiveType,
  }));

  return {
    activeCampaigns,
    referralInvites,
    completedReferrals,
    conversionRate,
    recentEvents: growthRows.slice(-20).reverse(),
    acquisitionChannels,
  };
}

export async function createGrowthCampaign(input: {
  name: string;
  channel: "referral" | "sms" | "email" | "paid_social" | "organic" | "supply_house";
  incentiveType?: "free_month" | "credit" | "badge" | "contest";
  budgetCents?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(growthCampaigns).values({
    name: input.name,
    channel: input.channel,
    incentiveType: input.incentiveType ?? "free_month",
    budgetCents: input.budgetCents ?? 0,
    status: "draft",
  });
  return { success: true };
}
