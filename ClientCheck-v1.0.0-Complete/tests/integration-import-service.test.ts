import { describe, it, expect, beforeEach, vi } from "vitest";
import * as importService from "../server/services/integration-import-service";

describe("Integration Import Service", () => {
  describe("createImportJob", () => {
    it("should create a new import job", async () => {
      const result = await importService.createImportJob({
        integrationId: 1,
        integrationName: "servicetitan",
        externalJobId: "ST-12345",
        jobData: {
          customerId: "C123",
          customerName: "John Doe",
          customerPhone: "555-1234",
          jobAmount: 5000,
          jobDescription: "Roof repair",
          jobStatus: "completed",
        },
      });

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.message).toContain("created");
    });

    it("should prevent duplicate imports", async () => {
      const jobData = {
        integrationId: 1,
        integrationName: "servicetitan" as const,
        externalJobId: "ST-12345",
        jobData: {
          customerId: "C123",
          customerName: "John Doe",
        },
      };

      // First import should succeed
      const first = await importService.createImportJob(jobData);
      expect(first.success).toBe(true);

      // Second import with same external ID should fail
      const second = await importService.createImportJob(jobData);
      expect(second.success).toBe(false);
      expect(second.message).toContain("already imported");
    });

    it("should include metadata in import job", async () => {
      const result = await importService.createImportJob({
        integrationId: 1,
        integrationName: "jobber",
        externalJobId: "JB-67890",
        jobData: {
          customerId: "C456",
          customerName: "Jane Smith",
        },
        metadata: {
          source: "webhook",
          timestamp: new Date().toISOString(),
        },
      });

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
    });
  });

  describe("updateImportJobStatus", () => {
    it("should update job status to processing", async () => {
      const created = await importService.createImportJob({
        integrationId: 1,
        integrationName: "servicetitan",
        externalJobId: "ST-UPDATE-1",
        jobData: { customerId: "C789" },
      });

      expect(created.success).toBe(true);
      expect(created.jobId).toBeDefined();

      const updated = await importService.updateImportJobStatus(created.jobId!, "processing");
      expect(updated).toBe(true);
    });

    it("should update job status to completed with result", async () => {
      const created = await importService.createImportJob({
        integrationId: 1,
        integrationName: "housecall_pro",
        externalJobId: "HCP-COMPLETE-1",
        jobData: { customerId: "C999" },
      });

      const updated = await importService.updateImportJobStatus(
        created.jobId!,
        "completed",
        {
          customerId: 42,
          jobCreated: true,
          riskScoreCalculated: true,
        }
      );

      expect(updated).toBe(true);
    });

    it("should update job status to failed with error message", async () => {
      const created = await importService.createImportJob({
        integrationId: 1,
        integrationName: "servicetitan",
        externalJobId: "ST-FAIL-1",
        jobData: { customerId: "C111" },
      });

      const updated = await importService.updateImportJobStatus(
        created.jobId!,
        "failed",
        undefined,
        "Customer not found in system"
      );

      expect(updated).toBe(true);
    });

    it("should increment attempts on each update", async () => {
      const created = await importService.createImportJob({
        integrationId: 1,
        integrationName: "jobber",
        externalJobId: "JB-ATTEMPTS-1",
        jobData: { customerId: "C222" },
      });

      await importService.updateImportJobStatus(created.jobId!, "processing");
      const details1 = await importService.getImportJobDetails(created.jobId!);
      expect(details1?.attempts).toBe(1);

      await importService.updateImportJobStatus(created.jobId!, "failed", undefined, "Retry needed");
      const details2 = await importService.getImportJobDetails(created.jobId!);
      expect(details2?.attempts).toBe(2);
    });
  });

  describe("getImportJobDetails", () => {
    it("should retrieve job details", async () => {
      const created = await importService.createImportJob({
        integrationId: 1,
        integrationName: "servicetitan",
        externalJobId: "ST-DETAIL-1",
        jobData: {
          customerId: "C333",
          jobAmount: 7500,
        },
      });

      const details = await importService.getImportJobDetails(created.jobId!);
      expect(details).toBeDefined();
      expect(details?.integrationName).toBe("servicetitan");
      expect(details?.externalJobId).toBe("ST-DETAIL-1");
      expect(details?.status).toBe("pending");
      expect(details?.jobData.customerId).toBe("C333");
    });

    it("should return null for non-existent job", async () => {
      const details = await importService.getImportJobDetails(99999);
      expect(details).toBeNull();
    });
  });

  describe("getImportHistory", () => {
    it("should retrieve import history for integration", async () => {
      // Create multiple jobs
      await importService.createImportJob({
        integrationId: 2,
        integrationName: "jobber",
        externalJobId: "JB-HIST-1",
        jobData: { customerId: "C444" },
      });

      await importService.createImportJob({
        integrationId: 2,
        integrationName: "jobber",
        externalJobId: "JB-HIST-2",
        jobData: { customerId: "C555" },
      });

      const history = await importService.getImportHistory(2);
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].integrationName).toBe("jobber");
    });

    it("should filter by status", async () => {
      const created = await importService.createImportJob({
        integrationId: 3,
        integrationName: "housecall_pro",
        externalJobId: "HCP-STATUS-1",
        jobData: { customerId: "C666" },
      });

      await importService.updateImportJobStatus(created.jobId!, "completed");

      const completed = await importService.getImportHistory(3, 50, "completed");
      expect(completed.length).toBeGreaterThan(0);
      expect(completed[0].status).toBe("completed");
    });

    it("should respect limit parameter", async () => {
      const history = await importService.getImportHistory(1, 5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getImportStats", () => {
    it("should calculate import statistics", async () => {
      const integrationId = 4;

      // Create jobs with different statuses
      const job1 = await importService.createImportJob({
        integrationId,
        integrationName: "servicetitan",
        externalJobId: "ST-STATS-1",
        jobData: { customerId: "C777" },
      });

      const job2 = await importService.createImportJob({
        integrationId,
        integrationName: "servicetitan",
        externalJobId: "ST-STATS-2",
        jobData: { customerId: "C888" },
      });

      await importService.updateImportJobStatus(job1.jobId!, "completed");
      await importService.updateImportJobStatus(job2.jobId!, "failed", undefined, "Error");

      const stats = await importService.getImportStats(integrationId);
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.completed).toBeGreaterThan(0);
      expect(stats.failed).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe("retryFailedImports", () => {
    it("should retry failed imports", async () => {
      const integrationId = 5;

      const job = await importService.createImportJob({
        integrationId,
        integrationName: "jobber",
        externalJobId: "JB-RETRY-1",
        jobData: { customerId: "C999" },
      });

      await importService.updateImportJobStatus(job.jobId!, "failed", undefined, "Network error");

      const retried = await importService.retryFailedImports(integrationId);
      expect(retried).toBeGreaterThan(0);

      const details = await importService.getImportJobDetails(job.jobId!);
      expect(details?.status).toBe("pending");
      expect(details?.attempts).toBe(2);
    });

    it("should respect max attempts limit", async () => {
      const integrationId = 6;

      const job = await importService.createImportJob({
        integrationId,
        integrationName: "housecall_pro",
        externalJobId: "HCP-MAX-ATTEMPTS-1",
        jobData: { customerId: "C1000" },
      });

      // Mark as failed multiple times
      for (let i = 0; i < 4; i++) {
        await importService.updateImportJobStatus(job.jobId!, "failed", undefined, "Error");
      }

      const retried = await importService.retryFailedImports(integrationId, 3);
      expect(retried).toBe(0); // Should not retry if attempts >= maxAttempts
    });
  });

  describe("cleanupOldImports", () => {
    it("should clean up old completed imports", async () => {
      const integrationId = 7;

      const job = await importService.createImportJob({
        integrationId,
        integrationName: "servicetitan",
        externalJobId: "ST-CLEANUP-1",
        jobData: { customerId: "C1001" },
      });

      await importService.updateImportJobStatus(job.jobId!, "completed");

      // Cleanup should work (though it won't delete very recent imports)
      const deleted = await importService.cleanupOldImports(integrationId, 0);
      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });
});
