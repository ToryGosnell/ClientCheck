import { Router } from "express";
import {
  getPendingDisputes,
  getDisputeDetails,
  submitModerationDecision,
  getModerationStats,
  getModeratorStats,
  DisputeDecision,
} from "../services/dispute-moderation-service";
import { attachSessionAuth, requireRole } from "../services/authz";

const router = Router();
router.use(attachSessionAuth);
router.use(requireRole(["admin"]));

/**
 * GET /api/disputes/moderation/stats
 * Get moderation statistics
 */
router.get("/stats", async (_req, res) => {
  try {
    const stats = await getModerationStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching moderation stats:", error);
    res.status(500).json({ error: "Failed to fetch moderation stats" });
  }
});

/**
 * GET /api/disputes/moderation/moderator/:moderatorId/stats
 * Get moderator performance stats
 */
router.get("/moderator/:moderatorId/stats", async (req, res) => {
  try {
    const moderatorId = parseInt(req.params.moderatorId);
    if (isNaN(moderatorId)) {
      return res.status(400).json({ error: "Invalid moderator ID" });
    }
    const stats = await getModeratorStats(moderatorId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching moderator stats:", error);
    res.status(500).json({ error: "Failed to fetch moderator stats" });
  }
});

/**
 * GET /api/disputes/moderation/pending
 * Get all pending disputes for moderation
 */
router.get("/pending", async (_req, res) => {
  try {
    const disputes = await getPendingDisputes();
    res.json(disputes);
  } catch (error) {
    console.error("Error fetching pending disputes:", error);
    res.status(500).json({ error: "Failed to fetch pending disputes" });
  }
});

/**
 * GET /api/disputes/moderation/:disputeId
 * Get dispute details with full context
 */
router.get("/:disputeId", async (req, res) => {
  try {
    const disputeId = parseInt(req.params.disputeId);
    if (isNaN(disputeId)) {
      return res.status(400).json({ error: "Invalid dispute ID" });
    }
    const details = await getDisputeDetails(disputeId);
    if (!details) {
      return res.status(404).json({ error: "Dispute not found" });
    }
    res.json(details);
  } catch (error) {
    console.error("Error fetching dispute details:", error);
    res.status(500).json({ error: "Failed to fetch dispute details" });
  }
});

/**
 * POST /api/disputes/moderation/:disputeId/decide
 * Submit a moderation decision on a dispute
 */
router.post("/:disputeId/decide", async (req, res) => {
  try {
    const disputeId = parseInt(req.params.disputeId);
    const { moderatorId, decision, reason } = req.body;
    if (isNaN(disputeId)) {
      return res.status(400).json({ error: "Invalid dispute ID" });
    }
    if (!moderatorId) {
      return res.status(400).json({ error: "Moderator ID required" });
    }
    const validDecisions: DisputeDecision[] = [
      "review_stands",
      "review_removed",
      "review_modified",
      "customer_response_approved",
    ];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ error: "Invalid decision type" });
    }
    await submitModerationDecision(disputeId, moderatorId, decision, reason);
    res.json({ message: "Moderation decision submitted", disputeId, decision });
  } catch (error) {
    console.error("Error submitting moderation decision:", error);
    res.status(500).json({ error: "Failed to submit moderation decision" });
  }
});

export default router;
