import { Alert } from "react-native";

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export class ApiErrorHandler {
  static handle(error: unknown, context: string = "API"): ApiError {
    console.error(`[${context}] Error:`, error);

    if (error instanceof Error) {
      return {
        message: error.message,
        code: "ERROR",
        details: error,
      };
    }

    if (typeof error === "object" && error !== null) {
      const err = error as Record<string, unknown>;
      return {
        message: (err.message as string) || "An error occurred",
        code: (err.code as string) || "UNKNOWN",
        status: (err.status as number) || undefined,
        details: error,
      };
    }

    return {
      message: "An unexpected error occurred",
      code: "UNKNOWN",
      details: error,
    };
  }

  static showAlert(error: ApiError, title: string = "Error") {
    Alert.alert(title, error.message, [
      {
        text: "OK",
        onPress: () => {},
      },
    ]);
  }

  static handleAndShow(error: unknown, context: string = "API", title: string = "Error") {
    const apiError = this.handle(error, context);
    this.showAlert(apiError, title);
    return apiError;
  }

  static isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes("Network") ||
        error.message.includes("fetch") ||
        error.message.includes("timeout")
      );
    }
    return false;
  }

  static isAuthError(error: unknown): boolean {
    if (typeof error === "object" && error !== null) {
      const err = error as Record<string, unknown>;
      return (err.status as number) === 401 || (err.status as number) === 403;
    }
    return false;
  }
}

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string = "API",
  showAlert: boolean = true
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const apiError = ApiErrorHandler.handle(error, context);
    if (showAlert) {
      ApiErrorHandler.showAlert(apiError, context);
    }
    return null;
  }
}
