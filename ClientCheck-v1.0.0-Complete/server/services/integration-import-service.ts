/**
 * Integration Import Service
 * Manages job imports from third-party integrations (ServiceTitan, Jobber, Housecall Pro)
 * All state is persisted to MySQL via Drizzle ORM
 */

import { and, desc, eq } from "drizzle-orm";
import { integrationWebhookReceipts, softwareIntegrationConnections } from "../../drizzle/schema";
import { getDb } from "../db";
import { writeAuditLog } from "./audit-log-service";
import { queueNotification } from "./notification-delivery-service";

export interface ImportJobInput {
  integrationId: number;
  integrationName: "servicetitan" | "jobber" | "housecall_pro";
  externalJobId: string;
  jobData: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    jobAmount?: number;
    jobDescription?: string;
    jobDate?: string;
    jobStatus?: string;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
}

export interface ImportJobStatus {
  id: number;
  integrationId: number;
  integrationName: string;
  externalJobId: string;
  status: "pending" | "processing" | "completed" | "failed" | "skipped";
  jobData: Record<string, any>;
  result?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
  processedAt?: Date;
  attempts: number;
}

/**
 * Create a new import job from a third-party integration
 */
export async function createImportJob(input: ImportJobInput): Promise<{ success: boolean; jobId?: number; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  try {
    // Check if this job was already imported (prevent duplicates)
    const existing = await db
      .select()
      .from(integrationWebhookReceipts)
      .where(
        and(
          eq(integrationWebhookReceipts.integrationId, input.integrationId),
          eq(integrationWebhookReceipts.externalId, input.externalJobId)
        )
      )
      .limit(1);

    if (existing[0]) {
      return { success: false, message: "Job already imported", jobId: existing[0].id };
    }

    // Create new import job
    const result = await db.insert(integrationWebhookReceipts).values({
      integrationId: input.integrationId,
      integrationName: input.integrationName,
      externalId: input.externalJobId,
      payloadJson: JSON.stringify(input.jobData),
      status: "pending",
      attempts: 0,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    });

    const jobId = result[0].insertId as number;

    await writeAuditLog({
      action: "integration.import_job_created",
      entityType: "import_job",
      entityId: jobId,
      metadata: {
        integrationName: input.integrationName,
        externalJobId: input.externalJobId,
      },
    });

    return { success: true, jobId, message: "Import job created" };
  } catch (error) {
    console.error("[Integration Import] Create job error:", error);
    return { success: false, message: "Failed to create import job" };
  }
}

/**
 * Update the status of an import job
 */
export async function updateImportJobStatus(
  jobId: number,
  status: "processing" | "completed" | "failed" | "skipped",
  result?: Record<string, any>,
  errorMessage?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const row = await db.select().from(integrationWebhookReceipts).where(eq(integrationWebhookReceipts.id, jobId)).limit(1);
    const job = row[0];
    if (!job) return false;

    const attempts = (job.attempts || 0) + 1;

    await db
      .update(integrationWebhookReceipts)
      .set({
        status,
        attempts,
        resultJson: result ? JSON.stringify(result) : null,
        errorMessage: errorMessage ?? null,
        processedAt: status !== "pending" ? new Date() : job.processedAt,
      })
      .where(eq(integrationWebhookReceipts.id, jobId));

    await writeAuditLog({
      action: "integration.import_job_updated",
      entityType: "import_job",
      entityId: jobId,
      metadata: {
        status,
        attempts,
        hasError: !!errorMessage,
      },
    });

    return true;
  } catch (error) {
    console.error("[Integration Import] Update status error:", error);
    return false;
  }
}

/**
 * Get import job details
 */
export async function getImportJobDetails(jobId: number): Promise<ImportJobStatus | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db.select().from(integrationWebhookReceipts).where(eq(integrationWebhookReceipts.id, jobId)).limit(1);
    const job = rows[0];
    if (!job) return null;

    return {
      id: job.id,
      integrationId: job.integrationId,
      integrationName: job.integrationName || "unknown",
      externalJobId: job.externalId || "",
      status: (job.status as any) || "pending",
      jobData: job.payloadJson ? JSON.parse(job.payloadJson) : {},
      result: job.resultJson ? JSON.parse(job.resultJson) : undefined,
      errorMessage: job.errorMessage ?? undefined,
      createdAt: new Date(job.createdAt),
      processedAt: job.processedAt ? new Date(job.processedAt) : undefined,
      attempts: job.attempts || 0,
    };
  } catch (error) {
    console.error("[Integration Import] Get details error:", error);
    return null;
  }
}

/**
 * Get import history for a user/integration
 */
export async function getImportHistory(
  integrationId: number,
  limit: number = 50,
  status?: "pending" | "processing" | "completed" | "failed" | "skipped"
): Promise<ImportJobStatus[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.select().from(integrationWebhookReceipts).where(eq(integrationWebhookReceipts.integrationId, integrationId));

    if (status) {
      query = query.where(eq(integrationWebhookReceipts.status, status));
    }

    const rows = await query.orderBy(desc(integrationWebhookReceipts.createdAt)).limit(limit);

    return rows.map((job) => ({
      id: job.id,
      integrationId: job.integrationId,
      integrationName: job.integrationName || "unknown",
      externalJobId: job.externalId || "",
      status: (job.status as any) || "pending",
      jobData: job.payloadJson ? JSON.parse(job.payloadJson) : {},
      result: job.resultJson ? JSON.parse(job.resultJson) : undefined,
      errorMessage: job.errorMessage ?? undefined,
      createdAt: new Date(job.createdAt),
      processedAt: job.processedAt ? new Date(job.processedAt) : undefined,
      attempts: job.attempts || 0,
    }));
  } catch (error) {
    console.error("[Integration Import] Get history error:", error);
    return [];
  }
}

/**
 * Get import statistics
 */
export async function getImportStats(integrationId: number): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;
  successRate: number;
}> {
  const db = await getDb();
  if (!db) {
    return { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0, successRate: 0 };
  }

  try {
    const rows = await db.select().from(integrationWebhookReceipts).where(eq(integrationWebhookReceipts.integrationId, integrationId));

    const total = rows.length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const processing = rows.filter((r) => r.status === "processing").length;
    const completed = rows.filter((r) => r.status === "completed").length;
    const failed = rows.filter((r) => r.status === "failed").length;
    const skipped = rows.filter((r) => r.status === "skipped").length;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      skipped,
      successRate: Math.round(successRate * 100) / 100,
    };
  } catch (error) {
    console.error("[Integration Import] Get stats error:", error);
    return { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0, successRate: 0 };
  }
}

/**
 * Retry failed import jobs
 */
export async function retryFailedImports(integrationId: number, maxAttempts: number = 3): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const rows = await db
      .select()
      .from(integrationWebhookReceipts)
      .where(and(eq(integrationWebhookReceipts.integrationId, integrationId), eq(integrationWebhookReceipts.status, "failed")));

    let retried = 0;
    for (const job of rows) {
      if ((job.attempts || 0) < maxAttempts) {
        await db
          .update(integrationWebhookReceipts)
          .set({ status: "pending", attempts: (job.attempts || 0) + 1 })
          .where(eq(integrationWebhookReceipts.id, job.id));
        retried++;
      }
    }

    await writeAuditLog({
      action: "integration.retry_failed_imports",
      entityType: "integration",
      entityId: integrationId,
      metadata: { retriedCount: retried },
    });

    return retried;
  } catch (error) {
    console.error("[Integration Import] Retry error:", error);
    return 0;
  }
}

/**
 * Clean up old completed imports (older than 30 days)
 */
export async function cleanupOldImports(integrationId: number, daysOld: number = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const rows = await db
      .select()
      .from(integrationWebhookReceipts)
      .where(
        and(
          eq(integrationWebhookReceipts.integrationId, integrationId),
          eq(integrationWebhookReceipts.status, "completed")
          // Note: Drizzle doesn't have a direct "less than" operator in this context
          // This would need to be handled with raw SQL or a different approach
        )
      );

    // Filter in application layer (not ideal but works for now)
    const toDelete = rows.filter((r) => new Date(r.createdAt) < cutoffDate);

    let deleted = 0;
    for (const job of toDelete) {
      await db.delete(integrationWebhookReceipts).where(eq(integrationWebhookReceipts.id, job.id));
      deleted++;
    }

    await writeAuditLog({
      action: "integration.cleanup_old_imports",
      entityType: "integration",
      entityId: integrationId,
      metadata: { deletedCount: deleted, daysOld },
    });

    return deleted;
  } catch (error) {
    console.error("[Integration Import] Cleanup error:", error);
    return 0;
  }
}
