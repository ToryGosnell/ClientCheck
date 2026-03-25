import React, { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ADMIN_VISUAL } from "@/components/admin/admin-visual-tokens";

export type AdminNavItem = {
  key: string;
  label: string;
  /** Shown above the first item in a group; omit on subsequent rows in same group */
  groupLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  colors: any;
  userLabel: string;
  userInitials?: string;
  pageTitle: string;
  pageSubtitle?: string;
  breadcrumbCurrent?: string;
  navItems: AdminNavItem[];
  activeNavKey: string;
  onNav: (key: string) => void;
  onExit: () => void;
  globalSearchSlot?: React.ReactNode;
  children: React.ReactNode;
};

function initialsFrom(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  const s = parts[0] ?? "?";
  return s.slice(0, 2).toUpperCase();
}

export function AdminShell({
  colors,
  userLabel,
  userInitials,
  pageTitle,
  pageSubtitle,
  breadcrumbCurrent,
  navItems,
  activeNavKey,
  onNav,
  onExit,
  globalSearchSlot,
  children,
}: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 780;
  const sidebarW = compact ? 72 : 244;
  const initials = userInitials ?? initialsFrom(userLabel);
  const crumb = breadcrumbCurrent ?? pageTitle;

  const navByGroups = useMemo(() => {
    const out: { group: string; items: AdminNavItem[] }[] = [];
    for (const item of navItems) {
      const g = item.groupLabel ?? "Menu";
      const last = out[out.length - 1];
      if (last && last.group === g) {
        last.items.push(item);
      } else {
        out.push({ group: g, items: [item] });
      }
    }
    return out;
  }, [navItems]);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.sidebar,
          {
            width: sidebarW,
            backgroundColor: ADMIN_VISUAL.sidebarBg,
            borderRightColor: ADMIN_VISUAL.sidebarBorder,
          },
        ]}
      >
        <View style={[styles.sidebarBrand, compact && styles.sidebarBrandCompact]}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "40" }]}>
            <Ionicons name="shield-checkmark" size={compact ? 20 : 22} color={colors.primary} />
          </View>
          {!compact ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.brandTitle, { color: colors.foreground }]}>Control Center</Text>
              <Text style={[styles.brandSub, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={1}>
                {userLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
          {navByGroups.map((section, gi) => (
            <View key={section.group} style={[styles.navGroup, gi > 0 && { marginTop: 14 }]}>
              {!compact ? (
                <Text style={[styles.groupHeading, { color: ADMIN_VISUAL.groupLabel }]}>{section.group}</Text>
              ) : null}
              {section.items.map((item) => {
                const active = activeNavKey === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => onNav(item.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed, hovered }) => [
                      styles.navItem,
                      compact && styles.navItemCompact,
                      {
                        borderColor: active ? colors.primary + "50" : ADMIN_VISUAL.border,
                        backgroundColor: active
                          ? colors.primary + "18"
                          : pressed || hovered
                            ? ADMIN_VISUAL.surfaceHover
                            : ADMIN_VISUAL.surface,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={active ? colors.primary : ADMIN_VISUAL.textSubtle}
                      style={compact ? { marginRight: 0 } : { marginRight: 12 }}
                    />
                    {!compact ? (
                      <Text
                        style={[styles.navText, { color: active ? colors.foreground : ADMIN_VISUAL.textSubtle }]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    ) : null}
                    {active && !compact ? <View style={[styles.activeBar, { backgroundColor: colors.primary }]} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <Pressable
          onPress={onExit}
          style={({ pressed, hovered }) => [
            styles.exitNav,
            {
              borderColor: ADMIN_VISUAL.border,
              backgroundColor: pressed || hovered ? ADMIN_VISUAL.surfaceHover : "transparent",
            },
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color={ADMIN_VISUAL.textSubtle} style={{ marginRight: compact ? 0 : 8 }} />
          {!compact ? <Text style={{ color: ADMIN_VISUAL.textSubtle, fontSize: 13, fontWeight: "600" }}>Exit</Text> : null}
        </Pressable>
      </View>

      <View style={styles.main}>
        <View
          style={[
            styles.header,
            {
              borderBottomColor: ADMIN_VISUAL.border,
              backgroundColor: ADMIN_VISUAL.headerBg,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.breadcrumb, { color: ADMIN_VISUAL.textMuted }]}>
              Admin <Text style={{ color: ADMIN_VISUAL.textSubtle }}>/</Text>{" "}
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>{crumb}</Text>
            </Text>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>{pageTitle}</Text>
            {pageSubtitle ? (
              <Text style={[styles.pageSubtitle, { color: ADMIN_VISUAL.textMuted }]}>{pageSubtitle}</Text>
            ) : null}
          </View>

          <View style={styles.headerRight}>
            {globalSearchSlot}
            <View style={styles.headerUser}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "28", borderColor: colors.primary + "45" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
              </View>
              <View style={{ maxWidth: 140 }}>
                <View style={[styles.rolePill, { borderColor: ADMIN_VISUAL.purple + "40", backgroundColor: ADMIN_VISUAL.purpleMuted }]}>
                  <Text style={{ color: ADMIN_VISUAL.purple, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 }}>ADMIN</Text>
                </View>
                {!compact ? (
                  <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                    {userLabel}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

export function AdminGlobalSearchBar({
  colors,
  value,
  onChangeText,
  placeholder,
}: {
  colors: any;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  return (
    <View
      style={[
        styles.searchWrap,
        {
          borderColor: ADMIN_VISUAL.border,
          backgroundColor: ADMIN_VISUAL.surface,
        },
      ]}
    >
      <Ionicons name="search" size={18} color={ADMIN_VISUAL.textMuted} style={{ marginRight: 8 }} />
      <TextInput
        style={[styles.searchInput, { color: colors.foreground }]}
        placeholder={placeholder}
        placeholderTextColor={ADMIN_VISUAL.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10} style={styles.clearHit}>
          <Text style={{ color: ADMIN_VISUAL.textSubtle, fontSize: 12, fontWeight: "600" }}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  sidebar: { borderRightWidth: 1, paddingBottom: 10 },
  sidebarBrand: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, gap: 12 },
  sidebarBrandCompact: { justifyContent: "center", paddingHorizontal: 8 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  brandTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  brandSub: { fontSize: 11, marginTop: 2 },
  navScroll: { flex: 1, paddingTop: 4 },
  navGroup: { marginBottom: 18 },
  groupHeading: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 12,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginBottom: 4,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: ADMIN_VISUAL.radiusSm,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  navItemCompact: { justifyContent: "center", paddingHorizontal: 8, marginHorizontal: 8 },
  navText: { flex: 1, fontSize: 13, fontWeight: "600" },
  activeBar: { position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  exitNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: ADMIN_VISUAL.radiusSm,
    borderWidth: 1,
  },
  main: { flex: 1, minWidth: 0 },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 16,
  },
  headerLeft: { flex: 1, minWidth: 200 },
  headerRight: { flex: 1, minWidth: 220, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "flex-end", gap: 14 },
  breadcrumb: { fontSize: 11, marginBottom: 6, letterSpacing: 0.2 },
  pageTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 13, marginTop: 4, lineHeight: 18, maxWidth: 520 },
  headerUser: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarText: { fontSize: 14, fontWeight: "800" },
  rolePill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 24 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    borderRadius: ADMIN_VISUAL.radiusMd,
    borderWidth: 1,
    flex: 1,
    minWidth: 200,
    maxWidth: 400,
  },
  searchInput: { flex: 1, fontSize: 14, minWidth: 80, paddingVertical: Platform.OS === "web" ? 4 : 2 },
  clearHit: { paddingVertical: 4, paddingHorizontal: 4 },
});
