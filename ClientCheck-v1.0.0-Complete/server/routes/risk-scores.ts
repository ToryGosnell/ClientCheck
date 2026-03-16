import { Router } from "express";
import { getDb } from "../db";
import { customers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  getRiskScore,
  calculateCustomerRiskScore,
  saveRiskScore,
  updateCustomerRiskScore,
} from "../services/risk-score-engine";

const router = Router();

/**
 * GET /api/risk-scores/:customerId
 * Get the risk score for a customer
 * Returns cached score or calculates if not available
 */
router.get("/:customerId", async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);

    if (isNaN(customerId)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }

    // Check if customer exists
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (customer.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Get cached risk score
    let riskScore = await getRiskScore(customerId);

    // If not cached or older than 24 hours, recalculate
    if (
      !riskScore ||
      !riskScore.lastCalculatedAt ||
      Date.now() - new Date(riskScore.lastCalculatedAt).getTime() >
        24 * 60 * 60 * 1000
    ) {
      const scoreResult = await calculateCustomerRiskScore(customerId);
      await saveRiskScore(customerId, scoreResult);
      riskScore = await getRiskScore(customerId);
    }

    res.json(riskScore);
  } catch (error) {
    console.error("Error fetching risk score:", error);
    res.status(500).json({ error: "Failed to fetch risk score" });
  }
});

/**
 * POST /api/risk-scores/:customerId/recalculate
 * Force recalculation of risk score
 */
router.post("/:customerId/recalculate", async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);

    if (isNaN(customerId)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }

    const scoreResult = await updateCustomerRiskScore(customerId);
    res.json(scoreResult);
  } catch (error) {
    console.error("Error recalculating risk score:", error);
    res.status(500).json({ error: "Failed to recalculate risk score" });
  }
});

/**
 * POST /api/risk-scores/batch-recalculate
 * Recalculate risk scores for all customers
 * Admin-only endpoint
 */
router.post("/batch-recalculate", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const allCustomers = await db.select().from(customers);

    const results = [];
    for (const customer of allCustomers) {
      const scoreResult = await updateCustomerRiskScore(customer.id);
      results.push({
        customerId: customer.id,
        riskScore: scoreResult.riskScore,
        riskLevel: scoreResult.riskLevel,
      });
    }

    res.json({
      message: `Updated risk scores for ${results.length} customers`,
      results,
    });
  } catch (error) {
    console.error("Error batch recalculating risk scores:", error);
    res.status(500).json({ error: "Failed to batch recalculate risk scores" });
  }
});

export default router;
