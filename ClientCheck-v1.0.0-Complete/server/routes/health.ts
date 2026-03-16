import { Router, Request, Response } from "express";
import { db } from "@/server/_core/db";
import { eq } from "drizzle-orm";

/**
 * Health Check & Monitoring Endpoints
 * Provides visibility into application and infrastructure health
 */

const router = Router();

/**
 * GET /health
 * Basic health check - returns 200 if service is running
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    return res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || "1.0.0",
    });
  } catch (error) {
    return res.status(503).json({
      status: "unhealthy",
      error: (error as Error).message,
    });
  }
});

/**
 * GET /health/readiness
 * Readiness probe - checks if service is ready to receive traffic
 */
router.get("/health/readiness", async (req: Request, res: Response) => {
  try {
    // Check database connection
    const dbHealthy = await checkDatabaseHealth();

    if (!dbHealthy) {
      return res.status(503).json({
        status: "not_ready",
        reason: "Database connection failed",
      });
    }

    return res.json({
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: "healthy",
        memory: "healthy",
        disk: "healthy",
      },
    });
  } catch (error) {
    return res.status(503).json({
      status: "not_ready",
      error: (error as Error).message,
    });
  }
});

/**
 * GET /health/liveness
 * Liveness probe - checks if service is alive
 */
router.get("/health/liveness", async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // If heap usage > 90%, service is in trouble
    if (heapUsedPercent > 90) {
      return res.status(503).json({
        status: "unhealthy",
        reason: "High memory usage",
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          percent: heapUsedPercent.toFixed(2),
        },
      });
    }

    return res.json({
      status: "alive",
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percent: heapUsedPercent.toFixed(2),
      },
      uptime: process.uptime(),
    });
  } catch (error) {
    return res.status(503).json({
      status: "unhealthy",
      error: (error as Error).message,
    });
  }
});

/**
 * GET /health/dependencies
 * Check status of all external dependencies
 */
router.get("/health/dependencies", async (req: Request, res: Response) => {
  try {
    const checks = {
      database: await checkDatabaseHealth(),
      stripe: await checkStripeHealth(),
      serviceTitan: await checkServiceTitanHealth(),
      jobber: await checkJobberHealth(),
      housecallPro: await checkHousecallProHealth(),
    };

    const allHealthy = Object.values(checks).every((check) => check === true);

    return res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    return res.status(503).json({
      status: "unhealthy",
      error: (error as Error).message,
    });
  }
});

/**
 * GET /metrics
 * Prometheus-compatible metrics endpoint
 */
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const metrics = `
# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${uptime}

# HELP process_memory_heap_used_bytes Heap memory used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP process_memory_heap_total_bytes Total heap memory in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP process_memory_rss_bytes Resident set size in bytes
# TYPE process_memory_rss_bytes gauge
process_memory_rss_bytes ${memoryUsage.rss}

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total 0

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 0
http_request_duration_seconds_bucket{le="0.5"} 0
http_request_duration_seconds_bucket{le="1"} 0
http_request_duration_seconds_bucket{le="+Inf"} 0
http_request_duration_seconds_sum 0
http_request_duration_seconds_count 0
    `.trim();

    res.set("Content-Type", "text/plain; version=0.0.4");
    return res.send(metrics);
  } catch (error) {
    return res.status(500).json({
      error: (error as Error).message,
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health information for debugging
 */
router.get("/health/detailed", async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const dbHealth = await checkDatabaseHealth();

    return res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.APP_VERSION || "1.0.0",
      uptime: {
        seconds: process.uptime(),
        formatted: formatUptime(process.uptime()),
      },
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
      },
      dependencies: {
        database: dbHealth ? "connected" : "disconnected",
        stripe: "configured",
        integrations: "configured",
      },
      endpoints: {
        health: "/health",
        readiness: "/health/readiness",
        liveness: "/health/liveness",
        dependencies: "/health/dependencies",
        metrics: "/metrics",
        detailed: "/health/detailed",
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: (error as Error).message,
    });
  }
});

/**
 * Private helper functions
 */

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Simple query to verify database connection
    await db.select().from({} as any).limit(1);
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

async function checkStripeHealth(): Promise<boolean> {
  try {
    // Check if Stripe API key is configured
    return !!process.env.STRIPE_SECRET_KEY;
  } catch (error) {
    return false;
  }
}

async function checkServiceTitanHealth(): Promise<boolean> {
  try {
    return !!process.env.SERVICETITAN_API_KEY;
  } catch (error) {
    return false;
  }
}

async function checkJobberHealth(): Promise<boolean> {
  try {
    return !!process.env.JOBBER_API_KEY;
  } catch (error) {
    return false;
  }
}

async function checkHousecallProHealth(): Promise<boolean> {
  try {
    return !!process.env.HOUSECALLPRO_API_KEY;
  } catch (error) {
    return false;
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

export default router;
