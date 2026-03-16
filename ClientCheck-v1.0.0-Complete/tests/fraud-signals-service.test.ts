import { describe, it, expect, beforeEach } from "vitest";
import * as fraudService from "../server/services/fraud-signals-service";

describe("Fraud Signals Service", () => {
  describe("recordFraudSignal", () => {
    it("should record fraud signals for a review", async () => {
      const result = await fraudService.recordFraudSignal({
        reviewId: 1,
        customerId: 100,
        contractorUserId: 50,
        signals: ["revenge_review_pattern", "aggressive_language"],
        riskScore: 65,
        flaggedForModeration: true,
      });

      expect(result.success).toBe(true);
      expect(result.signalId).toBeDefined();
      expect(result.message).toContain("recorded");
    });

    it("should update existing fraud signals", async () => {
      // First record
      const first = await fraudService.recordFraudSignal({
        reviewId: 2,
        customerId: 101,
        contractorUserId: 51,
        signals: ["low_rating_no_context"],
        riskScore: 35,
        flaggedForModeration: false,
      });

      expect(first.success).toBe(true);

      // Update with new signals
      const second = await fraudService.recordFraudSignal({
        reviewId: 2,
        customerId: 101,
        contractorUserId: 51,
        signals: ["low_rating_no_context", "rapid_fire_reviews"],
        riskScore: 55,
        flaggedForModeration: true,
      });

      expect(second.success).toBe(true);
      expect(second.signalId).toBe(first.signalId);
      expect(second.message).toContain("updated");
    });

    it("should include metadata in fraud signal", async () => {
      const result = await fraudService.recordFraudSignal({
        reviewId: 3,
        customerId: 102,
        contractorUserId: 52,
        signals: ["competitor_sabotage"],
        riskScore: 85,
        flaggedForModeration: true,
        metadata: {
          detectedAt: new Date().toISOString(),
          reviewText: "This contractor is a scammer!",
          ipAddress: "192.168.1.1",
        },
      });

      expect(result.success).toBe(true);
      expect(result.signalId).toBeDefined();
    });

    it("should handle high risk scores", async () => {
      const result = await fraudService.recordFraudSignal({
        reviewId: 4,
        customerId: 103,
        contractorUserId: 53,
        signals: [
          "revenge_review_pattern",
          "coordinated_fake_reviews",
          "competitor_sabotage",
          "identical_review_text",
        ],
        riskScore: 95,
        flaggedForModeration: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("getFraudSignals", () => {
    it("should retrieve fraud signals for a review", async () => {
      await fraudService.recordFraudSignal({
        reviewId: 5,
        customerId: 104,
        contractorUserId: 54,
        signals: ["aggressive_language", "caps_lock_abuse"],
        riskScore: 45,
        flaggedForModeration: true,
      });

      const signals = await fraudService.getFraudSignals(5);
      expect(signals).toBeDefined();
      expect(signals?.reviewId).toBe(5);
      expect(signals?.customerId).toBe(104);
      expect(signals?.signals).toContain("aggressive_language");
      expect(signals?.riskScore).toBe(45);
    });

    it("should return null for non-existent review", async () => {
      const signals = await fraudService.getFraudSignals(99999);
      expect(signals).toBeNull();
    });

    it("should include metadata in retrieved signals", async () => {
      const metadata = {
        reviewLength: 150,
        rating: 1,
        detectedPatterns: 3,
      };

      await fraudService.recordFraudSignal({
        reviewId: 6,
        customerId: 105,
        contractorUserId: 55,
        signals: ["low_rating_no_context"],
        riskScore: 40,
        flaggedForModeration: false,
        metadata,
      });

      const signals = await fraudService.getFraudSignals(6);
      expect(signals?.metadata).toEqual(metadata);
    });
  });

  describe("getFraudHistory", () => {
    it("should retrieve fraud history for a customer", async () => {
      const customerId = 106;

      // Create multiple fraud signals
      await fraudService.recordFraudSignal({
        reviewId: 7,
        customerId,
        contractorUserId: 56,
        signals: ["revenge_review_pattern"],
        riskScore: 60,
        flaggedForModeration: true,
      });

      await fraudService.recordFraudSignal({
        reviewId: 8,
        customerId,
        contractorUserId: 57,
        signals: ["aggressive_language"],
        riskScore: 50,
        flaggedForModeration: false,
      });

      const history = await fraudService.getFraudHistory(customerId);
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].customerId).toBe(customerId);
    });

    it("should respect limit parameter", async () => {
      const history = await fraudService.getFraudHistory(100, 5);
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it("should sort by most recent first", async () => {
      const customerId = 107;

      await fraudService.recordFraudSignal({
        reviewId: 9,
        customerId,
        contractorUserId: 58,
        signals: ["low_risk"],
        riskScore: 20,
        flaggedForModeration: false,
      });

      await fraudService.recordFraudSignal({
        reviewId: 10,
        customerId,
        contractorUserId: 59,
        signals: ["high_risk"],
        riskScore: 80,
        flaggedForModeration: true,
      });

      const history = await fraudService.getFraudHistory(customerId);
      if (history.length >= 2) {
        expect(history[0].createdAt.getTime()).toBeGreaterThanOrEqual(history[1].createdAt.getTime());
      }
    });
  });

  describe("getContractorFraudHistory", () => {
    it("should retrieve fraud history for a contractor", async () => {
      const contractorUserId = 60;

      await fraudService.recordFraudSignal({
        reviewId: 11,
        customerId: 108,
        contractorUserId,
        signals: ["revenge_review_pattern"],
        riskScore: 70,
        flaggedForModeration: true,
      });

      await fraudService.recordFraudSignal({
        reviewId: 12,
        customerId: 109,
        contractorUserId,
        signals: ["aggressive_language"],
        riskScore: 55,
        flaggedForModeration: false,
      });

      const history = await fraudService.getContractorFraudHistory(contractorUserId);
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].contractorUserId).toBe(contractorUserId);
    });
  });

  describe("getCustomerFraudStats", () => {
    it("should calculate fraud statistics for a customer", async () => {
      const customerId = 110;

      // Create signals with various risk scores
      await fraudService.recordFraudSignal({
        reviewId: 13,
        customerId,
        contractorUserId: 61,
        signals: ["high_risk"],
        riskScore: 80,
        flaggedForModeration: true,
      });

      await fraudService.recordFraudSignal({
        reviewId: 14,
        customerId,
        contractorUserId: 62,
        signals: ["medium_risk"],
        riskScore: 50,
        flaggedForModeration: true,
      });

      await fraudService.recordFraudSignal({
        reviewId: 15,
        customerId,
        contractorUserId: 63,
        signals: ["low_risk"],
        riskScore: 20,
        flaggedForModeration: false,
      });

      const stats = await fraudService.getCustomerFraudStats(customerId);
      expect(stats.totalSignals).toBeGreaterThanOrEqual(3);
      expect(stats.flaggedReviews).toBeGreaterThan(0);
      expect(stats.averageRiskScore).toBeGreaterThan(0);
      expect(stats.highRiskCount).toBeGreaterThan(0);
      expect(stats.mediumRiskCount).toBeGreaterThan(0);
      expect(stats.lowRiskCount).toBeGreaterThan(0);
    });

    it("should handle customer with no fraud signals", async () => {
      const stats = await fraudService.getCustomerFraudStats(99999);
      expect(stats.totalSignals).toBe(0);
      expect(stats.flaggedReviews).toBe(0);
      expect(stats.averageRiskScore).toBe(0);
    });
  });

  describe("getFlaggedReviewsForModeration", () => {
    it("should retrieve flagged reviews sorted by risk score", async () => {
      // Create flagged signals
      await fraudService.recordFraudSignal({
        reviewId: 16,
        customerId: 111,
        contractorUserId: 64,
        signals: ["high_risk"],
        riskScore: 90,
        flaggedForModeration: true,
      });

      await fraudService.recordFraudSignal({
        reviewId: 17,
        customerId: 112,
        contractorUserId: 65,
        signals: ["medium_risk"],
        riskScore: 60,
        flaggedForModeration: true,
      });

      const flagged = await fraudService.getFlaggedReviewsForModeration();
      expect(flagged.length).toBeGreaterThan(0);
      expect(flagged[0].flaggedForModeration).toBe(true);

      // Check sorting by risk score (highest first)
      if (flagged.length >= 2) {
        expect(flagged[0].riskScore).toBeGreaterThanOrEqual(flagged[1].riskScore);
      }
    });

    it("should respect limit parameter", async () => {
      const flagged = await fraudService.getFlaggedReviewsForModeration(3);
      expect(flagged.length).toBeLessThanOrEqual(3);
    });
  });

  describe("markFraudSignalReviewed", () => {
    it("should mark fraud signal as approved", async () => {
      const result = await fraudService.recordFraudSignal({
        reviewId: 18,
        customerId: 113,
        contractorUserId: 66,
        signals: ["suspicious_pattern"],
        riskScore: 65,
        flaggedForModeration: true,
      });

      const marked = await fraudService.markFraudSignalReviewed(result.signalId!, 1, "approved");
      expect(marked).toBe(true);

      const signals = await fraudService.getFraudSignals(18);
      expect(signals?.flaggedForModeration).toBe(false);
      expect(signals?.metadata?.reviewedAction).toBe("approved");
    });

    it("should mark fraud signal as rejected", async () => {
      const result = await fraudService.recordFraudSignal({
        reviewId: 19,
        customerId: 114,
        contractorUserId: 67,
        signals: ["false_positive"],
        riskScore: 30,
        flaggedForModeration: true,
      });

      const marked = await fraudService.markFraudSignalReviewed(result.signalId!, 1, "rejected");
      expect(marked).toBe(true);

      const signals = await fraudService.getFraudSignals(19);
      expect(signals?.metadata?.reviewedAction).toBe("rejected");
    });

    it("should mark fraud signal as escalated", async () => {
      const result = await fraudService.recordFraudSignal({
        reviewId: 20,
        customerId: 115,
        contractorUserId: 68,
        signals: ["severe_fraud"],
        riskScore: 95,
        flaggedForModeration: true,
      });

      const marked = await fraudService.markFraudSignalReviewed(result.signalId!, 1, "escalated");
      expect(marked).toBe(true);

      const signals = await fraudService.getFraudSignals(20);
      expect(signals?.metadata?.reviewedAction).toBe("escalated");
    });

    it("should return false for non-existent signal", async () => {
      const marked = await fraudService.markFraudSignalReviewed(99999, 1, "approved");
      expect(marked).toBe(false);
    });
  });
});
