import { desc, eq } from 'drizzle-orm';
import {
  collectionsCases,
  contractorBenchmarks,
  depositRecommendations,
  enterpriseAccounts,
  partnershipLeads,
  paymentControlRecords,
  reputationPassports,
  reviewClaimWorkflows,
  smartIntakeSessions,
  territoryPredictions,
} from '../../drizzle/schema';
import { getDb } from '../db';

const defaultBenchmarks = [
  { contractorUserId: 1, city: 'Spokane', trade: 'Plumbing', disputeRate: '2.40', cancellationRate: '5.20', latePayRate: '8.80', percentileRank: 82 },
  { contractorUserId: 2, city: 'Seattle', trade: 'HVAC', disputeRate: '3.10', cancellationRate: '6.90', latePayRate: '10.40', percentileRank: 75 },
];
const defaultPassports = [
  { customerKey: 'john-doe-spokane', label: 'Preferred Client', strengthsJson: JSON.stringify(['Pays on time', 'Approves change orders quickly']), visibility: 'shareable' as const },
  { customerKey: 'jane-smith-yakima', label: 'Verified Homeowner', strengthsJson: JSON.stringify(['Easy scheduling', 'Strong communication']), visibility: 'private' as const },
];
const defaultTerritories = [
  { zipCode: '99201', city: 'Spokane', trade: 'Plumbing', chargebackRisk: '2.10', cancellationRate: '6.40', paymentStrength: 'High', trend: 'up' as const },
  { zipCode: '99207', city: 'Spokane', trade: 'HVAC', chargebackRisk: '3.80', cancellationRate: '8.90', paymentStrength: 'Medium', trend: 'up' as const },
  { zipCode: '98103', city: 'Seattle', trade: 'Electrical', chargebackRisk: '1.70', cancellationRate: '4.10', paymentStrength: 'High', trend: 'flat' as const },
];
const defaultEnterprise = [
  { companyName: 'Cascade Home Services', branchCount: 4, seats: 36, crmIntegration: 'ServiceTitan', status: 'pilot' as const },
];
const defaultPartnerships = [
  { partnerType: 'supply_house' as const, organization: 'Inland Supply', market: 'Spokane', status: 'prospect' as const },
  { partnerType: 'association' as const, organization: 'Northwest Plumbing Association', market: 'Washington', status: 'active' as const },
];

function parseJsonArray(value?: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

async function seedDefaults() {
  const db = await getDb();
  if (!db) return;
  if ((await db.select().from(contractorBenchmarks).limit(1)).length === 0) {
    await db.insert(contractorBenchmarks).values(defaultBenchmarks);
  }
  if ((await db.select().from(reputationPassports).limit(1)).length === 0) {
    await db.insert(reputationPassports).values(defaultPassports);
  }
  if ((await db.select().from(territoryPredictions).limit(1)).length === 0) {
    await db.insert(territoryPredictions).values(defaultTerritories);
  }
  if ((await db.select().from(enterpriseAccounts).limit(1)).length === 0) {
    await db.insert(enterpriseAccounts).values(defaultEnterprise);
  }
  if ((await db.select().from(partnershipLeads).limit(1)).length === 0) {
    await db.insert(partnershipLeads).values(defaultPartnerships);
  }
}

export async function getCollectionsOverview() {
  const db = await getDb();
  if (!db) {
    return {
      activeCases: 0,
      recoveredDollarsCents: 0,
      stages: ['reminder', 'demand_letter', 'payment_plan', 'collections_partner', 'resolved'],
      cases: [],
    };
  }
  const cases = await db.select().from(collectionsCases).orderBy(desc(collectionsCases.createdAt));
  return {
    activeCases: cases.filter((c) => c.stage !== 'resolved').length,
    recoveredDollarsCents: cases.filter((c) => c.stage === 'resolved').reduce((sum, c) => sum + c.amountCents, 0),
    stages: ['reminder', 'demand_letter', 'payment_plan', 'collections_partner', 'resolved'],
    cases,
  };
}

export async function openCollectionCase(input: { contractorId: number; customerName: string; amountCents: number; stage?: 'reminder' | 'demand_letter' | 'payment_plan' | 'collections_partner' | 'resolved' }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(collectionsCases).values({
    contractorUserId: input.contractorId,
    customerName: input.customerName,
    amountCents: input.amountCents,
    stage: input.stage ?? 'reminder',
  });
  const id = result[0].insertId as number;
  const [entry] = await db.select().from(collectionsCases).where(eq(collectionsCases.id, id)).limit(1);
  return { success: true, case: entry };
}

export async function getDepositRecommendation(input: { customerKey: string; riskScore?: number }) {
  const db = await getDb();
  const riskScore = input.riskScore ?? 48;
  const recommendation = riskScore >= 70
    ? { customerKey: input.customerKey, riskScore, riskLevel: 'low' as const, recommendedDepositPercent: 0, recommendedPaymentPlan: 'on_completion' as const }
    : riskScore >= 40
      ? { customerKey: input.customerKey, riskScore, riskLevel: 'medium' as const, recommendedDepositPercent: 25, recommendedPaymentPlan: '50_50' as const }
      : { customerKey: input.customerKey, riskScore, riskLevel: 'high' as const, recommendedDepositPercent: 50, recommendedPaymentPlan: 'deposit_plus_milestones' as const };
  if (db) {
    await db.insert(depositRecommendations).values(recommendation);
  }
  return recommendation;
}

export async function getBenchmarking(contractorId?: number) {
  const db = await getDb();
  if (!db) {
    const snapshot = defaultBenchmarks.find((b) => b.contractorUserId === contractorId) ?? defaultBenchmarks[0];
    return {
      snapshot: snapshot ? { ...snapshot, contractorId: snapshot.contractorUserId, percentile: snapshot.percentileRank } : null,
      topMetrics: {
        bestNeighborhood: 'South Hill',
        highestCancelZone: 'North Spokane',
        strongestPaymentZone: 'Liberty Lake',
      },
    };
  }
  await seedDefaults();
  const snapshots = contractorId
    ? await db.select().from(contractorBenchmarks).where(eq(contractorBenchmarks.contractorUserId, contractorId)).orderBy(desc(contractorBenchmarks.createdAt))
    : await db.select().from(contractorBenchmarks).orderBy(desc(contractorBenchmarks.createdAt));
  const snapshot = snapshots[0] ?? null;
  return {
    snapshot: snapshot ? { ...snapshot, contractorId: snapshot.contractorUserId, percentile: snapshot.percentileRank } : null,
    topMetrics: {
      bestNeighborhood: 'South Hill',
      highestCancelZone: 'North Spokane',
      strongestPaymentZone: 'Liberty Lake',
    },
  };
}

export async function createSmartIntake(input: { contractorId: number; customerName: string; jobType: string; notes?: string }) {
  const redFlags = [
    'Asks for same-day work without clear scope',
    'Avoids written approvals',
  ];
  if ((input.notes || '').toLowerCase().includes('cash')) redFlags.push('Insists on unusual payment terms');
  const recommendedTerms = [
    'Signed scope before scheduling',
    'Deposit based on risk score',
    'Photo approval checkpoint before extras',
  ];
  const scriptPrompts = [
    'Can you confirm decision-maker authority on site?',
    'Will you approve written change orders before work begins?',
    'What payment method will you use at completion?',
  ];
  const db = await getDb();
  if (!db) {
    return {
      success: true,
      intake: {
        id: 0,
        contractorId: input.contractorId,
        customerName: input.customerName,
        jobType: input.jobType,
        scriptPrompts,
        redFlags,
        recommendedTerms,
        createdAt: new Date().toISOString(),
      },
    };
  }
  const result = await db.insert(smartIntakeSessions).values({
    contractorUserId: input.contractorId,
    customerName: input.customerName,
    jobType: input.jobType,
    notes: input.notes ?? null,
    redFlagsJson: JSON.stringify(redFlags),
    recommendedTermsJson: JSON.stringify(recommendedTerms),
  });
  const id = result[0].insertId as number;
  const [entry] = await db.select().from(smartIntakeSessions).where(eq(smartIntakeSessions.id, id)).limit(1);
  return {
    success: true,
    intake: {
      id: entry?.id ?? id,
      contractorId: entry?.contractorUserId ?? input.contractorId,
      customerName: entry?.customerName ?? input.customerName,
      jobType: entry?.jobType ?? input.jobType,
      scriptPrompts,
      redFlags: parseJsonArray(entry?.redFlagsJson),
      recommendedTerms: parseJsonArray(entry?.recommendedTermsJson),
      createdAt: entry?.createdAt?.toISOString?.() ?? new Date().toISOString(),
    },
  };
}

export async function getSmartIntakeHistory(contractorId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = contractorId
    ? await db.select().from(smartIntakeSessions).where(eq(smartIntakeSessions.contractorUserId, contractorId)).orderBy(desc(smartIntakeSessions.createdAt))
    : await db.select().from(smartIntakeSessions).orderBy(desc(smartIntakeSessions.createdAt));
  return rows.map((entry) => ({
    id: entry.id,
    contractorId: entry.contractorUserId,
    customerName: entry.customerName,
    jobType: entry.jobType,
    redFlags: parseJsonArray(entry.redFlagsJson),
    recommendedTerms: parseJsonArray(entry.recommendedTermsJson),
    createdAt: entry.createdAt,
  }));
}

export async function getReputationPassports() {
  const db = await getDb();
  if (!db) {
    return {
      passports: defaultPassports.map((p, idx) => ({ id: idx + 1, customerKey: p.customerKey, label: p.label, strengths: parseJsonArray(p.strengthsJson), visibility: p.visibility, updatedAt: new Date().toISOString() })),
      framing: 'Positive customer profiles reduce PR and legal risk while highlighting trustworthy clients.',
    };
  }
  await seedDefaults();
  const rows = await db.select().from(reputationPassports).orderBy(desc(reputationPassports.updatedAt));
  return {
    passports: rows.map((row) => ({ ...row, strengths: parseJsonArray(row.strengthsJson) })),
    framing: 'Positive customer profiles reduce PR and legal risk while highlighting trustworthy clients.',
  };
}

export async function createPartnershipLead(input: { partnerType: 'supply_house' | 'association' | 'insurance' | 'franchise' | 'financing'; organization: string; market: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(partnershipLeads).values({
    partnerType: input.partnerType,
    organization: input.organization,
    market: input.market,
    status: 'prospect',
  });
  const id = result[0].insertId as number;
  const [lead] = await db.select().from(partnershipLeads).where(eq(partnershipLeads.id, id)).limit(1);
  return { success: true, lead };
}

export async function getPartnershipHub() {
  const db = await getDb();
  if (!db) return { leads: [], channels: ['supply_house', 'association', 'insurance', 'franchise', 'financing'] };
  await seedDefaults();
  const leads = await db.select().from(partnershipLeads).orderBy(desc(partnershipLeads.createdAt));
  return {
    leads,
    channels: ['supply_house', 'association', 'insurance', 'franchise', 'financing'],
  };
}

export async function getEnterpriseOverview() {
  const db = await getDb();
  if (!db) return { accounts: [], capabilities: ['branch-level analytics', 'team seats', 'CRM integrations', 'custom reporting', 'internal rules engine'] };
  await seedDefaults();
  const accounts = await db.select().from(enterpriseAccounts).orderBy(desc(enterpriseAccounts.createdAt));
  return {
    accounts,
    capabilities: [
      'branch-level analytics',
      'team seats',
      'CRM integrations',
      'custom reporting',
      'internal rules engine',
    ],
  };
}

export async function createReviewClaim(input: { reviewId: number; contractorId: number; path: 'case' | 'dispute' | 'demand_notice' | 'payment_protection_claim' }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(reviewClaimWorkflows).values({
    reviewId: input.reviewId,
    contractorUserId: input.contractorId,
    path: input.path,
  });
  const id = result[0].insertId as number;
  const [claim] = await db.select().from(reviewClaimWorkflows).where(eq(reviewClaimWorkflows.id, id)).limit(1);
  return { success: true, claim };
}

export async function getReviewClaims(contractorId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = contractorId
    ? await db.select().from(reviewClaimWorkflows).where(eq(reviewClaimWorkflows.contractorUserId, contractorId)).orderBy(desc(reviewClaimWorkflows.createdAt))
    : await db.select().from(reviewClaimWorkflows).orderBy(desc(reviewClaimWorkflows.createdAt));
  return rows.map((row) => ({ ...row, contractorId: row.contractorUserId }));
}

export async function getPredictiveTerritoryIntelligence(params?: { city?: string; trade?: string }) {
  const db = await getDb();
  if (!db) {
    const insights = defaultTerritories.filter((item) => {
      if (params?.city && item.city.toLowerCase() !== params.city.toLowerCase()) return false;
      if (params?.trade && item.trade.toLowerCase() !== params.trade.toLowerCase()) return false;
      return true;
    });
    return {
      insights,
      recommendation: insights[0] ? `Marketing spend is safest in ${insights[0].city} ${insights[0].zipCode}.` : 'Add more territory data.',
    };
  }
  await seedDefaults();
  let insights = await db.select().from(territoryPredictions).orderBy(desc(territoryPredictions.createdAt));
  if (params?.city) insights = insights.filter((item) => item.city.toLowerCase() === params.city!.toLowerCase());
  if (params?.trade) insights = insights.filter((item) => item.trade.toLowerCase() === params.trade!.toLowerCase());
  return {
    insights,
    recommendation: insights[0] ? `Marketing spend is safest in ${insights[0].city} ${insights[0].zipCode}.` : 'Add more territory data.',
  };
}

export async function createPaymentControl(input: { contractorId: number; customerName: string; milestoneBillingEnabled?: boolean; signedApprovalRequired?: boolean; financingOffered?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(paymentControlRecords).values({
    contractorUserId: input.contractorId,
    customerName: input.customerName,
    depositLinkIssued: true,
    milestoneBillingEnabled: Boolean(input.milestoneBillingEnabled),
    signedApprovalRequired: Boolean(input.signedApprovalRequired),
    financingOffered: Boolean(input.financingOffered),
  });
  const id = result[0].insertId as number;
  const [paymentControl] = await db.select().from(paymentControlRecords).where(eq(paymentControlRecords.id, id)).limit(1);
  return { success: true, paymentControl };
}

export async function getPaymentControls(contractorId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = contractorId
    ? await db.select().from(paymentControlRecords).where(eq(paymentControlRecords.contractorUserId, contractorId)).orderBy(desc(paymentControlRecords.createdAt))
    : await db.select().from(paymentControlRecords).orderBy(desc(paymentControlRecords.createdAt));
  return rows.map((row) => ({ ...row, contractorId: row.contractorUserId }));
}
