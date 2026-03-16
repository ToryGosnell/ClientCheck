import { IntegrationConnectorBase, IntegrationConfig } from "./integration-connector-base";
import { db } from "@/server/_core/db";
import { integrationImportJobs } from "@/drizzle/schema";

/**
 * Jobber Integration Connector
 * Handles data import/export with Jobber field service platform
 */

export interface JobberConfig extends IntegrationConfig {
  accountId: string;
}

export interface JobberCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface JobberJob {
  id: string;
  customerId: string;
  jobNumber: string;
  description: string;
  amount: number;
  status: string;
  startDate: string;
  endDate?: string;
}

export class JobberConnector extends IntegrationConnectorBase {
  private accessToken: string = "";
  private tokenExpiresAt: Date = new Date();

  constructor(config: JobberConfig, integrationId: number, customerId: number) {
    super(config, integrationId, customerId);
  }

  /**
   * Test connection to Jobber
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.authenticate();
      const response = await this.makeGraphQLRequest(`
        query {
          account {
            id
            name
          }
        }
      `);
      return { success: true, message: "Connected to Jobber successfully" };
    } catch (error) {
      return { success: false, message: `Connection failed: ${(error as Error).message}` };
    }
  }

  /**
   * Authenticate with Jobber
   */
  async authenticate(): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const response = await fetch("https://api.getjobber.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          query: `
            query {
              account {
                id
              }
            }
          `,
        }),
      });

      if (!response.ok) {
        throw new Error("Authentication failed");
      }

      this.accessToken = this.config.apiKey;
      this.tokenExpiresAt = new Date(Date.now() + 3600 * 1000);

      return { accessToken: this.config.apiKey, expiresIn: 3600 };
    } catch (error) {
      throw new Error(`Jobber authentication failed: ${(error as Error).message}`);
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
   * Import data from Jobber
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
   * Export data to Jobber
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
      // Jobber uses HMAC-SHA256
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
      switch (event.eventType) {
        case "client.created":
          await this.handleClientCreated(event.data);
          break;
        case "client.updated":
          await this.handleClientUpdated(event.data);
          break;
        case "job.completed":
          await this.handleJobCompleted(event.data);
          break;
        case "invoice.paid":
          await this.handleInvoicePaid(event.data);
          break;
        default:
          console.log(`Unhandled event type: ${event.eventType}`);
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
    let after: string | null = null;

    try {
      while (true) {
        const response = await this.makeGraphQLRequest(`
          query {
            clients(first: 100${after ? `, after: "${after}"` : ""}) {
              edges {
                node {
                  id
                  firstName
                  lastName
                  email
                  phone
                  address
                  city
                  province
                  postalCode
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `);

        const clients = response.data?.clients?.edges || [];
        if (clients.length === 0) break;

        for (const edge of clients) {
          try {
            await this.processCustomer(edge.node);
            imported++;
          } catch (error) {
            errors.push(`Failed to import customer: ${(error as Error).message}`);
          }
        }

        if (!response.data?.clients?.pageInfo?.hasNextPage) break;
        after = response.data?.clients?.pageInfo?.endCursor;
      }
    } catch (error) {
      errors.push(`Import failed: ${(error as Error).message}`);
    }

    return imported;
  }

  private async importJobs(jobId: number, errors: string[]): Promise<number> {
    let imported = 0;
    let after: string | null = null;

    try {
      while (true) {
        const response = await this.makeGraphQLRequest(`
          query {
            jobs(first: 100${after ? `, after: "${after}"` : ""}) {
              edges {
                node {
                  id
                  clientId
                  jobNumber
                  description
                  amount
                  status
                  startDate
                  endDate
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `);

        const jobs = response.data?.jobs?.edges || [];
        if (jobs.length === 0) break;

        for (const edge of jobs) {
          try {
            await this.processJob(edge.node);
            imported++;
          } catch (error) {
            errors.push(`Failed to import job: ${(error as Error).message}`);
          }
        }

        if (!response.data?.jobs?.pageInfo?.hasNextPage) break;
        after = response.data?.jobs?.pageInfo?.endCursor;
      }
    } catch (error) {
      errors.push(`Import failed: ${(error as Error).message}`);
    }

    return imported;
  }

  private async importInvoices(jobId: number, errors: string[]): Promise<number> {
    let imported = 0;
    let after: string | null = null;

    try {
      while (true) {
        const response = await this.makeGraphQLRequest(`
          query {
            invoices(first: 100${after ? `, after: "${after}"` : ""}) {
              edges {
                node {
                  id
                  clientId
                  total
                  status
                  issuedDate
                  dueDate
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `);

        const invoices = response.data?.invoices?.edges || [];
        if (invoices.length === 0) break;

        for (const edge of invoices) {
          try {
            await this.processInvoice(edge.node);
            imported++;
          } catch (error) {
            errors.push(`Failed to import invoice: ${(error as Error).message}`);
          }
        }

        if (!response.data?.invoices?.pageInfo?.hasNextPage) break;
        after = response.data?.invoices?.pageInfo?.endCursor;
      }
    } catch (error) {
      errors.push(`Import failed: ${(error as Error).message}`);
    }

    return imported;
  }

  private async exportCustomer(customer: any): Promise<void> {
    await this.makeGraphQLRequest(`
      mutation {
        clientCreate(input: {
          firstName: "${customer.firstName}"
          lastName: "${customer.lastName}"
          email: "${customer.email}"
          phone: "${customer.phone}"
          address: "${customer.address}"
          city: "${customer.city}"
          province: "${customer.province}"
          postalCode: "${customer.postalCode}"
        }) {
          client {
            id
          }
        }
      }
    `);
  }

  private async exportJob(job: any): Promise<void> {
    await this.makeGraphQLRequest(`
      mutation {
        jobCreate(input: {
          clientId: "${job.customerId}"
          description: "${job.description}"
          amount: ${job.amount}
          startDate: "${job.startDate}"
        }) {
          job {
            id
          }
        }
      }
    `);
  }

  private async makeGraphQLRequest(query: string): Promise<any> {
    const response = await fetch("https://api.getjobber.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async processCustomer(customer: any): Promise<void> {
    await this.logActivity("customer_imported", { id: customer.id, name: customer.firstName });
  }

  private async processJob(job: any): Promise<void> {
    await this.logActivity("job_imported", { id: job.id, clientId: job.clientId });
  }

  private async processInvoice(invoice: any): Promise<void> {
    await this.logActivity("invoice_imported", { id: invoice.id, amount: invoice.total });
  }

  private async handleClientCreated(data: any): Promise<void> {
    await this.logActivity("client_created_webhook", data);
  }

  private async handleClientUpdated(data: any): Promise<void> {
    await this.logActivity("client_updated_webhook", data);
  }

  private async handleJobCompleted(data: any): Promise<void> {
    await this.logActivity("job_completed_webhook", data);
  }

  private async handleInvoicePaid(data: any): Promise<void> {
    await this.logActivity("invoice_paid_webhook", data);
  }
}
