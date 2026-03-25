import { useColors } from "@/hooks/use-colors";
import { track } from "@/lib/analytics";
import * as Api from "@/lib/_core/api";
import { generateShareLink } from "@/lib/customer-share-link";
import { DEMO_MODE } from "@/lib/demo-data";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  customerId: number;
  sharerUserId: number;
  customerLabel?: string;
  onClose: () => void;
  onViewProfile: () => void;
  onBackToSearch: () => void;
  onLeaveAnother: () => void;
};

const SMS_PREFIX = "Check this customer before you take the job: ";

export function ReviewShareGrowthModal({
  visible,
  customerId,
  sharerUserId,
  customerLabel,
  onClose,
  onViewProfile,
  onBackToSearch,
  onLeaveAnother,
}: Props) {
  const colors = useColors();
  const [copyBusy, setCopyBusy] = useState(false);
  const [weeklyViews, setWeeklyViews] = useState<number | null>(null);
  const [viewStatsStatus, setViewStatsStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const socialProofTrackedRef = useRef(false);

  const link = useMemo(
    () => generateShareLink(customerId, sharerUserId),
    [customerId, sharerUserId],
  );

  useEffect(() => {
    if (!visible) return;
    track("share_link_created", { customer_id: customerId, referrer_user_id: sharerUserId });
  }, [visible, customerId, sharerUserId]);

  useEffect(() => {
    if (!visible) {
      setWeeklyViews(null);
      setViewStatsStatus("idle");
      socialProofTrackedRef.current = false;
      return;
    }
    if (DEMO_MODE) {
      setWeeklyViews(null);
      setViewStatsStatus("done");
      return;
    }

    let cancelled = false;
    setViewStatsStatus("loading");
    setWeeklyViews(null);

    void (async () => {
      try {
        const data = await Api.apiCall<{ weeklyViews?: number }>(
          `/api/customers/${customerId}/view-stats`,
        );
        const n = typeof data?.weeklyViews === "number" ? Math.max(0, Math.floor(data.weeklyViews)) : 0;
        if (!cancelled) {
          setWeeklyViews(n);
          setViewStatsStatus("done");
        }
      } catch {
        if (!cancelled) {
          setWeeklyViews(null);
          setViewStatsStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, customerId]);

  useEffect(() => {
    if (!visible || viewStatsStatus !== "done" || socialProofTrackedRef.current) return;
    if (weeklyViews == null) return;
    socialProofTrackedRef.current = true;
    track("social_proof_seen", { customer_id: customerId, weekly_views: weeklyViews });
  }, [visible, viewStatsStatus, weeklyViews, customerId]);

  const trackShareAfterProof = useCallback(
    (channel: "sms" | "copy" | "facebook") => {
      if (weeklyViews != null && weeklyViews > 0) {
        track("share_clicked_after_social_proof", { customer_id: customerId, channel });
      }
    },
    [weeklyViews, customerId],
  );

  const shareSms = useCallback(() => {
    trackShareAfterProof("sms");
    const body = `${SMS_PREFIX}${link}`;
    const url = `sms:?body=${encodeURIComponent(body)}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = url;
      return;
    }
    void Linking.openURL(url);
  }, [link, trackShareAfterProof]);

  const shareFacebook = useCallback(() => {
    trackShareAfterProof("facebook");
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    void Linking.openURL(url);
  }, [link, trackShareAfterProof]);

  const copyLink = useCallback(async () => {
    if (copyBusy) return;
    trackShareAfterProof("copy");
    setCopyBusy(true);
    try {
      await Clipboard.setStringAsync(link);
    } finally {
      setCopyBusy(false);
    }
  }, [copyBusy, link, trackShareAfterProof]);

  const socialProofLine =
    viewStatsStatus === "loading" ? (
      <View style={styles.socialProofLoader}>
        <ActivityIndicator size="small" color={colors.muted} />
      </View>
    ) : viewStatsStatus === "done" && weeklyViews != null && weeklyViews > 0 ? (
      <Text style={[styles.socialProof, { color: colors.muted }]}>
        👀 {weeklyViews} contractor{weeklyViews === 1 ? "" : "s"} checked this customer this week
      </Text>
    ) : viewStatsStatus === "done" && weeklyViews === 0 ? (
      <Text style={[styles.socialProof, { color: colors.muted }]}>
        Be the first to warn others about this customer.
      </Text>
    ) : null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Want to protect other contractors?</Text>
          {socialProofLine}
          <Text style={[styles.sub, { color: colors.muted }]}>
            Share this customer so others can avoid bad jobs.
          </Text>
          {customerLabel ? (
            <Text style={[styles.nameHint, { color: colors.muted }]} numberOfLines={1}>
              {customerLabel}
            </Text>
          ) : null}

          <View style={styles.ctaCol}>
            <Pressable
              onPress={shareSms}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Share via SMS</Text>
            </Pressable>
            <Pressable
              onPress={() => void copyLink()}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: colors.border },
                pressed && { opacity: 0.85 },
              ]}
              disabled={copyBusy}
            >
              {copyBusy ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Copy link</Text>
              )}
            </Pressable>
            <Pressable
              onPress={shareFacebook}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: colors.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Share to Facebook</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Pressable onPress={onViewProfile} style={styles.textLink}>
              <Text style={[styles.textLinkLabel, { color: colors.primary }]}>View profile</Text>
            </Pressable>
            <Pressable onPress={onLeaveAnother} style={styles.textLink}>
              <Text style={[styles.textLinkLabel, { color: colors.primary }]}>Leave another review</Text>
            </Pressable>
            <Pressable onPress={onBackToSearch} style={styles.textLink}>
              <Text style={[styles.mutedLink, { color: colors.muted }]}>Back to Search</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.textLink}>
              <Text style={[styles.mutedLink, { color: colors.muted }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  socialProofLoader: {
    minHeight: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  socialProof: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 6,
  },
  nameHint: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  ctaCol: { gap: 10 },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
  footer: { marginTop: 20, gap: 6, alignItems: "center" },
  textLink: { paddingVertical: 6 },
  textLinkLabel: { fontSize: 15, fontWeight: "600" },
  mutedLink: { fontSize: 14, fontWeight: "500" },
});
