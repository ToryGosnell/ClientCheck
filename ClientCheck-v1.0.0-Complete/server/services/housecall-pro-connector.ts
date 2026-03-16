import { IntegrationConnectorBase, IntegrationConfig } from "./integration-connector-base";
import { db } from "@/server/_core/db";
import { integrationImportJobs } from "@/drizzle/schema";

/**
 * Housecall Pro Integration Connector
 * Handles data import/export with Housecall Pro field service platform
 */

export interface HousecallProConfig extends IntegrationConfig {
  businessId: string;
}

export interface HousecallProCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface HousecallProJob {
  id: string;
  customerId: string;
  jobNumber: string;
  description: string;
  amount: number;
  status: string;
  scheduledDate: string;
  completedDate?: string;
}

export class HousecallProConnector extends IntegrationConnectorBase {
  private accessToken: string = "";
  private tokenExpiresAt: Date = new Date();

  constructor(config: HousecallProConfig, integrationId: number, customerId: number) {
    super(config, integrationId, customerId);
  }

  /**
   * Test connection to Housecall Pro
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.authenticate();
      await this.makeRequest("GET", "/v2/business");
      return { success: true, message: "Connected to Housecall Pro successfully" };
    } catch (error) {
      return { success: false, message: `Connection failed: ${(error as Error).message}` };
    }
  }

  /**
   * Authenticate with Housecall Pro
   */
  async authenticate(): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const response = await fetch("https://api.housecallpro.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.config.apiKey,
          client_secret: this.config.apiSecret || "",
          scope: "read write",
        }).toString(),
      });

      if (!response.ok) {
        throw new Error("Authentication failed");
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      return { accessToken: data.access_token, expiresIn: data.expires_in };
    } catch (error) {
      throw new Error(`Housecall Pro authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<{ accessToken: string; expiresIn: number }> {
    if (this.tokenExpiresAt > new Date()) {
      return { accessToken: this.accessToken, expiresIn: 3600 };
    }
    return this.authenticate();
  }

  /**
   * Import data from Housecall Pro
   */
  async importData(dataType: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      // Check usage limit
      if (await this.isUsageLimitExceeded()) {
        throw new Error("API usage limit exceeded");
      }

      // Create import job
      const jobId = await this.createImportJob(dataType);

      if (dataType === "customers") {
        imported = await this.importCustomers(jobId, errors);
      } else if (dataType === "jobs") {
        imported = await this.importJobs(jobId, errors);
      } else if (dataType === "invoices") {
        imported = await this.importInvoices(jobId, errors);
      }

      // Track usage
      await this.trackUsage(imported + errors.length, imported, 0);

      // Update import job
      await this.updateImportJob(jobId, "completed", { imported, errors: errors.length });

      return { imported, errors };
    } catch (error) {
      errors.push((error as Error).message);
      return { imported, errors };
    }
  }

  /**
   * Export data to Housecall Pro
   */
  async exportData(dataType: string, data: any[]): Promise<{ exported: number; errors: string[] }> {
    const errors: string[] = [];
    let exported = 0;

    try {
      // Check usage limit
      if (await this.isUsageLimitExceeded()) {
        throw new Error("API usage limit exceeded");
      }

      for (const item of data) {
        try {
          if (dataType === "customers") {
            await this.exportCustomer(item);
          } else if (dataType === "jobs") {
            await this.exportJob(item);
          }
          exported++;
        } catch (error) {
          errors.push(`Failed to export item: ${(error as Error).message}`);
        }
      }

      // Track usage
      await this.trackUsage(data.length, 0, exported);

      return { exported, errors };
    } catch (error) {
      errors.push((error as Error).message);
      return { exported, errors };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      // Housecall Pro uses HMAC-SHA256
      const crypto = require("crypto");
      const hash = crypto
        .createHmac("sha256", this.config.webhookSecret || "")
        .update(body)
        .digest("hex");

      return hash === signature;
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return false;
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhookEvent(event: any): Promise<void> {
    try {
      switch (event.event_type) {
        case "customer.created":
          await this.handleCustomerCreated(event.data);
          break;
        case "customer.updated":
          await this.handleCustomerUpdated(event.data);
          break;
        case "job.completed":
          await this.handleJobCompleted(event.data);
          break;
        case "invoice.paid":
          await this.handleInvoicePaid(event.data);
          break;
        default:
          console.log(`Unhandled event type: ${event.event_type}`);
      }
    } catch (error) {
      console.error("Error handling webhook event:", error);
      throw error;
    }
  }

  /**
   * Private methods
   */

  private async createImportJob(dataType: string): Promise<number> {
    const result = await db
      .insert(integrationImportJobs)
      .values({
        customerId: this.customerId,
        integrationId: this.integrationId,
        dataType,
        status: "processing",
        createdAt: new Date(),
      });

    return result[0].insertId || 0;
  }

  private async updateImportJob(jobId: number, status: string, metadata: any): Promise<void> {
    await db.update(integrationImportJobs).set({
      status,
      metadata: JSON.stringify(metadata),
      updatedAt: new Date(),
    });
  }

  private async importCustomers(jobId: number, errors: string[]): Promise<number> {
    let imported = 0;
    let page = 1;
    const pageSize = 100;

    try {
      while (true) {
        const response = await this.makeRequest("GET", `/v2/customers?page=${page}&page_size=${pageSize}`);

        if (!response.customers || response.customers.length === 0) {
          break;
        }

        for (const customer of response.customers) {
          try {
            await this.processCustomer(customer);
            imported++;
          } catch (error) {
            errors.push(`Failed to import customer: ${(error as Error).message}`);
          }
        }

        if (response.customers.length < pageSize) break;
        page++;
      }
    } catch (error) {
      errors.push(`Import failed: ${(error as Error).message}`);
    }

    return imported;
  }

  private async importJobs(jobId: number, errors: string[]): Promise<number> {
    let imported = 0;
    let page = 1;
    const pageSize = 100;

    try {
      while (true) {
        const response = await this.makeRequest("GET", `/v2/jobs?page=${page}&page_size=${pageSize}`);

        if (!response.jobs || response.jobs.length === 0) {
          break;
        }

        for (const job of response.jobs) {
          try {
            await this.processJob(job);
            imported++;
          } catch (error) {
            errors.push(`Failed to import job: ${(error as Error).message}`);
          }
        }

        if (response.jobs.length < pageSize) break;
        page++;
      }
    } catch (error) {
      errors.push(`Import failed: ${(error as Error).message}`);
    }

    return imported;
  }

  private async importInvoices(jobId: number, errors: string[]): Promise<number> {
    let imported = 0;
    let page = 1;
    const pageSize = 100;

    try {
      while (true) {
        const response = await this.makeRequest("GET", `/v2/invoices?page=${page}&page_size=${pageSize}`);

        if (!response.invoices || response.invoices.length === 0) {
          break;
        }

        for (const invoice of response.invoices) {
          try {
            await this.processInvoice(invoice);
            imported++;
          } catch (error) {
            errors.push(`Failed to import invoice: ${(error as Error).message}`);
          }
        }

        if (response.invoices.length < pageSize) break;
        page++;
      }
    } catch (error) {
      errors.push(`Import failed: ${(error as Error).message}`);
    }

    return imported;
  }

  private async exportCustomer(customer: any): Promise<void> {
    await this.makeRequest("POST", "/v2/customers", {
      first_name: customer.firstName,
      last_name: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
    });
  }

  private async exportJob(job: any): Promise<void> {
    await this.makeRequest("POST", "/v2/jobs", {
      customer_id: job.customerId,
      description: job.description,
      amount: job.amount,
      status: job.status,
      scheduled_date: job.scheduledDate,
    });
  }

  private async processCustomer(customer: any): Promise<void> {
    await this.logActivity("customer_imported", { id: customer.id, name: customer.first_name });
  }

  private async processJob(job: any): Promise<void> {
    await this.logActivity("job_imported", { id: job.id, customerId: job.customer_id });
  }

  private async processInvoice(invoice: any): Promise<void> {
    await this.logActivity("invoice_imported", { id: invoice.id, amount: invoice.total });
  }

  private async handleCustomerCreated(data: any): Promise<void> {
    await this.logActivity("customer_created_webhook", data);
  }

  private async handleCustomerUpdated(data: any): Promise<void> {
    await this.logActivity("customer_updated_webhook", data);
  }

  private async handleJobCompleted(data: any): Promise<void> {
    await this.logActivity("job_completed_webhook", data);
  }

  private async handleInvoicePaid(data: any): Promise<void> {
    await this.logActivity("invoice_paid_webhook", data);
  }
}
