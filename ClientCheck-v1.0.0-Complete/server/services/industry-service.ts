import { getDb } from "../db";
import { contractorIndustries, contractorProfiles } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export type IndustryType =
  | "plumbing"
  | "hvac"
  | "electrical"
  | "roofing"
  | "carpentry"
  | "painting"
  | "landscaping"
  | "general_contractor"
  | "masonry"
  | "drywall"
  | "flooring"
  | "tile"
  | "plumbing_hvac"
  | "plumbing_electrical"
  | "hvac_electrical"
  | "multi_trade";

export const INDUSTRY_LABELS: Record<IndustryType, string> = {
  plumbing: "Plumbing",
  hvac: "HVAC",
  electrical: "Electrical",
  roofing: "Roofing",
  carpentry: "Carpentry",
  painting: "Painting",
  landscaping: "Landscaping",
  general_contractor: "General Contractor",
  masonry: "Masonry",
  drywall: "Drywall",
  flooring: "Flooring",
  tile: "Tile",
  plumbing_hvac: "Plumbing & HVAC",
  plumbing_electrical: "Plumbing & Electrical",
  hvac_electrical: "HVAC & Electrical",
  multi_trade: "Multi-Trade",
};

export const PRIORITY_INDUSTRIES = ["plumbing", "hvac", "electrical"];

/**
 * Add an industry specialization for a contractor
 */
export async function addContractorIndustry(
  contractorUserId: number,
  industry: IndustryType,
  yearsExperience?: number,
  certifications?: string[],
  isPrimary: boolean = false
) {
  const db = await getDb();
  if (!db) return [] as any;
  // If this is primary, unset other primary industries
  if (isPrimary) {
    await db
      .update(contractorIndustries)
      .set({ isPrimary: false })
      .where(eq(contractorIndustries.contractorUserId, contractorUserId));
  }

  return await db.insert(contractorIndustries).values({
    contractorUserId,
    industry,
    yearsExperience,
    certifications: certifications ? JSON.stringify(certifications) : null,
    isPrimary,
  });
}

/**
 * Get all industries for a contractor
 */
export async function getContractorIndustries(contractorUserId: number) {
  const db = await getDb();
  if (!db) return [] as any;
  const industries = await db
    .select()
    .from(contractorIndustries)
    .where(eq(contractorIndustries.contractorUserId, contractorUserId));

  return industries.map((ind) => ({
    ...ind,
    label: INDUSTRY_LABELS[ind.industry],
    certifications: ind.certifications ? JSON.parse(ind.certifications) : [],
  }));
}

/**
 * Get primary industry for a contractor
 */
export async function getPrimaryIndustry(contractorUserId: number) {
  const db = await getDb();
  if (!db) return [] as any;
  const industries = await db
    .select()
    .from(contractorIndustries)
    .where(
      and(
        eq(contractorIndustries.contractorUserId, contractorUserId),
        eq(contractorIndustries.isPrimary, true)
      )
    )
    .limit(1);

  if (industries.length === 0) return null;

  const ind = industries[0];
  return {
    ...ind,
    label: INDUSTRY_LABELS[ind.industry],
    certifications: ind.certifications ? JSON.parse(ind.certifications) : [],
  };
}

/**
 * Update contractor profile trade field based on primary industry
 */
export async function syncTradeFromIndustry(contractorUserId: number) {
  const db = await getDb();
  if (!db) return;
  const primaryIndustry = await getPrimaryIndustry(contractorUserId);

  if (primaryIndustry) {
    await db
      .update(contractorProfiles)
      .set({ trade: primaryIndustry.label })
      .where(eq(contractorProfiles.userId, contractorUserId));
  }
}

/**
 * Search contractors by industry
 */
export async function searchContractorsByIndustry(
  industry: IndustryType,
  state?: string
) {
  const db = await getDb();
  if (!db) return [] as any;
  let query = db
    .select({
      contractorUserId: contractorIndustries.contractorUserId,
      industry: contractorIndustries.industry,
      yearsExperience: contractorIndustries.yearsExperience,
      isPrimary: contractorIndustries.isPrimary,
    })
    .from(contractorIndustries)
    .where(eq(contractorIndustries.industry, industry));

  if (state) {
    query = query.innerJoin(
      contractorProfiles,
      eq(contractorProfiles.userId, contractorIndustries.contractorUserId)
    );
  }

  const results = await query;
  return results;
}

/**
 * Get industry statistics
 */
export async function getIndustryStats() {
  const db = await getDb();
  if (!db) return [] as any;
  const stats: Record<IndustryType, number> = {} as Record<IndustryType, number>;

  for (const industry of Object.keys(INDUSTRY_LABELS) as IndustryType[]) {
    const count = await db
      .select()
      .from(contractorIndustries)
      .where(eq(contractorIndustries.industry, industry));

    stats[industry] = count.length;
  }

  return stats;
}
