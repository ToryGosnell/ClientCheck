import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";

const TOOLTIP = "Identity Verified";
const PREFERRED_COPY = "Verified • Preferred by contractors";
const RANKING_TOOLTIP = "Verified customers appear higher in search results";

const webTitleProps = Platform.OS === "web" ? ({ title: TOOLTIP } as Record<string, unknown>) : {};

type BadgeSize = "sm" | "md";

const DIM: Record<BadgeSize, number> = { sm: 20, md: 24 };
const ICON: Record<BadgeSize, number> = { sm: 13, md: 15 };

/**
 * Gradient check badge for Stripe-linked customer identity verification.
 * Web: native tooltip via `title`. Native: accessibilityLabel.
 */
export function CustomerIdentityVerifiedBadge({ size = "sm" }: { size?: BadgeSize }) {
  const dim = DIM[size];
  const icon = ICON[size];
  const glowStyle =
    Platform.OS === "web"
      ? ({
          boxShadow:
            "0 0 12px rgba(34, 197, 94, 0.5), 0 0 8px rgba(37, 99, 235, 0.35), 0 0 2px rgba(255,255,255,0.4)",
        } as object)
      : {
          shadowColor: "#22c55e",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.55,
          shadowRadius: 6,
          elevation: 4,
        };

  return (
    <View
      {...webTitleProps}
      accessible
      accessibilityLabel={TOOLTIP}
      accessibilityHint={TOOLTIP}
      style={[glowStyle, styles.pad, { borderRadius: dim / 2 + 3 }]}
    >
      <LinearGradient
        colors={["#2563eb", "#0d9488", "#22c55e"]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { width: dim, height: dim, borderRadius: dim / 2 }]}
      >
        <MaterialIcons name="check" size={icon} color="#fff" />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 2 },
  gradient: { alignItems: "center", justifyContent: "center" },
});

/** Full customer display name with optional identity badge (same row). */
export function CustomerNameWithVerifiedBadge({
  firstName,
  lastName,
  identityVerified,
  showPreferredByContractorsCopy,
  textStyle,
  numberOfLines,
}: {
  firstName: string;
  lastName: string;
  identityVerified?: boolean;
  /** When verified, show contractor preference + search-ranking hint (search / profile contexts). */
  showPreferredByContractorsCopy?: boolean;
  textStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const colors = useColors();
  const preferredWebTitle =
    Platform.OS === "web" ? ({ title: RANKING_TOOLTIP } as Record<string, unknown>) : {};

  return (
    <View style={rowStyles.nameBlock}>
      <View style={rowStyles.row}>
        <Text style={textStyle} numberOfLines={numberOfLines}>
          {firstName} {lastName}
        </Text>
        {identityVerified ? <CustomerIdentityVerifiedBadge size="sm" /> : null}
      </View>
      {identityVerified && showPreferredByContractorsCopy ? (
        <Text
          {...preferredWebTitle}
          accessibilityLabel={RANKING_TOOLTIP}
          style={[rowStyles.preferredCopy, { color: colors.muted }]}
          numberOfLines={2}
        >
          {PREFERRED_COPY}
        </Text>
      ) : null}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  nameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    minWidth: 0,
  },
  preferredCopy: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
