import { Request, Response, NextFunction } from "express";
import { db } from "@/server/_core/db";

/**
 * Request Logging & Error Tracking Middleware
 * Logs all requests and errors for monitoring and debugging
 */

export interface RequestLog {
  id?: number;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: number;
  userAgent?: string;
  ipAddress?: string;
  errorMessage?: string;
  errorStack?: string;
  createdAt: Date;
}

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override send to capture response
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log request
    logRequest({
      method: req.method,
      path: req.path,
      statusCode,
      duration,
      userId: (req as any).userId,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    // Log errors
    if (statusCode >= 400) {
      console.error(`[${req.method}] ${req.path} - ${statusCode} (${duration}ms)`);
    } else {
      console.log(`[${req.method}] ${req.path} - ${statusCode} (${duration}ms)`);
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  const duration = Date.now();

  // Log error
  logRequest({
    method: req.method,
    path: req.path,
    statusCode: res.statusCode || 500,
    duration,
    userId: (req as any).userId,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
    errorMessage: err.message,
    errorStack: err.stack,
  });

  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // Send error response
  res.status(res.statusCode || 500).json({
    error: err.message,
    requestId: (req as any).id,
  });
}

/**
 * Log request to database
 */
async function logRequest(log: RequestLog) {
  try {
    // In production, store in database or send to logging service
    // For now, just log to console
    const logEntry = {
      ...log,
      createdAt: new Date(),
    };

    // Send to external logging service (Datadog, New Relic, etc.)
    if (process.env.LOG_SERVICE_ENABLED === "true") {
      await sendToLoggingService(logEntry);
    }
  } catch (error) {
    console.error("Failed to log request:", error);
  }
}

/**
 * Send log to external logging service
 */
async function sendToLoggingService(log: RequestLog) {
  try {
    if (process.env.DATADOG_API_KEY) {
      await sendToDatadog(log);
    } else if (process.env.NEWRELIC_API_KEY) {
      await sendToNewRelic(log);
    } else if (process.env.CLOUDWATCH_ENABLED === "true") {
      await sendToCloudWatch(log);
    }
  } catch (error) {
    console.error("Failed to send log to service:", error);
  }
}

/**
 * Send log to Datadog
 */
async function sendToDatadog(log: RequestLog) {
  try {
    const response = await fetch("https://http-intake.logs.datadoghq.com/v1/input", {
      method: "POST",
      headers: {
        "DD-API-KEY": process.env.DATADOG_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hostname: "clientcheck-api",
        service: "clientcheck",
        ddsource: "nodejs",
        ddtags: `env:${process.env.NODE_ENV || "development"}`,
        message: `${log.method} ${log.path} - ${log.statusCode} (${log.duration}ms)`,
        ...log,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send log to Datadog:", response.statusText);
    }
  } catch (error) {
    console.error("Error sending log to Datadog:", error);
  }
}

/**
 * Send log to New Relic
 */
async function sendToNewRelic(log: RequestLog) {
  try {
    const response = await fetch("https://log-api.newrelic.com/log/v1", {
      method: "POST",
      headers: {
        "Api-Key": process.env.NEWRELIC_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        logs: [
          {
            timestamp: log.createdAt.getTime(),
            message: `${log.method} ${log.path} - ${log.statusCode}`,
            logtype: "http_request",
            ...log,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Failed to send log to New Relic:", response.statusText);
    }
  } catch (error) {
    console.error("Error sending log to New Relic:", error);
  }
}

/**
 * Send log to CloudWatch
 */
async function sendToCloudWatch(log: RequestLog) {
  try {
    // AWS CloudWatch integration would go here
    console.log("CloudWatch logging not yet implemented");
  } catch (error) {
    console.error("Error sending log to CloudWatch:", error);
  }
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  (req as any).id = requestId;
  res.set("X-Request-ID", requestId);
  next();
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = performance.now();

  res.on("finish", () => {
    const duration = performance.now() - startTime;

    // Alert if request took too long
    if (duration > 5000) {
      console.warn(`[SLOW] ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
    }

    // Track metrics
    trackMetric("http_request_duration", duration, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
    });
  });

  next();
}

/**
 * Track metrics
 */
function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  // Send to monitoring service
  if (process.env.METRICS_ENABLED === "true") {
    // Implementation would go here
  }
}

/**
 * Error tracking
 */
export class ErrorTracker {
  static async track(error: Error, context?: Record<string, any>) {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date(),
        environment: process.env.NODE_ENV,
      };

      // Send to error tracking service
      if (process.env.SENTRY_DSN) {
        await sendToSentry(errorData);
      }

      console.error("Error tracked:", errorData);
    } catch (err) {
      console.error("Failed to track error:", err);
    }
  }
}

/**
 * Send error to Sentry
 */
async function sendToSentry(error: any) {
  try {
    const response = await fetch(process.env.SENTRY_DSN || "", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: error.message,
        exception: {
          values: [
            {
              type: "Error",
              value: error.message,
              stacktrace: {
                frames: parseStackTrace(error.stack),
              },
            },
          ],
        },
        tags: {
          environment: error.environment,
        },
        timestamp: Math.floor(error.timestamp.getTime() / 1000),
      }),
    });

    if (!response.ok) {
      console.error("Failed to send error to Sentry:", response.statusText);
    }
  } catch (err) {
    console.error("Error sending to Sentry:", err);
  }
}

/**
 * Parse stack trace
 */
function parseStackTrace(stack?: string): any[] {
  if (!stack) return [];

  return stack
    .split("\n")
    .slice(1)
    .map((line) => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return {
          function: match[1],
          filename: match[2],
          lineno: parseInt(match[3]),
          colno: parseInt(match[4]),
        };
      }
      return null;
    })
    .filter(Boolean);
}
