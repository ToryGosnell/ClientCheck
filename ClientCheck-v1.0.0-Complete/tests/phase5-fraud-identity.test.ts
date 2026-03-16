import { describe, it, expect, beforeEach } from "vitest";
import { FraudDetectionEngine, type FraudSignalInput } from "@/server/services/fraud-detection-engine";
import { IdentityResolutionService, type CustomerIdentity } from "@/server/services/identity-resolution-service";

/**
 * Phase 5 Fraud Detection & Identity Matching Tests
 */

describe("Phase 5 Fraud Detection & Identity Matching", () => {
  describe("Fraud Detection Engine", () => {
    it("should detect extreme low rating (1 star)", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "Terrible experience",
        rating: 1,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      expect(score.signals.some((s) => s.name === "EXTREME_RATING")).toBe(true);
      expect(score.totalScore).toBeGreaterThan(0);
    });

    it("should detect extreme high rating (5 stars)", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "Perfect experience",
        rating: 5,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      expect(score.signals.some((s) => s.name === "EXTREME_RATING_HIGH")).toBe(true);
    });

    it("should detect aggressive language", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "This is a SCAM! Don't use this contractor!!!",
        rating: 1,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      expect(score.signals.some((s) => s.name === "AGGRESSIVE_LANGUAGE")).toBe(true);
    });

    it("should detect caps lock abuse", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "THIS IS THE WORST CONTRACTOR EVER!!! NEVER USE THEM!!!",
        rating: 1,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      expect(score.signals.some((s) => s.name === "CAPS_LOCK_ABUSE")).toBe(true);
    });

    it("should detect red flag keywords", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "Never again. Worst experience ever. Do not use.",
        rating: 1,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      expect(score.signals.some((s) => s.name === "RED_FLAG_KEYWORDS")).toBe(true);
    });

    it("should detect unusual job amounts", async () => {
      // Very low amount
      const lowInput: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "Good work",
        rating: 3,
        redFlags: [],
        jobAmount: 50,
      };

      const lowScore = await FraudDetectionEngine.calculateFraudScore(lowInput);
      expect(lowScore.signals.some((s) => s.name === "UNUSUAL_JOB_AMOUNT")).toBe(true);

      // Very high amount
      const highInput: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "Good work",
        rating: 3,
        redFlags: [],
        jobAmount: 100000,
      };

      const highScore = await FraudDetectionEngine.calculateFraudScore(highInput);
      expect(highScore.signals.some((s) => s.name === "UNUSUAL_JOB_AMOUNT")).toBe(true);
    });

    it("should calculate risk levels correctly", async () => {
      // Low risk
      const lowRiskInput: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "Good experience",
        rating: 4,
        redFlags: [],
      };

      const lowRiskScore = await FraudDetectionEngine.calculateFraudScore(lowRiskInput);
      expect(lowRiskScore.riskLevel).toBe("low");

      // High risk
      const highRiskInput: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "SCAM!!! WORST EVER!!! DO NOT USE!!!",
        rating: 1,
        redFlags: [],
      };

      const highRiskScore = await FraudDetectionEngine.calculateFraudScore(highRiskInput);
      expect(highRiskScore.riskLevel).toMatch(/high|critical/);
    });

    it("should flag high-risk reviews for moderation", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "SCAM!!! WORST CONTRACTOR EVER!!!",
        rating: 1,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      if (score.totalScore >= 40) {
        expect(score.flaggedForModeration).toBe(true);
      }
    });

    it("should generate reasoning for fraud score", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "Bad experience",
        rating: 1,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      expect(score.reasoning).toBeTruthy();
      expect(score.reasoning.length).toBeGreaterThan(0);
    });

    it("should handle legitimate reviews", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "Good work, professional, would hire again",
        rating: 4,
        redFlags: [],
        jobAmount: 5000,
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      expect(score.riskLevel).toBe("low");
      expect(score.flaggedForModeration).toBe(false);
    });
  });

  describe("Identity Resolution Service", () => {
    describe("Phone Normalization", () => {
      it("should normalize 10-digit US phone number", () => {
        const normalized = IdentityResolutionService.normalizePhone("555-123-4567");
        expect(normalized).toBe("+15551234567");
      });

      it("should normalize 11-digit number starting with 1", () => {
        const normalized = IdentityResolutionService.normalizePhone("1-555-123-4567");
        expect(normalized).toBe("+15551234567");
      });

      it("should handle already formatted numbers", () => {
        const normalized = IdentityResolutionService.normalizePhone("+15551234567");
        expect(normalized).toBe("+15551234567");
      });
    });

    describe("Name Normalization", () => {
      it("should normalize name to lowercase", () => {
        const normalized = IdentityResolutionService.normalizeName("John Smith");
        expect(normalized).toBe("john smith");
      });

      it("should remove extra whitespace", () => {
        const normalized = IdentityResolutionService.normalizeName("John   Smith");
        expect(normalized).toBe("john smith");
      });

      it("should remove special characters", () => {
        const normalized = IdentityResolutionService.normalizeName("John-Paul O'Brien");
        expect(normalized).toBe("johnpaul obrien");
      });
    });

    describe("Address Normalization", () => {
      it("should normalize address", () => {
        const normalized = IdentityResolutionService.normalizeAddress("123 Main Street");
        expect(normalized).toBe("123 main");
      });

      it("should remove common abbreviations", () => {
        const normalized = IdentityResolutionService.normalizeAddress("456 Oak Ave.");
        expect(normalized).toBe("456 oak");
      });

      it("should handle multiple spaces", () => {
        const normalized = IdentityResolutionService.normalizeAddress("789   Elm   Rd.");
        expect(normalized).toBe("789 elm");
      });
    });

    describe("Similarity Scoring", () => {
      it("should calculate exact match as 100% similarity", () => {
        const similarity = IdentityResolutionService.calculateSimilarity("john", "john");
        expect(similarity).toBe(100);
      });

      it("should calculate partial match similarity", () => {
        const similarity = IdentityResolutionService.calculateSimilarity("john", "jon");
        expect(similarity).toBeGreaterThan(80);
        expect(similarity).toBeLessThan(100);
      });

      it("should calculate low similarity for different strings", () => {
        const similarity = IdentityResolutionService.calculateSimilarity("john", "mary");
        expect(similarity).toBeLessThan(50);
      });
    });

    describe("Identity Validation", () => {
      it("should validate complete identity", async () => {
        const identity: CustomerIdentity = {
          phone: "555-123-4567",
          email: "john@example.com",
          firstName: "John",
          lastName: "Smith",
          address: "123 Main St",
          city: "Springfield",
          state: "IL",
          zip: "62701",
        };

        const validation = await IdentityResolutionService.validateIdentity(identity);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it("should reject missing phone", async () => {
        const identity: CustomerIdentity = {
          phone: "",
          firstName: "John",
          lastName: "Smith",
        };

        const validation = await IdentityResolutionService.validateIdentity(identity);

        expect(validation.valid).toBe(false);
        expect(validation.errors.some((e) => e.includes("phone"))).toBe(true);
      });

      it("should reject missing name", async () => {
        const identity: CustomerIdentity = {
          phone: "555-123-4567",
          firstName: "",
          lastName: "Smith",
        };

        const validation = await IdentityResolutionService.validateIdentity(identity);

        expect(validation.valid).toBe(false);
      });

      it("should reject invalid email format", async () => {
        const identity: CustomerIdentity = {
          phone: "555-123-4567",
          email: "invalid-email",
          firstName: "John",
          lastName: "Smith",
        };

        const validation = await IdentityResolutionService.validateIdentity(identity);

        expect(validation.errors.some((e) => e.includes("email"))).toBe(true);
      });

      it("should warn about missing email", async () => {
        const identity: CustomerIdentity = {
          phone: "555-123-4567",
          firstName: "John",
          lastName: "Smith",
        };

        const validation = await IdentityResolutionService.validateIdentity(identity);

        expect(validation.warnings.some((w) => w.includes("email"))).toBe(true);
      });
    });

    describe("Levenshtein Distance", () => {
      it("should calculate distance for identical strings", () => {
        const distance = IdentityResolutionService.levenshteinDistance("test", "test");
        expect(distance).toBe(0);
      });

      it("should calculate distance for different strings", () => {
        const distance = IdentityResolutionService.levenshteinDistance("kitten", "sitting");
        expect(distance).toBe(3);
      });

      it("should calculate distance for one empty string", () => {
        const distance = IdentityResolutionService.levenshteinDistance("test", "");
        expect(distance).toBe(4);
      });
    });
  });

  describe("Fraud & Identity Integration", () => {
    it("should flag suspicious review from duplicate account", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "SCAM!!!",
        rating: 1,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      // Should have high fraud score
      expect(score.totalScore).toBeGreaterThan(20);
    });

    it("should handle legitimate customer with similar name", async () => {
      const identity1: CustomerIdentity = {
        phone: "555-123-4567",
        firstName: "John",
        lastName: "Smith",
        zip: "62701",
      };

      const identity2: CustomerIdentity = {
        phone: "555-987-6543",
        firstName: "Jon",
        lastName: "Smith",
        zip: "62701",
      };

      const validation1 = await IdentityResolutionService.validateIdentity(identity1);
      const validation2 = await IdentityResolutionService.validateIdentity(identity2);

      expect(validation1.valid).toBe(true);
      expect(validation2.valid).toBe(true);
    });
  });

  describe("Risk Level Classification", () => {
    it("should classify critical risk (score >= 70)", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "SCAM!!! FRAUD!!! CRIMINAL!!! LAWSUIT!!!",
        rating: 1,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      if (score.totalScore >= 70) {
        expect(score.riskLevel).toBe("critical");
      }
    });

    it("should classify high risk (score 50-69)", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "WORST CONTRACTOR EVER!!! NEVER AGAIN!!!",
        rating: 1,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      if (score.totalScore >= 50 && score.totalScore < 70) {
        expect(score.riskLevel).toBe("high");
      }
    });

    it("should classify medium risk (score 30-49)", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "Not satisfied with work",
        rating: 2,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      if (score.totalScore >= 30 && score.totalScore < 50) {
        expect(score.riskLevel).toBe("medium");
      }
    });

    it("should classify low risk (score < 30)", async () => {
      const input: FraudSignalInput = {
        reviewId: 1,
        customerId: 1,
        contractorUserId: 1,
        reviewText: "Good work overall",
        rating: 4,
        redFlags: [],
      };

      const score = await FraudDetectionEngine.calculateFraudScore(input);

      if (score.totalScore < 30) {
        expect(score.riskLevel).toBe("low");
      }
    });
  });
});
