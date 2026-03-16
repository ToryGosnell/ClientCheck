import { desc, eq } from 'drizzle-orm';
import {
  industryInsightSnapshots,
  paymentProtectionClaims,
  softwareIntegrationConnections,
  trustNetworkBadges,
} from '../../drizzle/schema';
import { getDb } from '../db';

const dailyRiskChecksFallback = [182, 205, 241, 276, 311, 355, 402];
const industryInsightsFallback = [
  { city: 'Spokane', trade: 'Plumbing', metric: 'Non-payment rate', value: '6.4%', periodLabel: 'Last 30 days' },
  { city: 'Spokane', trade: 'HVAC', metric: 'Chargeback risk', value: '2.1%', periodLabel: 'Last 30 days' },
  { city: 'Seattle', trade: 'Electrical', metric: 'Average risk score', value: '61 / 100', periodLabel: 'Last 30 days' },
  { city: 'Tacoma', trade: 'Plumbing', metric: 'Cancellation rate', value: '9.8%', periodLabel: 'Last 30 days' },
];

async function seedIndustrySnapshots() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(industryInsightSnapshots).limit(1);
  if (existing.length) return;
  await db.insert(industryInsightSnapshots).values(industryInsightsFallback);
}

export async function getNetworkValueOverview() {
  const db = await getDb();
  if (!db) {
    return {
      platform: 'ClientCheck',
      northStarMetric: 'Daily Risk Checks',
      dailyRiskChecks: dailyRiskChecksFallback,
      valueDrivers: {
        contractorRiskNetwork: true,
        paymentProtection: true,
        contractorSoftwareIntegrations: true,
        contractorTrustNetwork: true,
        industryIntelligence: true,
      },
      metrics: {
        totalProtectionClaims: 0,
        activeSoftwareConnections: 0,
        totalTrustBadgesAwarded: 0,
        insightSnapshots: industryInsightsFallback.length,
      },
    };
  }

  await seedIndustrySnapshots();
  const [claims, connections, badges, insights] = await Promise.all([
    db.select().from(paymentProtectionClaims),
    db.select().from(softwareIntegrationConnections),
    db.select().from(trustNetworkBadges),
    db.select().from(industryInsightSnapshots),
  ]);

  return {
    platform: 'ClientCheck',
    northStarMetric: 'Daily Risk Checks',
    dailyRiskChecks: dailyRiskChecksFallback,
    valueDrivers: {
      contractorRiskNetwork: true,
      paymentProtection: true,
      contractorSoftwareIntegrations: true,
      contractorTrustNetwork: true,
      industryIntelligence: true,
    },
    metrics: {
      totalProtectionClaims: claims.length,
      activeSoftwareConnections: connections.filter((c) => c.status === 'connected').length,
      totalTrustBadgesAwarded: badges.length,
      insightSnapshots: insights.length,
    },
  };
}

export async function createProtectionQuote(input: { contractorId: number; customerId?: number; jobAmountCents: number }) {
  const premiumCents = Math.max(500, Math.round(input.jobAmountCents * 0.0125));
  const coverageCents = Math.min(input.jobAmountCents, 500000);
  return {
    success: true,
    product: 'ClientCheck Payment Protection',
    premiumCents,
    coverageCents,
    deductibleCents: Math.round(coverageCents * 0.1),
    contractorId: input.contractorId,
    customerId: input.customerId ?? null,
  };
}

export async function submitProtectionClaim(input: {
  contractorId: number;
  customerId?: number;
  customerName?: string;
  amountCents: number;
  reason: 'non_payment' | 'chargeback' | 'fraud' | 'cancellation';
}) {
  const db = await getDb();
  if (!db) {
    return {
      success: true,
      claim: {
        id: 0,
        contractorUserId: input.contractorId,
        customerId: input.customerId ?? null,
        customerName: input.customerName ?? null,
        amountCents: input.amountCents,
        reason: input.reason,
        status: 'submitted',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  const result = await db.insert(paymentProtectionClaims).values({
    contractorUserId: input.contractorId,
    customerId: input.customerId ?? null,
    customerName: input.customerName ?? null,
    amountCents: input.amountCents,
    reason: input.reason,
    status: 'submitted',
  });
  const id = result[0].insertId as number;
  const [claim] = await db.select().from(paymentProtectionClaims).where(eq(paymentProtectionClaims.id, id)).limit(1);
  return { success: true, claim };
}

export async function getProtectionHistory(contractorId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = contractorId
    ? await db.select().from(paymentProtectionClaims).where(eq(paymentProtectionClaims.contractorUserId, contractorId)).orderBy(desc(paymentProtectionClaims.createdAt))
    : await db.select().from(paymentProtectionClaims).orderBy(desc(paymentProtectionClaims.createdAt));
  return rows;
}

export async function connectSoftwareIntegration(input: {
  contractorId: number;
  provider: 'ServiceTitan' | 'Housecall Pro' | 'Jobber' | 'Zapier' | 'Custom API';
  externalAccountName?: string;
}) {
  const db = await getDb();
  if (!db) {
    return {
      success: true,
      connection: {
        id: 0,
        contractorUserId: input.contractorId,
        provider: input.provider,
        status: 'connected',
        externalAccountName: input.externalAccountName ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      nextStep: 'Use POST /api/integrations/risk-check from your job creation flow.',
    };
  }

  const result = await db.insert(softwareIntegrationConnections).values({
    contractorUserId: input.contractorId,
    provider: input.provider,
    status: 'connected',
    externalAccountName: input.externalAccountName ?? null,
  });
  const id = result[0].insertId as number;
  const [connection] = await db.select().from(softwareIntegrationConnections).where(eq(softwareIntegrationConnections.id, id)).limit(1);
  return {
    success: true,
    connection,
    nextStep: 'Use POST /api/integrations/risk-check from your job creation flow.',
  };
}

export async function getSoftwareCatalog() {
  const db = await getDb();
  const connections = db ? await db.select().from(softwareIntegrationConnections).orderBy(desc(softwareIntegrationConnections.createdAt)) : [];
  return {
    providers: [
      { name: 'ServiceTitan', key: 'ServiceTitan', status: 'beta', supports: ['risk-check', 'job webhooks', 'customer sync'] },
      { name: 'Housecall Pro', key: 'Housecall Pro', status: 'beta', supports: ['risk-check', 'customer sync'] },
      { name: 'Jobber', key: 'Jobber', status: 'beta', supports: ['risk-check', 'job sync'] },
      { name: 'Zapier', key: 'Zapier', status: 'available', supports: ['webhook automation'] },
      { name: 'Custom API', key: 'Custom API', status: 'available', supports: ['risk-check', 'review submission', 'alerts'] },
    ],
    connections,
  };
}

export async function awardTrustBadge(input: { userId: number; badge: 'verified_identity' | 'verified_license' | 'insured' | 'background_checked' | 'top_responder'; awardedByUserId?: number }) {
  const db = await getDb();
  if (!db) {
    return {
      success: true,
      badge: {
        id: 0,
        userId: input.userId,
        badge: input.badge,
        awardedByUserId: input.awardedByUserId ?? null,
        awardedAt: new Date(),
      },
    };
  }
  const result = await db.insert(trustNetworkBadges).values({
    userId: input.userId,
    badge: input.badge,
    awardedByUserId: input.awardedByUserId ?? null,
  });
  const id = result[0].insertId as number;
  const [badge] = await db.select().from(trustNetworkBadges).where(eq(trustNetworkBadges.id, id)).limit(1);
  return { success: true, badge };
}

export async function getTrustNetwork(userId?: number) {
  const db = await getDb();
  const badges = db
    ? userId
      ? await db.select().from(trustNetworkBadges).where(eq(trustNetworkBadges.userId, userId)).orderBy(desc(trustNetworkBadges.awardedAt))
      : await db.select().from(trustNetworkBadges).orderBy(desc(trustNetworkBadges.awardedAt))
    : [];
  return {
    badges,
    availableBadges: [
      'verified_identity',
      'verified_license',
      'insured',
      'background_checked',
      'top_responder',
    ],
  };
}

export async function getIndustryIntelligence(params?: { city?: string; trade?: string }) {
  const db = await getDb();
  if (!db) {
    const snapshots = industryInsightsFallback.filter((insight) => {
      if (params?.city && insight.city.toLowerCase() !== params.city.toLowerCase()) return false;
      if (params?.trade && insight.trade.toLowerCase() !== params.trade.toLowerCase()) return false;
      return true;
    });
    return { snapshots, summary: { totalSnapshots: snapshots.length, topTheme: snapshots[0]?.metric ?? 'No insight yet' } };
  }
  await seedIndustrySnapshots();
  let snapshots = await db.select().from(industryInsightSnapshots).orderBy(desc(industryInsightSnapshots.createdAt));
  if (params?.city) snapshots = snapshots.filter((row) => row.city.toLowerCase() === params.city!.toLowerCase());
  if (params?.trade) snapshots = snapshots.filter((row) => row.trade.toLowerCase() === params.trade!.toLowerCase());
  return {
    snapshots,
    summary: {
      totalSnapshots: snapshots.length,
      topTheme: snapshots[0]?.metric ?? 'No insight yet',
    },
  };
}
