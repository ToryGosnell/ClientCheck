import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { TRADE_TYPES } from "@/shared/types";
import {
  getMembershipDisplayState,
  getVerificationBadge,
  validateContractorLicenseNumber,
  PRICING_COPY,
} from "@/shared/membership";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, isAuthenticated, logout } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();

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

  const membershipDisplay = membership ? getMembershipDisplayState(membership) : null;
  const verificationBadge = getVerificationBadge(membership?.verificationStatus);

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

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6">
        <View style={styles.authPrompt}>
          <Text style={styles.authEmoji}>🔐</Text>
          <Text style={[styles.authTitle, { color: colors.foreground }]}>Sign In Required</Text>
          <Text style={[styles.authDesc, { color: colors.muted }]}>
            Please sign in to view and manage your contractor profile.
          </Text>
        </View>
      </ScreenContainer>
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
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {user?.name ?? "Contractor"}
            </Text>
            {user?.email && (
              <Text style={[styles.userEmail, { color: colors.muted }]}>{user.email}</Text>
            )}
          </View>
        </View>

        {/* Contractor Profile */}
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
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Membership</Text>

          {/* Verification badge */}
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
          {membership?.verificationStatus === "not_submitted" || membership?.verificationStatus === "rejected" ? (
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
          {membership?.verificationStatus === "verified" && membership?.planType === "none" ? (
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
  authPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  authEmoji: {
    fontSize: 56,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  authDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
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
});
