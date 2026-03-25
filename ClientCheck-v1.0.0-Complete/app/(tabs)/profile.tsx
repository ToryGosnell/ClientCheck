import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuthWithLoginRedirect } from "@/hooks/use-auth-with-login-redirect";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { TRADE_TYPES } from "@/shared/types";
import { isAdmin, isContractor } from "@/shared/roles";
import {
  getMembershipDisplayState,
  getCustomerMembershipDisplayState,
  getVerificationBadge,
  validateContractorLicenseNumber,
  PRICING_COPY,
} from "@/shared/membership";
import { CustomerVerifyBadgeButton } from "@/components/customer-verify-badge-button";
import { CustomerIdentityVerifiedBadge } from "@/components/customer-identity-verified-badge";
import { DEMO_MODE } from "@/lib/demo-data";
import { generateContractorReferralLink } from "@/lib/contractor-referral-link";
import { openVerificationPaywall } from "@/lib/verification-paywall-navigation";
import {
  hasPaywallBeenShownForTrigger,
  markPaywallShownForTrigger,
} from "@/lib/verification-paywall-dedupe";
import {
  shouldShowVerificationPaywall,
  type VerificationPaywallTrigger,
} from "@/shared/verification-conversion";

const CUSTOMER_VERIFY_PAYWALL_TRIGGER_ORDER: VerificationPaywallTrigger[] = [
  "profile_viewed_by_contractor",
  "high_risk_flag",
  "submit_review_first_time",
];

export default function ProfileScreen() {
  const colors = useColors();
  const { user, isAuthenticated, logout, contentReady } = useAuthWithLoginRedirect();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const trpcUtils = trpc.useUtils();

  const { data: profile, isLoading, refetch } = trpc.contractor.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const upsertProfile = trpc.contractor.upsertProfile.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert("Saved", "Your profile has been updated.");
    },
  });

  const { data: membership, refetch: refetchMembership } = trpc.subscription.getMembership.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const submitLicenseMutation = trpc.verification.submitLicenseNumber.useMutation({
    onSuccess: () => {
      refetch();
      refetchMembership();
      setLicenseSubmitField("");
      Alert.alert("Submitted", "Your license number is being reviewed.");
    },
  });
  const activateFreeYearMutation = trpc.subscription.activateFreeYear.useMutation({
    onSuccess: () => {
      refetchMembership();
      Alert.alert("Activated", "Your 12-month free membership is now active.");
    },
  });
  const { data: referralStats, refetch: refetchReferralStats } = trpc.contractor.getReferralStats.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role !== "customer" },
  );
  const { data: leaderboardPreview } = trpc.contractor.getReferralLeaderboardPreview.useQuery(undefined, {
    enabled: isAuthenticated && (isContractor(user) || isAdmin(user)),
  });
  const dismissReferralReward = trpc.contractor.dismissReferralReward.useMutation({
    onSuccess: () => refetchReferralStats(),
  });
  const rewardAlertGateRef = useRef(false);

  useEffect(() => {
    if (DEMO_MODE || user?.role === "admin" || !referralStats?.referralRewardUnseen) {
      rewardAlertGateRef.current = false;
      return;
    }
    if (rewardAlertGateRef.current) return;
    rewardAlertGateRef.current = true;
    Alert.alert(
      "🎉 You earned 1 free month!",
      "Thanks for helping other contractors find ClientCheck. Your subscription time has been extended.",
      [
        {
          text: "OK",
          onPress: () => dismissReferralReward.mutate(),
        },
      ],
    );
  }, [referralStats?.referralRewardUnseen, dismissReferralReward, user?.role]);
  const softDeleteAccount = trpc.contractor.softDeleteAccount.useMutation({
    async onSuccess() {
      await logout();
      router.replace("/select-account" as never);
    },
    onError(err) {
      Alert.alert("Could not close account", err.message ?? "Please try again or contact support.");
    },
  });

  const [editing, setEditing] = useState(false);
  const [trade, setTrade] = useState("");
  const [company, setCompany] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [bio, setBio] = useState("");
  const [showTradePicker, setShowTradePicker] = useState(false);
  const [licenseSubmitField, setLicenseSubmitField] = useState("");
  const [licenseError, setLicenseError] = useState("");
  const isCustomer = user?.role === "customer";
  const showCustomerVerifyBadge =
    !!user &&
    isCustomer &&
    !user.isVerified &&
    (!membership || membership.membershipStatus === "customer_free");
  const membershipDisplay = membership
    ? isCustomer
      ? getCustomerMembershipDisplayState({
          planType: membership.planType,
          subscriptionEndsAt: membership.subscriptionEndsAt,
        })
      : getMembershipDisplayState(membership as never)
    : null;
  const verificationBadge = !isCustomer ? getVerificationBadge(membership?.verificationStatus) : null;

  useFocusEffect(
    useCallback(() => {
      if (DEMO_MODE || !user || !isCustomer || user.isVerified) return;
      let cancelled = false;
      void (async () => {
        try {
          const data = await trpcUtils.customers.getMyDirectoryInsights.fetch();
          if (cancelled || !data?.matched) return;
          const extra = {
            directoryReviewCount: data.directoryReviewCount,
            contractorProfileViewCount: data.contractorProfileViewCount,
            riskScore: data.engineRiskScore,
            riskLevel: data.directoryRiskLevel,
            engineRiskLevel: data.engineRiskLevel,
            criticalRedFlagCount: data.criticalRedFlagCount,
          };
          for (const ctx of CUSTOMER_VERIFY_PAYWALL_TRIGGER_ORDER) {
            if (!shouldShowVerificationPaywall(ctx, user, extra)) continue;
            if (await hasPaywallBeenShownForTrigger(ctx)) continue;
            await markPaywallShownForTrigger(ctx);
            openVerificationPaywall(router, ctx);
            break;
          }
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user, isCustomer, trpcUtils, router]),
  );

  const handleSubmitLicense = () => {
    const validation = validateContractorLicenseNumber(licenseSubmitField);
    if (!validation.valid) {
      setLicenseError(validation.error ?? "Invalid license number");
      return;
    }
    setLicenseError("");
    submitLicenseMutation.mutate({ licenseNumber: licenseSubmitField.trim() });
  };

  const startEditing = () => {
    setTrade(profile?.trade ?? "");
    setCompany(profile?.company ?? "");
    setLicenseNumber(profile?.licenseNumber ?? "");
    setCity(profile?.city ?? "");
    setState(profile?.state ?? "");
    setBio(profile?.bio ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    await upsertProfile.mutateAsync({
      trade: trade || undefined,
      company: company || undefined,
      licenseNumber: licenseNumber || undefined,
      city: city || undefined,
      state: state || undefined,
      bio: bio || undefined,
    });
    setEditing(false);
  };

  const handleDeleteContractorAccount = () => {
    Alert.alert(
      "Delete contractor account?",
      "Customers you entered and reviews you submitted stay in ClientCheck for the community. Your sign-in will stop working and profile data on this account will be cleared. Subscription billing is cancelled when applicable. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => softDeleteAccount.mutate({ confirm: "DELETE_MY_ACCOUNT" }),
        },
      ],
    );
  };

  const showContractorAccountClosure =
    user?.role === "contractor" || user?.role === "user";

  if (!contentReady) {
    return (
      <ScreenBackground backgroundKey="auth">
        <ScreenContainer
          edges={["top", "left", "right"]}
          containerClassName="bg-transparent"
          className="flex-1 items-center justify-center"
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </ScreenContainer>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground backgroundKey="profile">
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-transparent">
      <View style={[styles.titleBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        {!editing && (
          <Pressable
            onPress={startEditing}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.editBtn, { color: colors.primary }]}>Edit</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.userAvatarText}>
              {(user?.name ?? "C")[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={[styles.userName, { color: colors.foreground }]}>
                {user?.name ?? "Contractor"}
              </Text>
              {isCustomer && user?.isVerified ? <CustomerIdentityVerifiedBadge size="md" /> : null}
            </View>
            {user?.email && (
              <Text style={[styles.userEmail, { color: colors.muted }]}>{user.email}</Text>
            )}
          </View>
        </View>

        {/* Customer summary (contractor tools are separate) */}
        {isCustomer ? (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Customer account</Text>
            <Text style={[styles.aboutText, { color: colors.muted }]}>
              Your account is free: view your profile, see reviews associated with you, respond publicly, and submit
              disputes. An identity verification badge is optional — open Billing anytime to add it.
            </Text>
            {showCustomerVerifyBadge ? <CustomerVerifyBadgeButton /> : null}
            <Pressable
              onPress={() => router.push("/subscription" as never)}
              style={({ pressed }) => [styles.linkRow, { borderTopColor: colors.border, marginTop: 8 }, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.linkLabel, { color: colors.foreground }]}>Billing & optional upgrades</Text>
              <Text style={[styles.linkArrow, { color: colors.muted }]}>›</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Contractor Profile */}
        {!isCustomer ? (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contractor Details</Text>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : editing ? (
            <View style={styles.form}>
              {/* Trade Picker */}
              <View>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Trade / Specialty</Text>
                <Pressable
                  onPress={() => setShowTradePicker(!showTradePicker)}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <Text style={[styles.inputText, { color: trade ? colors.foreground : colors.muted }]}>
                    {trade || "Select your trade..."}
                  </Text>
                </Pressable>
                {showTradePicker && (
                  <View style={[styles.tradePicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {TRADE_TYPES.map((t) => (
                      <Pressable
                        key={t}
                        onPress={() => {
                          setTrade(t);
                          setShowTradePicker(false);
                        }}
                        style={({ pressed }) => [
                          styles.tradeOption,
                          { borderBottomColor: colors.border },
                          pressed && { backgroundColor: colors.background },
                          trade === t && { backgroundColor: colors.primary + "18" },
                        ]}
                      >
                        <Text style={[styles.tradeOptionText, { color: trade === t ? colors.primary : colors.foreground }]}>
                          {t}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Company Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Your company name"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>License Number (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  placeholder="State license number"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>City</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View style={{ width: 80 }}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>State</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    value={state}
                    onChangeText={setState}
                    placeholder="ST"
                    placeholderTextColor={colors.muted}
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Bio</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell other contractors about yourself..."
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formActions}>
                <Pressable
                  onPress={() => setEditing(false)}
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={upsertProfile.isPending}
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                >
                  {upsertProfile.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Profile</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.profileDisplay}>
              {profile ? (
                <>
                  {!!profile.trade && (
                    <View style={styles.profileRow}>
                      <Text style={[styles.profileLabel, { color: colors.muted }]}>Trade</Text>
                      <Text style={[styles.profileValue, { color: colors.foreground }]}>{profile.trade}</Text>
                    </View>
                  )}
                  {!!profile.company && (
                    <View style={styles.profileRow}>
                      <Text style={[styles.profileLabel, { color: colors.muted }]}>Company</Text>
                      <Text style={[styles.profileValue, { color: colors.foreground }]}>{profile.company}</Text>
                    </View>
                  )}
                  {!!profile.licenseNumber && (
                    <View style={styles.profileRow}>
                      <Text style={[styles.profileLabel, { color: colors.muted }]}>License #</Text>
                      <Text style={[styles.profileValue, { color: colors.foreground }]}>{profile.licenseNumber}</Text>
                    </View>
                  )}
                  {!!(profile.city || profile.state) && (
                    <View style={styles.profileRow}>
                      <Text style={[styles.profileLabel, { color: colors.muted }]}>Location</Text>
                      <Text style={[styles.profileValue, { color: colors.foreground }]}>
                        {[profile.city, profile.state].filter(Boolean).join(", ")}
                      </Text>
                    </View>
                  )}
                  {!!profile.bio && (
                    <View style={styles.profileRow}>
                      <Text style={[styles.profileLabel, { color: colors.muted }]}>Bio</Text>
                      <Text style={[styles.profileValue, { color: colors.foreground }]}>{profile.bio}</Text>
                    </View>
                  )}
                  {!profile.trade && !profile.company && (
                    <Text style={[styles.noProfile, { color: colors.muted }]}>
                      Tap Edit to add your contractor details.
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.noProfile, { color: colors.muted }]}>
                  Tap Edit to set up your contractor profile.
                </Text>
              )}
            </View>
          )}
        </View>
        ) : null}

        {/* App Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>App Settings</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>Dark Mode</Text>
            <Text style={[styles.settingValue, { color: colors.muted }]}>
              {colorScheme === "dark" ? "On" : "Off"} (System)
            </Text>
          </View>
        </View>

        {/* Membership & Verification */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {isCustomer ? "Account & billing" : "Membership"}
          </Text>

          {/* Verification badge (contractor license flow) */}
          {!isCustomer && verificationBadge ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <View style={{ backgroundColor: verificationBadge.bgColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: verificationBadge.color, fontSize: 13, fontWeight: "600" }}>
                {verificationBadge.label}
              </Text>
            </View>
            {!!membership?.contractorLicenseNumber && (
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                License: {membership.contractorLicenseNumber}
              </Text>
            )}
          </View>
          ) : null}

          {/* Membership status */}
          {membershipDisplay ? (
            <View style={{ gap: 6, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 20 }}>{membershipDisplay.statusEmoji}</Text>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600", flex: 1 }}>
                  {membershipDisplay.headline}
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                {membershipDisplay.description}
              </Text>
              {!!membershipDisplay.expiresAt && (
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Expires: {membershipDisplay.expiresAt}
                </Text>
              )}
              {membershipDisplay.showRenewalReminder && !!membershipDisplay.renewalReminderText && (
                <View style={{ backgroundColor: "#f59e0b18", borderRadius: 8, padding: 10, marginTop: 4 }}>
                  <Text style={{ color: "#f59e0b", fontSize: 13, lineHeight: 18 }}>
                    {membershipDisplay.renewalReminderText}
                  </Text>
                </View>
              )}
              {membershipDisplay.showAddPayment && (
                <Pressable
                  onPress={() => router.push("/subscription")}
                  style={({ pressed }) => [
                    { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 6 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Add Payment Method</Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {/* License submission (only show if not yet submitted) */}
          {!isCustomer &&
          (membership?.verificationStatus === "not_submitted" || membership?.verificationStatus === "rejected") ? (
            <View style={{ gap: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: colors.border }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                Submit Contractor License
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
                {PRICING_COPY.freeOffer}. {PRICING_COPY.licenseRequired}.
              </Text>
              <TextInput
                value={licenseSubmitField}
                onChangeText={setLicenseSubmitField}
                placeholder="e.g. CSLB-1045678"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              />
              {!!licenseError && (
                <Text style={{ color: colors.error, fontSize: 12 }}>{licenseError}</Text>
              )}
              <Pressable
                onPress={handleSubmitLicense}
                disabled={submitLicenseMutation.isPending}
                style={({ pressed }) => [
                  { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                  {submitLicenseMutation.isPending ? "Submitting..." : "Submit for Verification"}
                </Text>
              </Pressable>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15 }}>
                {PRICING_COPY.afterFree}. {PRICING_COPY.reminderNotice}.
              </Text>
            </View>
          ) : null}

          {/* Activate free year if verified but not yet activated */}
          {!isCustomer && membership?.verificationStatus === "verified" && membership?.planType === "none" ? (
            <View style={{ gap: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: colors.border }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                Activate Your Free 12 Months
              </Text>
              <Pressable
                onPress={() => activateFreeYearMutation.mutate()}
                disabled={activateFreeYearMutation.isPending}
                style={({ pressed }) => [
                  { backgroundColor: "#16a34a", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  {activateFreeYearMutation.isPending ? "Activating..." : "Activate Free Year"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            onPress={() => router.push("/subscription")}
            style={({ pressed }) => [
              styles.linkRow,
              { borderBottomColor: colors.border, marginTop: 8 },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.linkLabel, { color: colors.foreground }]}>Manage Subscription</Text>
            <Text style={[styles.linkArrow, { color: colors.muted }]}>›</Text>
          </Pressable>
        </View>

        {/* Contractor referrals */}
        {!isCustomer && user?.id && referralStats ? (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.referralSectionHeaderRow}>
              <Text style={[styles.sectionTitle, styles.referralSectionTitleFlex, { color: colors.foreground }]}>
                Invite contractors. Earn free months.
              </Text>
              <View style={[styles.scarcityPill, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}55` }]}>
                <Text style={[styles.scarcityPillText, { color: colors.primary }]}>Limited early access period</Text>
              </View>
            </View>
            <Text style={[styles.aboutText, { color: colors.muted, marginBottom: 8 }]}>
              Invite other contractors. Get 1 free month for every 5 verified signups (they must complete contractor
              verification).
            </Text>
            <Text style={[styles.referralVelocityLine, { color: colors.muted }]}>
              Most contractors earn their first free month in under 7 days
            </Text>
            <View
              style={[
                styles.referralRewardHighlight,
                { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}0d` },
              ]}
            >
              <Text style={[styles.referralRewardHighlightTitle, { color: colors.foreground }]}>Reward</Text>
              <Text style={[styles.referralRewardHighlightValue, { color: colors.primary }]}>
                1 free month per 5 verified referrals
              </Text>
            </View>
            {(() => {
              const link = generateContractorReferralLink(user.id);
              const shareText = `Check customers before you take the job — join me on ClientCheck: ${link}`;
              const v = referralStats.verifiedReferralCount;
              const slotNum = v % 5 === 0 && v > 0 ? 5 : v % 5;
              const progress = slotNum / 5;
              return (
                <>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8, lineHeight: 18, marginTop: 4 }} selectable>
                    {link}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    <Pressable
                      onPress={() => void Clipboard.setStringAsync(link)}
                      style={({ pressed }) => [styles.referralChip, { borderColor: colors.border }, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>Copy link</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const url = `sms:?body=${encodeURIComponent(shareText)}`;
                        if (Platform.OS === "web" && typeof window !== "undefined") window.location.href = url;
                        else void Linking.openURL(url);
                      }}
                      style={({ pressed }) => [styles.referralChip, { borderColor: colors.border }, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>SMS</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
                        if (Platform.OS === "web" && typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
                        else void Linking.openURL(url);
                      }}
                      style={({ pressed }) => [styles.referralChip, { borderColor: colors.border }, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>Facebook</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareText)}`)
                      }
                      style={({ pressed }) => [styles.referralChip, { borderColor: colors.border }, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>WhatsApp</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ color: colors.foreground, fontWeight: "700" }}>Total invites</Text>
                    <Text style={{ color: colors.muted }}>{referralStats.referralCount}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ color: colors.foreground, fontWeight: "700" }}>Verified referrals</Text>
                    <Text style={{ color: colors.muted }}>
                      {slotNum} / 5 this cycle
                    </Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden", marginBottom: 10 }}>
                    <View style={{ height: "100%", width: `${progress * 100}%`, backgroundColor: colors.primary }} />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 4 }}>
                    Next reward in {referralStats.nextReferralsUntilReward} verified referral
                    {referralStats.nextReferralsUntilReward === 1 ? "" : "s"}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Free months earned: {referralStats.freeMonthsEarned}
                    {referralStats.subscriptionExtendedUntil
                      ? ` · Extended through ${new Date(referralStats.subscriptionExtendedUntil).toLocaleDateString()}`
                      : ""}
                  </Text>
                </>
              );
            })()}
          </View>
        ) : null}

        {!isCustomer && user?.id && referralStats ? (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>Top Referrers</Text>
            {leaderboardPreview && leaderboardPreview.entries.length > 0 ? (
              <View style={{ gap: 10 }}>
                {leaderboardPreview.entries.map((row) => (
                  <View
                    key={row.rank}
                    style={[styles.leaderboardRow, { borderColor: colors.border, backgroundColor: colors.background }]}
                  >
                    <Text style={styles.leaderboardMedal} accessibilityLabel={`Rank ${row.rank}`}>
                      {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : "🥉"}
                    </Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
                        {row.displayName}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                        {row.verifiedCount} verified referral{row.verifiedCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.leaderboardTeaserCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16, marginBottom: 6 }}>
                  Top Referrers leaderboard coming soon
                </Text>
                <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
                  See which contractors are leading the community.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
          <Text style={[styles.aboutText, { color: colors.muted }]}>
            ClientCheck helps contractors vet customers before accepting jobs. Reviews are submitted by verified contractors and reflect real job experiences.
          </Text>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.muted }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: colors.foreground }]}>1.0.0</Text>
          </View>
          <Pressable
            onPress={() => router.push("/licenses")}
            style={({ pressed }) => [
              styles.linkRow,
              { borderTopColor: colors.border, borderTopWidth: 0.5 },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.linkLabel, { color: colors.foreground }]}>Open Source Licenses</Text>
            <Text style={[styles.linkArrow, { color: colors.muted }]}>›</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/privacy" as never)}
            style={({ pressed }) => [
              styles.linkRow,
              { borderTopColor: colors.border, borderTopWidth: 0.5 },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.linkLabel, { color: colors.foreground }]}>Privacy Policy</Text>
            <Text style={[styles.linkArrow, { color: colors.muted }]}>›</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/terms" as never)}
            style={({ pressed }) => [
              styles.linkRow,
              { borderTopColor: colors.border, borderTopWidth: 0.5 },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.linkLabel, { color: colors.foreground }]}>Terms & Conditions</Text>
            <Text style={[styles.linkArrow, { color: colors.muted }]}>›</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/dmca-takedown")}
            style={({ pressed }) => [
              styles.linkRow,
              { borderTopColor: colors.border, borderTopWidth: 0.5 },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.linkLabel, { color: colors.foreground }]}>Report DMCA/Copyright</Text>
            <Text style={[styles.linkArrow, { color: colors.muted }]}>›</Text>
          </Pressable>
        </View>

        {showContractorAccountClosure ? (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.error + "55",
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.error }]}>Danger zone</Text>
            <Text style={[styles.dangerHint, { color: colors.muted }]}>
              Soft-delete your contractor account. Customer records and your review history are not removed.
            </Text>
            <Pressable
              onPress={handleDeleteContractorAccount}
              disabled={softDeleteAccount.isPending}
              style={({ pressed }) => [
                styles.dangerDeleteBtn,
                {
                  backgroundColor: colors.error + "14",
                  borderColor: colors.error + "55",
                  opacity: softDeleteAccount.isPending ? 0.6 : 1,
                },
                pressed && !softDeleteAccount.isPending && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.dangerDeleteBtnText, { color: colors.error }]}>
                {softDeleteAccount.isPending ? "Closing account…" : "Delete contractor account"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Logout */}
        <Pressable
          onPress={logout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.error + "18", borderColor: colors.error + "44" },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  titleBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  editBtn: {
    fontSize: 17,
    fontWeight: "500",
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  dangerHint: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  dangerDeleteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  dangerDeleteBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 14,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  form: {
    gap: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputText: {
    fontSize: 15,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
  },
  tradePicker: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
    overflow: "hidden",
  },
  tradeOption: {
    padding: 12,
    borderBottomWidth: 0.5,
  },
  tradeOptionText: {
    fontSize: 15,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  profileDisplay: {
    gap: 10,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  profileLabel: {
    fontSize: 13,
    width: 80,
  },
  profileValue: {
    fontSize: 14,
    flex: 1,
    textAlign: "right",
    fontWeight: "500",
  },
  noProfile: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 15,
  },
  settingValue: {
    fontSize: 14,
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 18,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  aboutLabel: {
    fontSize: 13,
  },
  aboutValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  logoutBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  linkArrow: {
    fontSize: 20,
    fontWeight: "300",
  },
  referralChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  referralSectionHeaderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 4,
  },
  referralSectionTitleFlex: {
    flex: 1,
    minWidth: 180,
    marginBottom: 0,
  },
  scarcityPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  scarcityPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  referralVelocityLine: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  referralRewardHighlight: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  referralRewardHighlightTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
    opacity: 0.85,
  },
  referralRewardHighlightValue: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  leaderboardMedal: {
    fontSize: 22,
    width: 32,
    textAlign: "center",
  },
  leaderboardTeaserCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
