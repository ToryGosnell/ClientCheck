/**
 * Demo mode seed data — used when EXPO_PUBLIC_DEMO_MODE=true.
 * Allows the app to function without a live backend for review/demo purposes.
 */

export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === "true";

export const DEMO_USER = {
  id: 1,
  openId: "demo-user-001",
  name: "Demo Contractor",
  email: "demo@clientcheck.app",
  loginMethod: "demo",
  role: "user" as const,
  lastSignedIn: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  termsAcceptedAt: new Date().toISOString(),
  privacyAcceptedAt: new Date().toISOString(),
  legalAcceptanceVersion: "2026-03",
};

const CUSTOMERS = [
  {
    id: 1, firstName: "Karen", lastName: "Mitchell", phone: null, email: null,
    address: "1423 Elm St", city: "Phoenix", state: "AZ", zipCode: "85001",
    overallRating: "2.10", totalReviews: 4, reviewCount: 4, riskLevel: "high" as const, ratingPaidOnTime: "1.50",
    ratingKnewWhatTheyWanted: "2.00", ratingProfessionalism: "2.50",
    ratingInvoiceAccuracy: "2.80", ratingWouldWorkAgain: "no",
    normalizedName: "karenmitchell", notes: null, greenFlags: null,
    redFlags: "Disputed invoice after work completed, Threatened negative review for discount",
    flagCount: 2, flaggedByContractors: 3,
    createdAt: new Date("2025-09-15"), updatedAt: new Date("2026-02-10"),
  },
  {
    id: 2, firstName: "James", lastName: "Henderson", phone: null, email: null,
    address: "892 Oak Ave", city: "Scottsdale", state: "AZ", zipCode: "85251",
    overallRating: "4.60", totalReviews: 7, reviewCount: 7, riskLevel: "low" as const, ratingPaidOnTime: "5.00",
    ratingKnewWhatTheyWanted: "4.20", ratingProfessionalism: "4.80",
    ratingInvoiceAccuracy: "4.50", ratingWouldWorkAgain: "yes",
    normalizedName: "jameshenderson", notes: null,
    greenFlags: "Always pays on time, Very organized project requirements",
    redFlags: null, flagCount: 0, flaggedByContractors: 0,
    createdAt: new Date("2025-06-20"), updatedAt: new Date("2026-03-01"),
  },
  {
    id: 3, firstName: "Lisa", lastName: "Nguyen", phone: null, email: null,
    address: "3201 Desert Bloom Dr", city: "Tempe", state: "AZ", zipCode: "85281",
    overallRating: "3.80", totalReviews: 3, reviewCount: 3, riskLevel: "medium" as const, ratingPaidOnTime: "4.00",
    ratingKnewWhatTheyWanted: "3.50", ratingProfessionalism: "4.00",
    ratingInvoiceAccuracy: "3.80", ratingWouldWorkAgain: "yes",
    normalizedName: "lisanguyen", notes: null,
    greenFlags: "Good communicator",
    redFlags: "Scope creep on larger projects",
    flagCount: 1, flaggedByContractors: 1,
    createdAt: new Date("2025-11-05"), updatedAt: new Date("2026-01-20"),
  },
  {
    id: 4, firstName: "Robert", lastName: "Davis", phone: null, email: null,
    address: "456 Cactus Ln", city: "Mesa", state: "AZ", zipCode: "85201",
    overallRating: "1.40", totalReviews: 5, reviewCount: 5, riskLevel: "high" as const, ratingPaidOnTime: "1.00",
    ratingKnewWhatTheyWanted: "1.50", ratingProfessionalism: "1.20",
    ratingInvoiceAccuracy: "2.00", ratingWouldWorkAgain: "no",
    normalizedName: "robertdavis", notes: null, greenFlags: null,
    redFlags: "No-show after scheduling, Refused to pay for completed work, Filed false complaint with BBB",
    flagCount: 3, flaggedByContractors: 4,
    createdAt: new Date("2025-04-10"), updatedAt: new Date("2026-03-05"),
  },
  {
    id: 5, firstName: "Sarah", lastName: "Thompson", phone: null, email: null,
    address: "7890 Sunrise Blvd", city: "Chandler", state: "AZ", zipCode: "85224",
    overallRating: "4.90", totalReviews: 12, reviewCount: 12, riskLevel: "low" as const, ratingPaidOnTime: "5.00",
    ratingKnewWhatTheyWanted: "4.80", ratingProfessionalism: "5.00",
    ratingInvoiceAccuracy: "4.80", ratingWouldWorkAgain: "yes",
    normalizedName: "sarahthompson", notes: null,
    greenFlags: "Excellent communicator, Provides clear project scope, Pays same day, Refers other clients",
    redFlags: null, flagCount: 0, flaggedByContractors: 0,
    createdAt: new Date("2025-03-01"), updatedAt: new Date("2026-03-10"),
  },
  {
    id: 6, firstName: "Michael", lastName: "Chen", phone: null, email: null,
    address: "321 Palo Verde St", city: "Gilbert", state: "AZ", zipCode: "85233",
    overallRating: "3.20", totalReviews: 2, reviewCount: 2, riskLevel: "medium" as const, ratingPaidOnTime: "3.00",
    ratingKnewWhatTheyWanted: "3.50", ratingProfessionalism: "3.00",
    ratingInvoiceAccuracy: "3.50", ratingWouldWorkAgain: "maybe",
    normalizedName: "michaelchen", notes: null,
    greenFlags: null, redFlags: "Slow to respond to messages",
    flagCount: 1, flaggedByContractors: 1,
    createdAt: new Date("2025-12-01"), updatedAt: new Date("2026-02-15"),
  },
  {
    id: 7, firstName: "Tony", lastName: "Ramirez", phone: null, email: null,
    address: "1100 Sunset Blvd", city: "Los Angeles", state: "CA", zipCode: "90028",
    overallRating: "1.90", totalReviews: 6, reviewCount: 6, riskLevel: "high" as const, ratingPaidOnTime: "1.00",
    ratingKnewWhatTheyWanted: "2.00", ratingProfessionalism: "1.50",
    ratingInvoiceAccuracy: "2.00", ratingWouldWorkAgain: "no",
    normalizedName: "tonyramirez", notes: null, greenFlags: null,
    redFlags: "Refused to pay after job completed, Verbal threats to contractor",
    flagCount: 3, flaggedByContractors: 5,
    createdAt: new Date("2025-08-01"), updatedAt: new Date("2026-02-20"),
  },
  {
    id: 8, firstName: "Sarah", lastName: "Kim", phone: null, email: null,
    address: "456 Market St", city: "San Francisco", state: "CA", zipCode: "94105",
    overallRating: "4.50", totalReviews: 3, reviewCount: 3, riskLevel: "low" as const, ratingPaidOnTime: "5.00",
    ratingKnewWhatTheyWanted: "4.00", ratingProfessionalism: "4.50",
    ratingInvoiceAccuracy: "4.50", ratingWouldWorkAgain: "yes",
    normalizedName: "sarahkim", notes: null,
    greenFlags: "Pays immediately, Great communicator",
    redFlags: null, flagCount: 0, flaggedByContractors: 0,
    createdAt: new Date("2025-10-10"), updatedAt: new Date("2026-01-15"),
  },
  {
    id: 9, firstName: "Derek", lastName: "Williams", phone: null, email: null,
    address: "789 Main St", city: "Houston", state: "TX", zipCode: "77002",
    overallRating: "2.30", totalReviews: 4, reviewCount: 4, riskLevel: "high" as const, ratingPaidOnTime: "1.50",
    ratingKnewWhatTheyWanted: "2.50", ratingProfessionalism: "2.00",
    ratingInvoiceAccuracy: "3.00", ratingWouldWorkAgain: "no",
    normalizedName: "derekwilliams", notes: null, greenFlags: null,
    redFlags: "Bounced check, Changed scope mid-project without paying",
    flagCount: 2, flaggedByContractors: 3,
    createdAt: new Date("2025-07-15"), updatedAt: new Date("2026-03-01"),
  },
  {
    id: 10, firstName: "Maria", lastName: "Gonzalez", phone: null, email: null,
    address: "2200 Congress Ave", city: "Austin", state: "TX", zipCode: "78701",
    overallRating: "4.70", totalReviews: 8, reviewCount: 8, riskLevel: "low" as const, ratingPaidOnTime: "5.00",
    ratingKnewWhatTheyWanted: "4.50", ratingProfessionalism: "4.80",
    ratingInvoiceAccuracy: "4.50", ratingWouldWorkAgain: "yes",
    normalizedName: "mariagonzalez", notes: null,
    greenFlags: "Excellent communicator, Always prepared, Pays on time",
    redFlags: null, flagCount: 0, flaggedByContractors: 0,
    createdAt: new Date("2025-05-20"), updatedAt: new Date("2026-02-28"),
  },
];

const REVIEWS = [
  {
    id: 1, customerId: 1, contractorUserId: 1, contractorName: "Mike's Plumbing",
    overallRating: "1.50", paidOnTime: "1.00", knewWhatTheyWanted: "2.00",
    professionalism: "2.00", invoiceAccuracy: "2.00", wouldWorkAgain: "no",
    reviewText: "Customer disputed the invoice after the job was 100% complete. Claimed work wasn't done to spec even though she signed off on it. Threatened to leave a bad review unless I gave a 40% discount. Would not work with again.",
    redFlags: "Disputed invoice after work completed, Threatened negative review for discount",
    greenFlags: null, isVerified: true, helpfulCount: 8,
    photos: null, voiceUrl: null, moderationStatus: "approved",
    createdAt: new Date("2025-10-01"), updatedAt: new Date("2025-10-01"),
  },
  {
    id: 2, customerId: 2, contractorUserId: 1, contractorName: "Mike's Plumbing",
    overallRating: "4.80", paidOnTime: "5.00", knewWhatTheyWanted: "4.50",
    professionalism: "5.00", invoiceAccuracy: "4.50", wouldWorkAgain: "yes",
    reviewText: "Great customer. Had a detailed plan for the bathroom remodel before I even showed up. Paid within 24 hours of completion. Would absolutely work with again.",
    redFlags: null,
    greenFlags: "Always pays on time, Very organized project requirements",
    isVerified: true, helpfulCount: 12,
    photos: null, voiceUrl: null, moderationStatus: "approved",
    createdAt: new Date("2025-07-15"), updatedAt: new Date("2025-07-15"),
  },
  {
    id: 3, customerId: 4, contractorUserId: 1, contractorName: "Mike's Plumbing",
    overallRating: "1.00", paidOnTime: "1.00", knewWhatTheyWanted: "1.00",
    professionalism: "1.00", invoiceAccuracy: "1.00", wouldWorkAgain: "no",
    reviewText: "Scheduled a full kitchen plumbing job. I cleared my schedule, bought materials, drove 45 minutes. Nobody home. Called — no answer. Texted — no response for 3 days. When he finally responded he said he 'changed his mind.' Total waste of time and money.",
    redFlags: "No-show after scheduling, Refused to pay for completed work",
    greenFlags: null, isVerified: true, helpfulCount: 15,
    photos: null, voiceUrl: null, moderationStatus: "approved",
    createdAt: new Date("2025-05-20"), updatedAt: new Date("2025-05-20"),
  },
  {
    id: 4, customerId: 5, contractorUserId: 1, contractorName: "Mike's Plumbing",
    overallRating: "5.00", paidOnTime: "5.00", knewWhatTheyWanted: "5.00",
    professionalism: "5.00", invoiceAccuracy: "5.00", wouldWorkAgain: "yes",
    reviewText: "Sarah is the best customer I've had in 15 years. Clear communication, reasonable expectations, pays immediately, and has referred me to 3 other clients. If every customer was like this, the industry would be a dream.",
    redFlags: null,
    greenFlags: "Excellent communicator, Provides clear project scope, Pays same day, Refers other clients",
    isVerified: true, helpfulCount: 22,
    photos: null, voiceUrl: null, moderationStatus: "approved",
    createdAt: new Date("2025-08-10"), updatedAt: new Date("2025-08-10"),
  },
  {
    id: 5, customerId: 3, contractorUserId: 1, contractorName: "Mike's Plumbing",
    overallRating: "3.50", paidOnTime: "4.00", knewWhatTheyWanted: "3.00",
    professionalism: "3.50", invoiceAccuracy: "4.00", wouldWorkAgain: "yes",
    reviewText: "Lisa was okay to work with overall. The project started as a simple faucet replacement and ended up being a full re-pipe. She kept adding things, but she did pay for everything in the end. Just be clear about scope upfront.",
    redFlags: "Scope creep on larger projects",
    greenFlags: "Good communicator",
    isVerified: true, helpfulCount: 5,
    photos: null, voiceUrl: null, moderationStatus: "approved",
    createdAt: new Date("2025-12-01"), updatedAt: new Date("2025-12-01"),
  },
  {
    id: 6, customerId: 1, contractorUserId: 2, contractorName: "Southwest Electric",
    overallRating: "2.00", paidOnTime: "2.00", knewWhatTheyWanted: "2.00",
    professionalism: "2.50", invoiceAccuracy: "3.00", wouldWorkAgain: "no",
    reviewText: "Had a similar experience as other contractors. She wanted a full panel upgrade, agreed on the price, then after the work was done she said it was 'too expensive' and only wanted to pay half. Had to threaten small claims court to get paid.",
    redFlags: "Disputed invoice after work completed",
    greenFlags: null, isVerified: true, helpfulCount: 6,
    photos: null, voiceUrl: null, moderationStatus: "approved",
    createdAt: new Date("2026-01-05"), updatedAt: new Date("2026-01-05"),
  },
  {
    id: 7, customerId: 7, contractorUserId: 1, contractorName: "LA Plumbing Pro",
    overallRating: "1.50", paidOnTime: "1.00", knewWhatTheyWanted: "2.00",
    professionalism: "1.00", invoiceAccuracy: "2.00", wouldWorkAgain: "no",
    reviewText: "Tony refused to pay after a full bathroom remodel. Got verbally aggressive when I asked about the remaining balance. Had to involve a lawyer.",
    redFlags: "Refused to pay after job completed, Verbal threats to contractor",
    greenFlags: null, isVerified: true, helpfulCount: 9,
    photos: null, voiceUrl: null, moderationStatus: "approved",
    createdAt: new Date("2025-09-10"), updatedAt: new Date("2025-09-10"),
  },
  {
    id: 8, customerId: 9, contractorUserId: 1, contractorName: "Houston HVAC Solutions",
    overallRating: "2.00", paidOnTime: "1.50", knewWhatTheyWanted: "2.50",
    professionalism: "2.00", invoiceAccuracy: "2.50", wouldWorkAgain: "no",
    reviewText: "Derek paid with a check that bounced, then changed the scope of the entire project halfway through without adjusting the budget. Very frustrating experience.",
    redFlags: "Bounced check, Changed scope mid-project without paying",
    greenFlags: null, isVerified: true, helpfulCount: 7,
    photos: null, voiceUrl: null, moderationStatus: "approved",
    createdAt: new Date("2025-08-15"), updatedAt: new Date("2025-08-15"),
  },
];

function toNum(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

function findCustomer(id: number) {
  return CUSTOMERS.find((c) => c.id === id) ?? null;
}

function enrichReviewsWithCustomerNames(reviews: typeof REVIEWS) {
  return reviews.map((r) => {
    const cust = findCustomer(r.customerId);
    return {
      ...r,
      customerFirstName: cust?.firstName ?? null,
      customerLastName: cust?.lastName ?? null,
      customerCity: cust?.city ?? null,
      customerState: cust?.state ?? null,
    };
  });
}

const MEMBERSHIP = {
  status: "active" as const,
  planType: "contractor_annual" as const,
  isActive: true,
  daysRemaining: 340,
  subscriptionStartedAt: new Date("2025-03-15").toISOString(),
  subscriptionEndsAt: new Date("2026-03-15").toISOString(),
  nextBillingDate: null,
  nextBillingAmount: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
};

const LEGAL_STATUS = {
  accepted: true,
  termsAcceptedAt: new Date().toISOString(),
  privacyAcceptedAt: new Date().toISOString(),
  version: "2026-03",
};

const SUBSCRIPTION_STATUS = {
  isActive: true,
  status: "active" as const,
  daysRemaining: 340,
  planType: "contractor_annual" as const,
};

/**
 * Maps tRPC procedure paths to mock response data.
 * Uses input to return the correct record instead of hardcoded fallbacks.
 */
export function getDemoResponse(procedure: string, _input?: unknown): unknown {
  const input = (_input ?? {}) as Record<string, unknown>;

  switch (procedure) {
    case "auth.me":
      return DEMO_USER;
    case "system.healthcheck":
      return { status: "ok", timestamp: new Date().toISOString() };

    case "customers.getFlagged":
      return CUSTOMERS.filter((c) => c.flagCount > 0);

    case "customers.search": {
      const q = (typeof input.query === "string" ? input.query : "").toLowerCase().trim();
      if (!q) return CUSTOMERS;
      return CUSTOMERS.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q) ||
        (c.normalizedName ?? "").includes(q)
      );
    }

    case "customers.getById": {
      const id = toNum(input.id) ?? toNum(input.customerId);
      if (id != null) {
        const found = findCustomer(id);
        if (found) return found;
      }
      return CUSTOMERS[0];
    }

    case "customers.create": {
      const fn = typeof input.firstName === "string" ? input.firstName : "New";
      const ln = typeof input.lastName === "string" ? input.lastName : "Customer";
      return { id: 99999, isNew: true, firstName: fn, lastName: ln };
    }
    case "customers.getRecent":
      return CUSTOMERS.slice(0, 5);
    case "customers.getTopRated":
      return CUSTOMERS.filter((c) => parseFloat(c.overallRating) >= 4);

    case "customers.getMyDirectoryInsights":
      return {
        matched: true,
        customerId: 2,
        directoryReviewCount: 1,
        contractorProfileViewCount: 3,
        criticalRedFlagCount: 0,
        directoryRiskLevel: "medium" as const,
        engineRiskScore: 55,
        engineRiskLevel: "high" as const,
      };

    case "customers.recordContractorProfileView":
      return { ok: true as const, contractorProfileViewCount: 4 };

    case "reviews.getById": {
      const rId = toNum(input.id) ?? toNum(input.reviewId);
      if (rId != null) {
        const found = REVIEWS.find((r) => r.id === rId);
        if (found) {
          return enrichReviewsWithCustomerNames([found])[0];
        }
      }
      return null;
    }

    case "reviews.getRecent":
      return enrichReviewsWithCustomerNames(REVIEWS);

    case "reviews.getForCustomer": {
      const cId = toNum(input.customerId);
      const filtered = cId != null
        ? REVIEWS.filter((r) => r.customerId === cId)
        : REVIEWS.slice(0, 3);
      return {
        reviews: enrichReviewsWithCustomerNames(filtered),
        aggregatedRatings: {},
      };
    }

    case "reviews.getMyReviews":
      return enrichReviewsWithCustomerNames(REVIEWS);
    case "reviews.markHelpful":
      return { success: true };
    case "reviews.create":
      return { reviewId: REVIEWS[0]?.id ?? 1, success: true as const };

    case "subscription.getMembership":
      return MEMBERSHIP;
    case "subscription.getStatus":
      return SUBSCRIPTION_STATUS;

    case "legal.getAcceptanceStatus":
      return LEGAL_STATUS;
    case "legal.acceptTerms":
      return { accepted: true, acceptedAt: new Date().toISOString(), version: "2026-03" };

    case "payments.verifyPayment":
      return { success: true };

    case "analytics.getMyAnalytics":
      return {
        totalReviews: REVIEWS.length,
        averageRating: 3.5,
        totalCustomers: CUSTOMERS.length,
        flaggedCustomers: CUSTOMERS.filter((c) => c.flagCount > 0).length,
        topRatedCustomer: CUSTOMERS.find((c) => parseFloat(c.overallRating) >= 4.5),
        riskBreakdown: { high: 1, medium: 2, low: 3 },
        monthlyReviews: [
          { month: "Jan", count: 2 },
          { month: "Feb", count: 1 },
          { month: "Mar", count: 3 },
        ],
        recentActivity: [],
      };
    case "analytics.recalculateAnalytics":
      return { success: true };

    case "contractor.getProfile":
      return {
        id: 1,
        userId: 1,
        businessName: "Mike's Plumbing",
        licenseNumber: "AZ-PLB-2024-1234",
        licenseState: "AZ",
        specialties: ["Plumbing", "Water Heaters", "Drain Cleaning"],
        yearsInBusiness: 15,
        serviceArea: "Phoenix Metro Area",
        phone: "(602) 555-0123",
        website: "https://mikesplumbing.example.com",
        bio: "Licensed plumber serving the Phoenix metro area for 15 years. Specializing in residential and commercial plumbing.",
        isVerified: true,
        verifiedAt: new Date("2025-03-01").toISOString(),
        createdAt: new Date("2025-02-15").toISOString(),
        updatedAt: new Date("2026-01-10").toISOString(),
      };
    case "contractor.upsertProfile":
      return { success: true };

    case "contractor.getReferralStats":
      return {
        referralCount: 2,
        verifiedReferralCount: 3,
        freeMonthsEarned: 0,
        nextReferralsUntilReward: 2,
        referralRewardUnseen: false,
        subscriptionExtendedUntil: null,
      };
    case "contractor.dismissReferralReward":
      return { ok: true as const };

    case "contractor.getReferralLeaderboardPreview":
      return {
        entries: [
          { rank: 1, displayName: "Summit Electric Co.", verifiedCount: 12 },
          { rank: 2, displayName: "Northside HVAC", verifiedCount: 8 },
          { rank: 3, displayName: "Alex M.", verifiedCount: 5 },
        ],
      };

    case "verification.submitLicenseNumber":
      return { success: true, status: "verified" };
    case "subscription.activateFreeYear":
      return { success: true };

    case "reviews.delete":
      return { success: true };

    default:
      return null;
  }
}
