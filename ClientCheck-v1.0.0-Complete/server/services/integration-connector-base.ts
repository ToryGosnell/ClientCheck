import { db } from "@/server/_core/db";
import { integrations, integrationUsage } from "@/drizzle/schema";
import { eq, and, gte } from "drizzle-orm";

/**
 * Base Integration Connector
 * Abstract base class for all third-party integrations
 */

export interface IntegrationConfig {
  name: string;
  environment: "sandbox" | "production";
  apiKey: string;
  apiSecret?: string;
  webhookSecret?: string;
  baseUrl: string;
}

export interface IntegrationUsageMetrics {
  customerId: number;
  integrationId: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  dataImportedCount: number;
  dataExportedCount: number;
  lastUsedAt: Date;
  monthlyUsage: number;
}

export abstract class IntegrationConnectorBase {
  protected config: IntegrationConfig;
  protected integrationId: number;
  protected customerId: number;

  constructor(config: IntegrationConfig, integrationId: number, customerId: number) {
    this.config = config;
    this.integrationId = integrationId;
    this.customerId = customerId;
  }

  /**
   * Test connection to third-party service
   */
  abstract testConnection(): Promise<{ success: boolean; message: string }>;

  /**
   * Authenticate with third-party service
   */
  abstract authenticate(): Promise<{ accessToken: string; expiresIn: number }>;

  /**
   * Refresh authentication token
   */
  abstract refreshToken(): Promise<{ accessToken: string; expiresIn: number }>;

  /**
   * Import data from third-party service
   */
  abstract importData(dataType: string): Promise<{ imported: number; errors: string[] }>;

  /**
   * Export data to third-party service
   */
  abstract exportData(dataType: string, data: any[]): Promise<{ exported: number; errors: string[] }>;

  /**
   * Verify webhook signature
   */
  abstract verifyWebhookSignature(body: string, signature: string): boolean;

  /**
   * Handle webhook event
   */
  abstract handleWebhookEvent(event: any): Promise<void>;

  /**
   * Track API usage
   */
  protected async trackUsage(apiCallsUsed: number = 1, dataImported: number = 0, dataExported: number = 0) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get or create usage record
    const existing = await db
      .select()
      .from(integrationUsage)
      .where(
        and(
          eq(integrationUsage.customerId, this.customerId),
          eq(integrationUsage.integrationId, this.integrationId),
          gte(integrationUsage.createdAt, monthStart)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(integrationUsage)
        .set({
          apiCallsUsed: (existing[0].apiCallsUsed || 0) + apiCallsUsed,
          dataImportedCount: (existing[0].dataImportedCount || 0) + dataImported,
          dataExportedCount: (existing[0].dataExportedCount || 0) + dataExported,
          lastUsedAt: now,
          updatedAt: now,
        })
        .where(eq(integrationUsage.id, existing[0].id));
    } else {
      // Create new record
      await db.insert(integrationUsage).values({
        customerId: this.customerId,
        integrationId: this.integrationId,
        apiCallsUsed,
        dataImportedCount: dataImported,
        dataExportedCount: dataExported,
        lastUsedAt: now,
        createdAt: now,
      });
    }
  }

  /**
   * Check if usage limit exceeded
   */
  protected async isUsageLimitExceeded(): Promise<boolean> {
    const usage = await this.getUsageMetrics();
    return usage.apiCallsUsed >= usage.apiCallsLimit;
  }

  /**
   * Get usage metrics
   */
  async getUsageMetrics(): Promise<IntegrationUsageMetrics> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await db
      .select()
      .from(integrationUsage)
      .where(
        and(
          eq(integrationUsage.customerId, this.customerId),
          eq(integrationUsage.integrationId, this.integrationId),
          gte(integrationUsage.createdAt, monthStart)
        )
      )
      .limit(1);

    if (!usage.length) {
      return {
        customerId: this.customerId,
        integrationId: this.integrationId,
        apiCallsUsed: 0,
        apiCallsLimit: 10000, // Default limit
        dataImportedCount: 0,
        dataExportedCount: 0,
        lastUsedAt: new Date(),
        monthlyUsage: 0,
      };
    }

    const u = usage[0];
    return {
      customerId: this.customerId,
      integrationId: this.integrationId,
      apiCallsUsed: u.apiCallsUsed || 0,
      apiCallsLimit: 10000,
      dataImportedCount: u.dataImportedCount || 0,
      dataExportedCount: u.dataExportedCount || 0,
      lastUsedAt: u.lastUsedAt || new Date(),
      monthlyUsage: ((u.apiCallsUsed || 0) / 10000) * 100,
    };
  }

  /**
   * Validate API key
   */
  protected async validateApiKey(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    // Check if key is stored securely
    return this.config.apiKey.length > 0;
  }

  /**
   * Encrypt sensitive data
   */
  protected encryptData(data: string): string {
    // In production, use proper encryption (e.g., AES-256)
    return Buffer.from(data).toString("base64");
  }

  /**
   * Decrypt sensitive data
   */
  protected decryptData(encrypted: string): string {
    // In production, use proper decryption
    return Buffer.from(encrypted, "base64").toString("utf-8");
  }

  /**
   * Make authenticated API request
   */
  protected async makeRequest(
    method: string,
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Handle rate limiting
   */
  protected async handleRateLimit(retryAfter: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
  }

  /**
   * Log integration activity
   */
  protected async logActivity(action: string, details: any): Promise<void> {
    console.log(`[${this.config.name}] ${action}:`, details);
    // In production, store in database
  }
}
