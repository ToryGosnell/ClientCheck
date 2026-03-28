import { Tabs, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { DEMO_MODE } from "@/lib/demo-data";
import { SafeLoadingScreen } from "@/components/safe-loading-screen";
import { ErrorBoundary } from "@/components/error-boundary";

/** Tab segments that require sign-in (search, reviews, profile, and related). */
const AUTH_REQUIRED_TAB_SEGMENTS = new Set([
  "advanced-search",
  "search",
  "my-reviews",
  "profile",
  "pre-job-risk-check",
]);

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const { user, loading, isAuthenticated } = useAuth();
  console.log("[TAB LAYOUT] render", {
    loading,
    hasUser: !!user,
    role: user?.role ?? null,
  });

  const showMemberTabs = isAuthenticated;

  useEffect(() => {
    if (DEMO_MODE) return;
    if (!navState?.key) return;
    if (loading) return;
    if (isAuthenticated) return;
    const leaf = segments[segments.length - 1];
    if (typeof leaf === "string" && AUTH_REQUIRED_TAB_SEGMENTS.has(leaf)) {
      router.replace("/select-account" as never);
    }
  }, [navState?.key, loading, isAuthenticated, segments, router]);

  const legalQuery = trpc.legal.getAcceptanceStatus.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (user && legalQuery.data && !legalQuery.data.accepted) {
      router.replace("/legal-acceptance" as never);
    }
  }, [user, legalQuery.data]);

  if (loading) {
    return <SafeLoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            paddingTop: 8,
            paddingBottom: bottomPadding,
            height: tabBarHeight,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="advanced-search"
          options={{
            title: "Search",
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="magnifyingglass" color={color} />,
            href: showMemberTabs ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="my-reviews"
          options={{
            title: "My Reviews",
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="doc.text.fill" color={color} />,
            href: showMemberTabs ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: "Analytics",
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: "Alerts",
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="exclamationmark.triangle.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
            href: showMemberTabs ? undefined : null,
          }}
        />
        {/* Hidden tab routes — accessible by navigation but not shown in tab bar */}
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="pre-job-risk-check" options={{ href: null }} />
      </Tabs>
    </ErrorBoundary>
  );
}
