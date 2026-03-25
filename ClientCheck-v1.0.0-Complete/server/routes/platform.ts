import { Router } from "express";
import { eq } from "drizzle-orm";
import * as verification from "../contractor-verification-service";
import * as referrals from "../referral-rewards-service";
import * as beta from "../beta-program-service";
import * as emailVerification from "../email-verification-service";
import * as support from "../admin-contact-service";
import * as reactivation from "../reactivation-service";
import { runPartnerRiskCheck } from "../services/integration-risk-check-service";
import { getGrowthDashboard, createGrowthCampaign } from "../services/growth-engine-service";
import { createPartnerApiKey, getPartnerOverview } from "../services/partner-api-service";
import { getNetworkValueOverview, createProtectionQuote, submitProtectionClaim, getProtectionHistory, connectSoftwareIntegration, getSoftwareCatalog, awardTrustBadge, getTrustNetwork, getIndustryIntelligence } from "../services/network-value-service";
import { getCollectionsOverview, openCollectionCase, getDepositRecommendation, getBenchmarking, createSmartIntake, getSmartIntakeHistory, getReputationPassports, createPartnershipLead, getPartnershipHub, getEnterpriseOverview, createReviewClaim, getReviewClaims, getPredictiveTerritoryIntelligence, createPaymentControl, getPaymentControls } from "../services/enterprise-value-service";
import { attachMockAuth, authenticatePartnerApiKey, persistentRateLimit, requirePartnerScope, requireRole, requireUser, type AuthenticatedRequest } from "../services/authz";
import { writeAuditLog } from "../services/audit-log-service";
import { queueNotification, getNotificationStatus, listNotificationHistory } from "../services/notification-delivery-service";
import { findPotentialIdentityMatches, mergeCustomers, upsertCustomerIdentityProfile } from "../services/identity-resolution-service";
import { recordContractorInviteSignup } from "../contractor-invite-referral-service";
import { getDb, getWeeklyDistinctCustomerProfileViews, recordShareReferralOnce, searchCustomersApi } from "../db";
import { disputeEscalations, integrationUsageEvents, partnerApiKeyRotations, partnerApiKeyScopes, partnerApiKeys, reviewPolicyAcceptances } from "../../drizzle/schema";
import { createHash, randomBytes } from "crypto";

const router = Router();
router.use(attachMockAuth);

function jsonSafeForCustomerSearch(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return value.toString("utf8");
  return value;
}

/** Weekly distinct contractor views for share-modal social proof (authenticated). */
router.get("/customers/:customerId/view-stats", requireUser(), async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = Number(req.params.customerId);
    if (!Number.isFinite(customerId) || customerId < 1) {
      return res.status(400).json({ error: "Invalid customer id" });
    }
    const weeklyViews = await getWeeklyDistinctCustomerProfileViews(customerId);
    return res.status(200).json({ weeklyViews });
  } catch (error) {
    console.error("[GET /customers/:customerId/view-stats]", error);
    return res.status(500).json({ error: "Failed to load view stats" });
  }
});

/** Public customer name search (homepage / search tab) — GET /api/customers?search= */
router.get("/customers", async (req, res) => {
  try {
    const search = String(req.query.search ?? "").trim();
    if (search.length < 2) {
      return res.json({ results: [] });
    }
    const rows = await searchCustomersApi(search, 500);
    const body = JSON.stringify({ results: rows }, jsonSafeForCustomerSearch);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(body);
  } catch (error) {
    console.error("Customer search route error:", error);
    console.error("[GET /api/customers] Customer search failed — full error:", error);
    if (error instanceof Error) {
      console.error("[GET /api/customers] message:", error.message);
      console.error("[GET /api/customers] stack:\n", error.stack);
    }
    const my = error as { code?: string; sqlMessage?: string; errno?: number };
    if (my?.code || my?.sqlMessage) {
      console.error("[GET /api/customers] mysql:", { code: my.code, errno: my.errno, sqlMessage: my.sqlMessage });
    }
    return res.status(500).json({ error: "Customer search failed", results: [] });
  }
});

/** Contractor invite link (/invite?ref=) — record signup attribution once. */
router.post("/growth/record-contractor-invite-referral", requireUser(), async (req: AuthenticatedRequest, res) => {
  try {
    const referrerId = Number((req.body as { referrerId?: unknown })?.referrerId);
    if (!Number.isFinite(referrerId) || referrerId < 1) {
      return res.status(400).json({ ok: false, error: "referrerId is required" });
    }
    const referredUserId = req.auth!.userId!;
    const result = await recordContractorInviteSignup({ referredUserId, referrerId });
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (error) {
    console.error("[POST /growth/record-contractor-invite-referral]", error);
    return res.status(500).json({ ok: false, error: "Failed to record invite referral" });
  }
});

/** One-time attribution when a new session follows a shared customer link (`?ref=`). */
router.post("/growth/record-share-referral", requireUser(), async (req: AuthenticatedRequest, res) => {
  try {
    const referrerUserId = Number((req.body as { referrerUserId?: unknown })?.referrerUserId);
    if (!Number.isFinite(referrerUserId) || referrerUserId < 1) {
      return res.status(400).json({ ok: false, error: "referrerUserId is required" });
    }
    const userId = req.auth!.userId!;
    const result = await recordShareReferralOnce({ userId, referrerUserId });
    return res.status(200).json(result);
  } catch (error) {
    console.error("[POST /growth/record-share-referral]", error);
    return res.status(500).json({ ok: false, error: "Failed to record referral" });
  }
});

const CURRENT_REVIEW_POLICY_VERSION = "2026-03-14";

router.post("/legal/review-policy/accept", requireUser(), async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const userId = req.auth!.userId!;
    await db.insert(reviewPolicyAcceptances).values({
      userId,
      policyVersion: CURRENT_REVIEW_POLICY_VERSION,
      ipAddress: req.ip,
      userAgent: req.header("user-agent") || null,
    });
    await writeAuditLog({ actorUserId: userId, actorRole: req.auth?.role, action: "review_policy.accepted", entityType: "legal_policy", entityId: CURRENT_REVIEW_POLICY_VERSION, ipAddress: req.ip, userAgent: req.header("user-agent") || null });
    res.json({ success: true, policyVersion: CURRENT_REVIEW_POLICY_VERSION });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to accept review policy" });
  }
});

router.post("/verification/submit", requireUser(), persistentRateLimit("verification_submit", 10, 60), async (req: AuthenticatedRequest, res) => {
  try {
    const { documents } = req.body || {};
    const userId = Number(req.body?.userId || req.auth?.userId);
    if (!userId || !Array.isArray(documents) || documents.length === 0) return res.status(400).json({ error: "userId and documents are required" });
    res.json(await verification.submitVerificationDocuments(userId, documents));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit verification" });
  }
});

router.get("/verification/status", async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  res.json(await verification.getVerificationStatus(userId));
});

router.post("/verification/review", requireRole(["admin"]), persistentRateLimit("verification_review", 50, 60), async (req: AuthenticatedRequest, res) => {
  try {
    const { userId, decision, reviewedByUserId, notes } = req.body || {};
    const reviewerId = Number(reviewedByUserId || req.auth?.userId);
    if (!userId || !decision || !reviewerId) {
      return res.status(400).json({ error: "userId, decision and reviewedByUserId are required" });
    }
    const success = decision === "approve"
      ? await verification.approveVerification(Number(userId), reviewerId, notes)
      : await verification.rejectVerification(Number(userId), String(notes || "Rejected"), reviewerId);
    res.json({ success, userId: Number(userId), decision, reviewedByUserId: reviewerId, notes: notes || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to review verification" });
  }
});

router.get("/referrals/status", async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  const baseUrl = `${req.protocol}://${req.get("host")}/signup`;
  res.json({
    ...(await referrals.getReferralStatus(userId)),
    referralLink: await referrals.getUserReferralLink(userId, baseUrl),
    referrals: await referrals.getUserReferrals(userId),
  });
});

router.post("/referrals/invite", requireUser(), persistentRateLimit("referral_invite", 30, 60), async (req: AuthenticatedRequest, res) => {
  try {
    const { referrerId, email, referrerName, referrerEmail } = req.body || {};
    if (!referrerId || !email) return res.status(400).json({ error: "referrerId and email are required" });
    const tracked = await referrals.trackReferral(Number(referrerId), email);
    if (tracked.success && referrerName && referrerEmail) {
      const link = `${req.protocol}://${req.get("host")}/signup?ref=${tracked.referralCode}`;
      await referrals.sendReferralInvitation(referrerName, referrerEmail, email, link);
    }
    res.json(tracked);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to invite referral" });
  }
});

router.post("/beta/signup", async (req, res) => {
  try { res.json(await beta.submitBetaSignup(req.body || {})); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to submit beta signup" }); }
});

router.post("/beta/feedback", async (req, res) => {
  try { res.json(await beta.submitBetaFeedback(req.body || {})); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to submit beta feedback" }); }
});

router.post("/email/verify", async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "token is required" });
  res.json(await emailVerification.verifyEmailToken(String(token)));
});

router.post("/email/resend-verification", requireUser(), persistentRateLimit("email_verify_resend", 5, 60), async (req: AuthenticatedRequest, res) => {
  const { email, userId } = req.body || {};
  if (!email || !userId) return res.status(400).json({ error: "email and userId are required" });
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json({ success: await emailVerification.resendVerificationEmail(Number(userId), String(email), baseUrl) });
});

router.post("/contact", async (req, res) => {
  try {
    const { userId, userEmail, userName, subject, message, category, attachments } = req.body || {};
    if (!userId || !userEmail || !userName || !subject || !message) return res.status(400).json({ error: "Missing contact form fields" });
    res.json(await support.submitContactForm(Number(userId), String(userEmail), String(userName), String(subject), String(message), String(category || "general"), attachments));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit support request" });
  }
});

router.post("/notifications/queue", requireRole(["admin", "enterprise", "contractor"]), async (req: AuthenticatedRequest, res) => {
  const { userId, channel, templateKey, destination, payload } = req.body || {};
  if (!channel || !templateKey) return res.status(400).json({ error: "channel and templateKey are required" });
  const id = await queueNotification({ userId, channel, templateKey, destination, payload });
  res.json({ success: true, id });
});
router.get("/notifications/:id", requireUser(), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid notification id" });
  const status = await getNotificationStatus(id);
  if (!status) return res.status(404).json({ error: "Not found" });
  res.json(status);
});
router.get("/notifications", requireUser(), async (req: AuthenticatedRequest, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : req.auth?.userId;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  const history = await listNotificationHistory(userId, limit);
  res.json({ items: history, total: history.length });
});

router.post("/subscription/reactivate", async (req, res) => {
  try { res.json(await reactivation.reactivateSubscription(req.body || {})); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to reactivate subscription" }); }
});
router.post("/subscription/cancel", async (req, res) => {
  try { res.json(await reactivation.cancelSubscription(req.body || {})); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to cancel subscription" }); }
});
router.post("/subscription/feedback", async (req, res) => {
  try { res.json(await reactivation.saveCancellationFeedback(req.body || {})); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to save cancellation feedback" }); }
});

router.post("/integrations/risk-check", authenticatePartnerApiKey, requirePartnerScope("risk_check"), persistentRateLimit("partner_risk_check", 500, 60), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await runPartnerRiskCheck(req.body || {});
    const db = await getDb();
    if (db) {
      await db.insert(integrationUsageEvents).values({
        partnerApiKeyId: req.auth?.partnerApiKeyId ?? null,
        provider: req.auth?.partnerName ?? null,
        eventType: "risk_check",
        requestId: req.header("x-request-id") || randomBytes(8).toString("hex"),
        statusCode: 200,
        mode: req.auth?.mode || "sandbox",
        metadataJson: JSON.stringify({ body: req.body || {} }),
      });
    }
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Risk check failed" });
  }
});

router.get("/growth/dashboard", async (_req, res) => {
  try { res.json(await getGrowthDashboard()); } catch (error) { console.error(error); res.status(500).json({ error: "Failed to load growth dashboard" }); }
});
router.post("/growth/campaigns", requireRole(["admin", "enterprise"]), async (req, res) => {
  try {
    const { name, channel, incentiveType, budgetCents } = req.body || {};
    if (!name || !channel) return res.status(400).json({ error: "name and channel are required" });
    res.json(await createGrowthCampaign({ name, channel, incentiveType, budgetCents }));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to create campaign" }); }
});

router.get("/integrations/overview", requireRole(["admin", "enterprise"]), async (_req, res) => {
  try { res.json(await getPartnerOverview()); } catch (error) { console.error(error); res.status(500).json({ error: "Failed to load integration overview" }); }
});
router.post("/integrations/api-keys", requireRole(["admin", "enterprise"]), async (req, res) => {
  try {
    const { partnerName, contactEmail } = req.body || {};
    if (!partnerName) return res.status(400).json({ error: "partnerName is required" });
    res.json(await createPartnerApiKey(String(partnerName), contactEmail ? String(contactEmail) : undefined));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to create partner API key" }); }
});
router.post("/integrations/api-keys/:id/scopes", requireRole(["admin", "enterprise"]), async (req, res) => {
  try {
    const partnerApiKeyId = Number(req.params.id);
    const scopes: string[] = Array.isArray(req.body?.scopes) ? req.body.scopes : [];
    if (!partnerApiKeyId || !scopes.length) return res.status(400).json({ error: "id and scopes are required" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    for (const scope of scopes) await db.insert(partnerApiKeyScopes).values({ partnerApiKeyId, scope });
    res.json({ success: true, partnerApiKeyId, scopes });
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to assign scopes" }); }
});
router.post("/integrations/api-keys/:id/rotate", requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const rows = await db.select().from(partnerApiKeys).where(eq(partnerApiKeys.id, id)).limit(1);
    const existing = rows[0];
    if (!existing) return res.status(404).json({ error: "API key not found" });
    const rawKey = `cc_live_${randomBytes(24).toString("hex")}`;
    const newHash = createHash("sha256").update(rawKey).digest("hex");
    await db.insert(partnerApiKeyRotations).values({ partnerApiKeyId: id, rotatedByUserId: req.auth?.userId ?? null, oldKeyHash: existing.apiKeyHash, newKeyHash: newHash });
    await db.update(partnerApiKeys).set({ apiKeyHash: newHash, lastUsedAt: null }).where(eq(partnerApiKeys.id, id));
    res.json({ success: true, apiKey: rawKey, partnerApiKeyId: id });
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to rotate API key" }); }
});

router.get("/platform/overview", async (_req, res) => {
  try {
    const growth = await getGrowthDashboard();
    const integrations = await getPartnerOverview();
    res.json({
      platform: "ClientCheck",
      positioning: "Contractor risk intelligence",
      growth,
      integrations,
      productionReadiness: {
        riskScoringEngine: true,
        disputeSystem: true,
        fraudDetection: true,
        contractorVerification: true,
        growthEngine: true,
        integrationApi: true,
        authzAndAudit: true,
        notificationTracking: true,
        identityResolution: true,
      },
    });
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to load platform overview" }); }
});

router.get("/network-value/overview", async (_req, res) => {
  try { res.json(await getNetworkValueOverview()); } catch (error) { console.error(error); res.status(500).json({ error: "Failed to load network value overview" }); }
});
router.post("/payment-protection/quote", requireRole(["contractor", "enterprise", "admin"]), async (req, res) => {
  try {
    const { contractorId, customerId, jobAmountCents } = req.body || {};
    if (!contractorId || !jobAmountCents) return res.status(400).json({ error: "contractorId and jobAmountCents are required" });
    res.json(await createProtectionQuote({ contractorId: Number(contractorId), customerId: customerId ? Number(customerId) : undefined, jobAmountCents: Number(jobAmountCents) }));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to generate protection quote" }); }
});
router.post("/payment-protection/claims", requireRole(["contractor", "enterprise", "admin"]), async (req, res) => {
  try {
    const { contractorId, customerId, customerName, amountCents, reason } = req.body || {};
    if (!contractorId || !amountCents || !reason) return res.status(400).json({ error: "contractorId, amountCents and reason are required" });
    res.json(await submitProtectionClaim({ contractorId: Number(contractorId), customerId: customerId ? Number(customerId) : undefined, customerName: customerName ? String(customerName) : undefined, amountCents: Number(amountCents), reason }));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to submit protection claim" }); }
});
router.get("/payment-protection/history", async (req, res) => {
  try {
    const contractorId = req.query.contractorId ? Number(req.query.contractorId) : undefined;
    res.json(await getProtectionHistory(contractorId));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to load protection history" }); }
});

router.get("/integrations/software/catalog", async (_req, res) => {
  try { res.json(await getSoftwareCatalog()); } catch (error) { console.error(error); res.status(500).json({ error: "Failed to load software catalog" }); }
});
router.post("/integrations/software/connect", requireRole(["contractor", "enterprise", "admin"]), async (req, res) => {
  try {
    const { contractorId, provider, externalAccountName } = req.body || {};
    if (!contractorId || !provider) return res.status(400).json({ error: "contractorId and provider are required" });
    res.json(await connectSoftwareIntegration({ contractorId: Number(contractorId), provider, externalAccountName }));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to connect software integration" }); }
});

router.get("/trust-network", async (req, res) => {
  try { const userId = req.query.userId ? Number(req.query.userId) : undefined; res.json(await getTrustNetwork(userId)); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load trust network" }); }
});
router.post("/trust-network/award", requireRole(["admin", "enterprise"]), async (req, res) => {
  try {
    const { userId, badge } = req.body || {};
    if (!userId || !badge) return res.status(400).json({ error: "userId and badge are required" });
    res.json(await awardTrustBadge({ userId: Number(userId), badge }));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to award trust badge" }); }
});
router.get("/industry/intelligence", async (req, res) => {
  try { const city = req.query.city ? String(req.query.city) : undefined; const trade = req.query.trade ? String(req.query.trade) : undefined; res.json(await getIndustryIntelligence({ city, trade })); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load industry intelligence" }); }
});

router.get("/collections/overview", async (_req, res) => {
  try { res.json(await getCollectionsOverview()); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load collections overview" }); }
});
router.post("/collections/cases", requireRole(["contractor", "enterprise", "admin"]), async (req, res) => {
  try {
    const { contractorId, customerName, amountCents, stage } = req.body || {};
    if (!contractorId || !customerName || !amountCents) return res.status(400).json({ error: "contractorId, customerName and amountCents are required" });
    res.json(await openCollectionCase({ contractorId: Number(contractorId), customerName: String(customerName), amountCents: Number(amountCents), stage }));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to open collection case" }); }
});
router.get("/deposits/recommendation", async (req, res) => {
  try { const customerKey = String(req.query.customerKey || 'default-customer'); const riskScore = req.query.riskScore ? Number(req.query.riskScore) : undefined; res.json(await getDepositRecommendation({ customerKey, riskScore })); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load deposit recommendation" }); }
});
router.get("/benchmarking", async (req, res) => {
  try { const contractorId = req.query.contractorId ? Number(req.query.contractorId) : undefined; res.json(await getBenchmarking(contractorId)); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load benchmarking" }); }
});
router.post("/smart-intake", requireRole(["contractor", "enterprise", "admin"]), async (req, res) => {
  try {
    const { contractorId, customerName, jobType, notes } = req.body || {};
    if (!contractorId || !customerName || !jobType) return res.status(400).json({ error: "contractorId, customerName and jobType are required" });
    res.json(await createSmartIntake({ contractorId: Number(contractorId), customerName: String(customerName), jobType: String(jobType), notes: notes ? String(notes) : undefined }));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to create smart intake" }); }
});
router.get("/smart-intake/history", async (req, res) => {
  try { const contractorId = req.query.contractorId ? Number(req.query.contractorId) : undefined; res.json(await getSmartIntakeHistory(contractorId)); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load smart intake history" }); }
});
router.get("/reputation-passports", async (_req, res) => {
  try { res.json(await getReputationPassports()); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load reputation passports" }); }
});
router.get("/partnerships/hub", async (_req, res) => {
  try { res.json(await getPartnershipHub()); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load partnership hub" }); }
});
router.post("/partnerships/leads", requireRole(["admin", "enterprise"]), async (req, res) => {
  try {
    const { partnerType, organization, market } = req.body || {};
    if (!partnerType || !organization || !market) return res.status(400).json({ error: "partnerType, organization and market are required" });
    res.json(await createPartnershipLead({ partnerType, organization: String(organization), market: String(market) }));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to create partnership lead" }); }
});
router.get("/enterprise/overview", async (_req, res) => {
  try { res.json(await getEnterpriseOverview()); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load enterprise overview" }); }
});
router.post("/review-claims", requireRole(["contractor", "enterprise", "admin"]), async (req, res) => {
  try {
    const { reviewId, contractorId, path } = req.body || {};
    if (!reviewId || !contractorId || !path) return res.status(400).json({ error: "reviewId, contractorId and path are required" });
    res.json(await createReviewClaim({ reviewId: Number(reviewId), contractorId: Number(contractorId), path }));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to create review claim workflow" }); }
});
router.get("/review-claims", async (req, res) => {
  try { const contractorId = req.query.contractorId ? Number(req.query.contractorId) : undefined; res.json(await getReviewClaims(contractorId)); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load review claims" }); }
});
router.get("/territories/predictive-intelligence", async (req, res) => {
  try { const city = req.query.city ? String(req.query.city) : undefined; const trade = req.query.trade ? String(req.query.trade) : undefined; res.json(await getPredictiveTerritoryIntelligence({ city, trade })); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load predictive territory intelligence" }); }
});
router.post("/payment-controls", requireRole(["contractor", "enterprise", "admin"]), async (req, res) => {
  try {
    const { contractorId, customerName, milestoneBillingEnabled, signedApprovalRequired, financingOffered } = req.body || {};
    if (!contractorId || !customerName) return res.status(400).json({ error: "contractorId and customerName are required" });
    res.json(await createPaymentControl({ contractorId: Number(contractorId), customerName: String(customerName), milestoneBillingEnabled, signedApprovalRequired, financingOffered }));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to create payment control" }); }
});
router.get("/payment-controls", async (req, res) => {
  try { const contractorId = req.query.contractorId ? Number(req.query.contractorId) : undefined; res.json(await getPaymentControls(contractorId)); }
  catch (error) { console.error(error); res.status(500).json({ error: "Failed to load payment controls" }); }
});

router.post("/disputes/:disputeId/escalate", requireUser(), persistentRateLimit("dispute_escalate", 10, 60), async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const disputeId = Number(req.params.disputeId);
    const escalationType = String(req.body?.escalationType || "appeal");
    if (!disputeId) return res.status(400).json({ error: "Invalid dispute id" });
    const result = await db.insert(disputeEscalations).values({
      disputeId,
      escalatedByUserId: req.auth!.userId!,
      escalationType: escalationType as any,
      notes: req.body?.notes ? String(req.body.notes) : null,
    });
    res.json({ success: true, id: result[0].insertId });
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to escalate dispute" }); }
});

router.post("/identity/customers/:customerId/rebuild", requireRole(["admin", "enterprise"]), async (req, res) => {
  const customerId = Number(req.params.customerId);
  if (!customerId) return res.status(400).json({ error: "Invalid customer id" });
  const profile = await upsertCustomerIdentityProfile(customerId);
  const matches = await findPotentialIdentityMatches(customerId);
  res.json({ profile, matches });
});
router.post("/identity/customers/merge", requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
  try {
    const { sourceCustomerId, targetCustomerId, reason } = req.body || {};
    if (!sourceCustomerId || !targetCustomerId) return res.status(400).json({ error: "sourceCustomerId and targetCustomerId are required" });
    res.json(await mergeCustomers(Number(sourceCustomerId), Number(targetCustomerId), req.auth!.userId!, reason));
  } catch (error) { console.error(error); res.status(500).json({ error: "Failed to merge customers" }); }
});

export default router;
