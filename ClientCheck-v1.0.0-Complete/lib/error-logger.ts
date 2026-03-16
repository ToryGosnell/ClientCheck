import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "info";
  message: string;
  context: string;
  stack?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

const MAX_LOGS = 100;
const LOGS_KEY = "error_logs";

export class ErrorLogger {
  static async log(
    message: string,
    context: string,
    level: "error" | "warning" | "info" = "error",
    metadata?: Record<string, unknown>,
    stack?: string
  ): Promise<void> {
    const errorLog: ErrorLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      stack,
      metadata,
    };

    try {
      const logs = await this.getLogs();
      logs.push(errorLog);

      // Keep only last MAX_LOGS
      if (logs.length > MAX_LOGS) {
        logs.shift();
      }

      await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));

      // Also log to console
      console.log(`[${level.toUpperCase()}] [${context}] ${message}`, metadata);
    } catch (err) {
      console.error("Failed to log error:", err);
    }
  }

  static async getLogs(): Promise<ErrorLog[]> {
    try {
      const logsJson = await AsyncStorage.getItem(LOGS_KEY);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (err) {
      console.error("Failed to get logs:", err);
      return [];
    }
  }

  static async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOGS_KEY);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  }

  static async exportLogs(): Promise<string> {
    try {
      const logs = await this.getLogs();
      return JSON.stringify(logs, null, 2);
    } catch (err) {
      console.error("Failed to export logs:", err);
      return "[]";
    }
  }

  static logError(message: string, context: string, error?: Error, metadata?: Record<string, unknown>) {
    this.log(message, context, "error", metadata, error?.stack);
  }

  static logWarning(message: string, context: string, metadata?: Record<string, unknown>) {
    this.log(message, context, "warning", metadata);
  }

  static logInfo(message: string, context: string, metadata?: Record<string, unknown>) {
    this.log(message, context, "info", metadata);
  }
}
