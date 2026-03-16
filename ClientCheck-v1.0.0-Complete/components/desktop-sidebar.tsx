import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

const navItems: NavItem[] = [
  { label: "Home", icon: "🏠", route: "/" },
  { label: "Search", icon: "🔍", route: "/search" },
  { label: "Reviews", icon: "📝", route: "/reviews" },
  { label: "Analytics", icon: "📊", route: "/analytics" },
  { label: "Alerts", icon: "🚨", route: "/alerts" },
  { label: "Settings", icon: "⚙️", route: "/settings" },
];

export function DesktopSidebar({ currentRoute }: { currentRoute?: string }) {
  const router = useRouter();
  const colors = useColors();

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
        },
      ]}
    >
      <View style={styles.logo}>
        <Text style={[styles.logoText, { color: colors.primary }]}>CV</Text>
      </View>

      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {navItems.map((item) => {
          const isActive = currentRoute === item.route;
          return (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              style={[
                styles.navItem,
                isActive && {
                  backgroundColor: colors.primary + "20",
                  borderLeftColor: colors.primary,
                  borderLeftWidth: 3,
                },
              ]}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: isActive ? colors.primary : colors.foreground,
                    fontWeight: isActive ? "700" : "500",
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.footerText, { color: colors.muted }]}>
          ClientCheck
        </Text>
        <Text style={[styles.footerVersion, { color: colors.muted }]}>
          v1.0.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    flexDirection: "column",
  },
  logo: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "700",
  },
  navContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  navIcon: {
    fontSize: 20,
  },
  navLabel: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footerVersion: {
    fontSize: 10,
    marginTop: 4,
  },
});
