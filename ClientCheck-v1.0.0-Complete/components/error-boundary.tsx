import React, { ReactNode, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    try {
      const Sentry = require("@sentry/react-native");
      Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    } catch {
      // Sentry not available — log only
    }
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-background p-4 justify-center">
          <ScrollView>
            <View className="bg-error/10 border border-error rounded-lg p-4 mb-4">
              <Text className="text-error font-bold text-lg mb-2">
                Oops! Something went wrong
              </Text>
              <Text className="text-muted text-sm mb-4">
                {this.state.error?.message || "An unexpected error occurred"}
              </Text>
              <TouchableOpacity
                onPress={() => this.setState({ hasError: false, error: null })}
                className="bg-primary p-3 rounded-lg"
              >
                <Text className="text-background font-semibold text-center">
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function ErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
