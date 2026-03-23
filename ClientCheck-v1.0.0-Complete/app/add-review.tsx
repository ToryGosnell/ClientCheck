import { useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenBackground } from "@/components/screen-background";
import { StarRating } from "@/components/star-rating";
import { CategoryRating } from "@/components/category-rating";
import { FlagChipsSection } from "@/components/red-flag-chip";
import { LegalDisclaimerModal } from "@/components/legal-disclaimer-modal";
import { useColors } from "@/hooks/use-colors";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { serializeFlags } from "@/shared/review-flags";
import { maskPhone, maskEmail } from "@/shared/customer-privacy";
import {
  REVIEW_CATEGORIES,
  REVIEW_CATEGORY_KEYS,
  type ReviewCategoryKey,
  type ReviewCategoryValue,
  type ReviewCategoryRatings,
  type WouldWorkAgainValue,
  emptyCategoryRatings,
  validateReviewRatings,
  serializeNewCategories,
  categoriesToLegacyFlat,
  getCalculatedOverallRating,
  getFinalOverallRating,
  getOverallRatingExplanation,
} from "@/shared/review-categories";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Platform as RNPlatform } from "react-native";
import { track } from "@/lib/analytics";

interface SelectedPhoto {
  uri: string;
  name: string;
  type: string;
}

export default function AddReviewScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    customerId?: string;
    customerName?: string;
  }>();

  const existingCustomerId = params.customerId ? parseInt(params.customerId, 10) : null;
  const existingCustomerName = params.customerName ?? "";

  // Customer search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(existingCustomerId);
  const [selectedCustomerName, setSelectedCustomerName] = useState(existingCustomerName);
  const [showSearch, setShowSearch] = useState(!existingCustomerId);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  // New customer fields
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newZip, setNewZip] = useState("");

  // Duplicate match state
  const [potentialMatches, setPotentialMatches] = useState<any[]>([]);
  const [showMatchSuggestions, setShowMatchSuggestions] = useState(false);
  const [matchLookupPending, setMatchLookupPending] = useState(false);
  const matchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced duplicate lookup as user fills new customer form
  const findMatches = trpc.customers.findMatches.useQuery(
    {
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      city: newCity.trim() || undefined,
      state: newState.trim() || undefined,
      zip: newZip.trim() || undefined,
    },
    { enabled: false },
  );

  const triggerMatchLookup = useCallback(() => {
    if (matchDebounceRef.current) clearTimeout(matchDebounceRef.current);
    const hasEnoughInfo =
      (newFirstName.trim().length >= 2 && newLastName.trim().length >= 2) ||
      newPhone.trim().length >= 7 ||
      (newEmail.trim().length >= 5 && newEmail.includes("@"));

    if (!hasEnoughInfo) {
      setPotentialMatches([]);
      setShowMatchSuggestions(false);
      return;
    }

    setMatchLookupPending(true);
    matchDebounceRef.current = setTimeout(async () => {
      try {
        const result = await findMatches.refetch();
        const matches = result.data ?? [];
        setPotentialMatches(matches);
        setShowMatchSuggestions(matches.length > 0);
      } catch {
        // Non-critical
      } finally {
        setMatchLookupPending(false);
      }
    }, 500);
  }, [newFirstName, newLastName, newPhone, newEmail, newCity, newState, newZip]);

  useEffect(() => {
    if (showNewCustomerForm) triggerMatchLookup();
  }, [newFirstName, newLastName, newPhone, newEmail, newCity, newState, triggerMatchLookup, showNewCustomerForm]);

  // Review fields
  const [categoryRatings, setCategoryRatings] = useState<ReviewCategoryRatings>(
    emptyCategoryRatings(),
  );
  const [wouldWorkAgain, setWouldWorkAgain] = useState<WouldWorkAgainValue>("na");
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  const [selectedGreenFlags, setSelectedGreenFlags] = useState<string[]>([]);

  const calculatedOverallRating = useMemo(
    () => getCalculatedOverallRating(categoryRatings),
    [categoryRatings],
  );
  const overallRating = useMemo(
    () => getFinalOverallRating(categoryRatings, wouldWorkAgain, selectedRedFlags, selectedGreenFlags),
    [categoryRatings, wouldWorkAgain, selectedRedFlags, selectedGreenFlags],
  );
  const overallRatingExplanation = useMemo(
    () => getOverallRatingExplanation(categoryRatings, wouldWorkAgain, selectedRedFlags, selectedGreenFlags),
    [categoryRatings, wouldWorkAgain, selectedRedFlags, selectedGreenFlags],
  );
  const [reviewText, setReviewText] = useState("");
  const [jobType, setJobType] = useState("");
  const [jobDate, setJobDate] = useState("");
  const [jobAmount, setJobAmount] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);

  // Legal disclaimer state
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);

  // API
  const { data: searchResults } = trpc.customers.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 },
  );
  const createCustomer = trpc.customers.create.useMutation();
  const utils = trpc.useUtils();
  const addReviewPhotos = trpc.reviews.addPhotos.useMutation();
  const createReview = trpc.reviews.create.useMutation({
    onSuccess: (_data, variables) => {
      track("review_created", { customer_id: variables.customerId, overall_rating: variables.overallRating });
      if (RNPlatform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Review Submitted", "Your review has been posted successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "Failed to submit review.");
    },
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const setCatScore = (key: ReviewCategoryKey, score: number) => {
    setCategoryRatings((prev) => ({
      ...prev,
      [key]: { score: score || null, notApplicable: false },
    }));
  };

  const setCatNa = (key: ReviewCategoryKey, na: boolean) => {
    setCategoryRatings((prev) => ({
      ...prev,
      [key]: na ? { score: null, notApplicable: true } : { score: null, notApplicable: false },
    }));
  };

  const toggleRedFlag = (flag: string) => {
    setSelectedRedFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
  };

  const toggleGreenFlag = (flag: string) => {
    setSelectedGreenFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
  };

  const handleSelectCustomer = (id: number, name: string) => {
    setSelectedCustomerId(id);
    setSelectedCustomerName(name);
    setShowSearch(false);
    setSearchQuery("");
  };

  const resetNewCustomerForm = () => {
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setNewEmail("");
    setNewAddress("");
    setNewCity("");
    setNewState("");
    setNewZip("");
  };

  const handleCreateAndSelect = async () => {
    if (!newFirstName.trim() || !newLastName.trim()) {
      Alert.alert("Required", "Please enter the customer's first and last name.");
      return;
    }
    try {
      if (!newCity.trim() || !newState.trim() || !newZip.trim()) {
        Alert.alert("Required", "City, state, and ZIP code are required.");
        return;
      }
      if (!newPhone.trim()) {
        const shouldContinue = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Phone Number Recommended",
            "Phone numbers help prevent duplicate customer records. Are you sure you want to continue?",
            [
              { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
              {
                text: "Continue Without Phone",
                onPress: () => resolve(true),
                style: "destructive",
              },
            ],
          );
        });
        if (!shouldContinue) return;
      }
      await proceedWithCustomerCreation();
    } catch {
      Alert.alert("Error", "Failed to create customer. Please try again.");
    }
  };

  const proceedWithCustomerCreation = async () => {
    try {
      const result = await createCustomer.mutateAsync({
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
        address: newAddress.trim(),
        city: newCity.trim(),
        state: newState.trim(),
        zip: newZip.trim(),
      });

      if ((result as any).isDuplicate) {
        handleSelectCustomer((result as any).id, `${newFirstName} ${newLastName}`);
        Alert.alert("Customer Found", (result as any).message || "Using existing customer profile.");
      } else if ((result as any).duplicates && (result as any).duplicates.length > 0) {
        const duplicates = (result as any).duplicates;
        const options = duplicates.map((d: any) => ({
          text: `${d.firstName} ${d.lastName} (${d.city}, ${d.state}) - ${d.reviewCount} reviews`,
          onPress: () => {
            handleSelectCustomer(d.id, `${d.firstName} ${d.lastName}`);
            setShowNewCustomerForm(false);
            resetNewCustomerForm();
          },
        }));
        options.push({
          text: "Create New Customer",
          onPress: () => {
            const id = (result as any).id;
            handleSelectCustomer(id as number, `${newFirstName} ${newLastName}`);
            setShowNewCustomerForm(false);
            resetNewCustomerForm();
          },
        });
        options.push({ text: "Cancel", onPress: () => {} });
        Alert.alert("Similar Customers Found", "Is this one of these existing customers?", options);
      } else {
        const id = (result as any).id;
        handleSelectCustomer(id as number, `${newFirstName} ${newLastName}`);
        setShowNewCustomerForm(false);
        resetNewCustomerForm();
      }
    } catch (e: unknown) {
      let message = "Failed to create customer.";
      if (e instanceof TRPCClientError) {
        const code = e.data?.code;
        if (code === "UNAUTHORIZED") {
          message = "Sign in as a contractor to create a customer, then try again.";
        } else if (code === "FORBIDDEN") {
          message = "Your account cannot create customers. Check that you are signed in as a contractor.";
        } else if (e.message) {
          message = e.message;
        }
      } else if (e instanceof Error && e.message) {
        message = e.message;
      }
      Alert.alert("Could not create customer", message);
    }
  };

  const pickImage = async () => {
    if (RNPlatform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo library access to attach photos.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setSelectedPhotos((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName || `photo-${Date.now()}.jpg`,
          type: a.mimeType || "image/jpeg",
        })),
      ]);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Validation + Submit ──────────────────────────────────────────────────────

  const canSubmit = (() => {
    if (!selectedCustomerId) return false;
    if (wouldWorkAgain !== "no" && (calculatedOverallRating == null || calculatedOverallRating === 0)) return false;
    const errs = validateReviewRatings({
      overallRating,
      categories: categoryRatings,
      wouldWorkAgain,
    });
    return errs.length === 0;
  })();

  const handleSubmit = async () => {
    if (!hasAgreedToTerms) {
      setShowLegalModal(true);
      return;
    }
    if (!selectedCustomerId) {
      Alert.alert("Select Customer", "Please select or create a customer first.");
      return;
    }

    const errs = validateReviewRatings({
      overallRating,
      categories: categoryRatings,
      wouldWorkAgain,
    });
    if (errs.length > 0) {
      Alert.alert("Missing Info", errs[0].message);
      return;
    }

    const legacyFlat = categoriesToLegacyFlat(categoryRatings);
    const categoryDataJson = serializeNewCategories(categoryRatings, wouldWorkAgain, selectedRedFlags, selectedGreenFlags);
    const flagsJson = (selectedRedFlags.length > 0 || selectedGreenFlags.length > 0)
      ? serializeFlags(selectedRedFlags, selectedGreenFlags)
      : undefined;

    const { reviewId } = await createReview.mutateAsync({
      customerId: selectedCustomerId,
      overallRating,
      calculatedOverallRating: calculatedOverallRating ?? undefined,
      ratingPaymentReliability: legacyFlat.ratingPaymentReliability,
      ratingCommunication: legacyFlat.ratingCommunication,
      ratingScopeChanges: legacyFlat.ratingScopeChanges,
      ratingPropertyRespect: legacyFlat.ratingPropertyRespect,
      ratingPermitPulling: legacyFlat.ratingPermitPulling,
      ratingOverallJobExperience: legacyFlat.ratingOverallJobExperience,
      categoryDataJson,
      wouldWorkAgain: wouldWorkAgain as string,
      reviewText: reviewText.trim() || undefined,
      jobType: jobType.trim() || undefined,
      jobDate: jobDate.trim() || undefined,
      jobAmount: jobAmount.trim() || undefined,
      redFlags: flagsJson,
      greenFlags: flagsJson ? undefined : undefined,
    });

    if (selectedPhotos.length > 0 && reviewId) {
      const publicUrls: string[] = [];
      for (let i = 0; i < selectedPhotos.length; i++) {
        try {
          const { presignedUrl, publicUrl } = await utils.photos.getPresignedUrl.fetch({
            reviewId,
            photoIndex: i,
          });
          const photo = selectedPhotos[i];
          const res = await fetch(photo.uri);
          const blob = await res.blob();
          await fetch(presignedUrl, {
            method: "PUT",
            body: blob,
            headers: { "Content-Type": photo.type || "image/jpeg" },
          });
          publicUrls.push(publicUrl);
        } catch (e) {
          console.warn("Photo upload failed for index", i, e);
        }
      }
      if (publicUrls.length > 0) {
        await addReviewPhotos.mutateAsync({ reviewId, photoUrls: publicUrls });
      }
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  const WOULD_WORK_OPTIONS: { value: WouldWorkAgainValue; label: string }[] = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "na", label: "N/A" },
  ];

  return (
    <ScreenBackground backgroundKey="reviews" overlayOpacity={0.88}>
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-transparent">
      <LegalDisclaimerModal
        visible={showLegalModal}
        onAgree={() => {
          setHasAgreedToTerms(true);
          setShowLegalModal(false);
        }}
        onDisagree={() => setShowLegalModal(false)}
      />

      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Add Review</Text>
        <Pressable
          onPress={handleSubmit}
          disabled={createReview.isPending || !canSubmit}
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }]}
        >
          {createReview.isPending ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text
              style={[
                styles.submitText,
                { color: canSubmit ? colors.primary : colors.muted },
              ]}
            >
              Submit
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* ── Customer Selection ── */}
          <View
            style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Customer</Text>

            {selectedCustomerId && !showSearch ? (
              <View style={styles.selectedCustomer}>
                <View style={[styles.selectedAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.selectedAvatarText}>
                    {selectedCustomerName[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <Text style={[styles.selectedName, { color: colors.foreground }]}>
                  {selectedCustomerName}
                </Text>
                <Pressable
                  onPress={() => {
                    setSelectedCustomerId(null);
                    setSelectedCustomerName("");
                    setShowSearch(true);
                  }}
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                >
                  <Text style={[styles.changeText, { color: colors.primary }]}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  placeholder="Search by name or phone..."
                  placeholderTextColor={colors.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length >= 2 && searchResults && searchResults.length > 0 && (
                  <View style={[styles.searchResults, { borderColor: colors.border }]}>
                    {searchResults.map((c: any) => (
                      <Pressable
                        key={c.id}
                        onPress={() =>
                          handleSelectCustomer(c.id, `${c.firstName} ${c.lastName}`)
                        }
                        style={({ pressed }) => [
                          styles.searchResultItem,
                          { borderBottomColor: colors.border },
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Text style={[styles.searchResultText, { color: colors.foreground }]}>
                          {c.firstName} {c.lastName}
                        </Text>
                        <Text style={[styles.searchResultSubtext, { color: colors.muted }]}>
                          {[c.city, c.state].filter(Boolean).join(", ")}
                          {c.reviewCount > 0 ? ` · ${c.reviewCount} reviews` : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {searchQuery.length >= 2 && (
                  <Pressable
                    onPress={() => setShowNewCustomerForm(true)}
                    style={({ pressed }) => [
                      styles.createNewBtn,
                      { borderColor: colors.primary },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[styles.createNewText, { color: colors.primary }]}>
                      + Create New Customer
                    </Text>
                  </Pressable>
                )}
              </>
            )}

            {showNewCustomerForm && (
              <View style={styles.newCustomerForm}>
                {/* ── Duplicate Match Suggestions ── */}
                {showMatchSuggestions && potentialMatches.length > 0 && (
                  <View style={[styles.matchSuggestionsBox, { borderColor: colors.warning, backgroundColor: colors.warning + "10" }]}>
                    <Text style={[styles.matchSuggestionsTitle, { color: colors.warning }]}>
                      We found an existing customer that may match
                    </Text>
                    {potentialMatches.map((match: any) => (
                      <View key={match.id} style={[styles.matchCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.matchCardName, { color: colors.foreground }]}>
                            {match.firstName} {match.lastName}
                          </Text>
                          {!!(match.city || match.state) && (
                            <Text style={{ fontSize: 13, color: colors.muted }}>
                              {[match.city, match.state, match.zip].filter(Boolean).join(", ")}
                            </Text>
                          )}
                          {!!match.phone && (
                            <Text style={{ fontSize: 12, color: colors.muted }}>
                              {maskPhone(match.phone)}
                            </Text>
                          )}
                          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                            {match.reviewCount} {match.reviewCount === 1 ? "review" : "reviews"}
                            {parseFloat(match.overallRating ?? "0") > 0
                              ? ` · ${parseFloat(match.overallRating).toFixed(1)} avg`
                              : ""}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            handleSelectCustomer(match.id, `${match.firstName} ${match.lastName}`);
                            setShowNewCustomerForm(false);
                            setShowMatchSuggestions(false);
                            resetNewCustomerForm();
                          }}
                          style={({ pressed }) => [
                            styles.useExistingBtn,
                            { backgroundColor: colors.primary },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Text style={styles.useExistingBtnText}>Use This Customer</Text>
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      onPress={() => setShowMatchSuggestions(false)}
                      style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                    >
                      <Text style={[styles.someoneElseText, { color: colors.muted }]}>
                        This is someone else — continue creating
                      </Text>
                    </Pressable>
                  </View>
                )}
                {matchLookupPending && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.muted} />
                    <Text style={{ fontSize: 12, color: colors.muted }}>Checking for existing customers...</Text>
                  </View>
                )}

                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="First Name *"
                  placeholderTextColor={colors.muted}
                  value={newFirstName}
                  onChangeText={setNewFirstName}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Last Name *"
                  placeholderTextColor={colors.muted}
                  value={newLastName}
                  onChangeText={setNewLastName}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Phone (Highly Recommended)"
                  placeholderTextColor={colors.muted}
                  value={newPhone}
                  onChangeText={setNewPhone}
                  keyboardType="phone-pad"
                />
                <Text style={[styles.privacyNote, { color: colors.muted }]}>
                  Private — only visible to you. Helps prevent duplicate records.
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Email (Optional)"
                  placeholderTextColor={colors.muted}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={[styles.privacyNote, { color: colors.muted }]}>
                  Private — only visible to you.
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="City *"
                  placeholderTextColor={colors.muted}
                  value={newCity}
                  onChangeText={setNewCity}
                />
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.inputHalf, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="State *"
                    placeholderTextColor={colors.muted}
                    value={newState}
                    onChangeText={setNewState}
                  />
                  <TextInput
                    style={[styles.inputHalf, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="ZIP *"
                    placeholderTextColor={colors.muted}
                    value={newZip}
                    onChangeText={setNewZip}
                    keyboardType="number-pad"
                  />
                </View>
                <Text style={[styles.privacyNote, { color: colors.muted }]}>
                  City, state, and ZIP may be visible to other users.
                </Text>
                <View style={styles.buttonRow}>
                  <Pressable
                    onPress={() => {
                      setShowNewCustomerForm(false);
                      setShowMatchSuggestions(false);
                      setPotentialMatches([]);
                    }}
                    style={({ pressed }) => [
                      styles.halfBtn,
                      { borderColor: colors.border },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[styles.halfBtnText, { color: colors.muted }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCreateAndSelect}
                    disabled={createCustomer.isPending}
                    style={({ pressed }) => [
                      styles.halfBtn,
                      { backgroundColor: colors.primary },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {createCustomer.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.halfBtnTextWhite}>Create Customer</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* ── Job Details ── */}
          <View
            style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Job Details (Optional)
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Job type (e.g. Kitchen Remodel, Roof Repair)"
              placeholderTextColor={colors.muted}
              value={jobType}
              onChangeText={setJobType}
            />
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.inputHalf, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Job Date"
                placeholderTextColor={colors.muted}
                value={jobDate}
                onChangeText={setJobDate}
              />
              <TextInput
                style={[styles.inputHalf, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Amount ($)"
                placeholderTextColor={colors.muted}
                value={jobAmount}
                onChangeText={setJobAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* ── Overall Rating (auto-calculated) ── */}
          <View
            style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Overall Rating</Text>
            <View style={styles.overallRatingContainer}>
              <StarRating rating={overallRating} size={44} positionalColors />
              <Text style={[styles.overallRatingLabel, { color: colors.muted }]}>
                {calculatedOverallRating == null
                  ? "Rate categories below to calculate"
                  : wouldWorkAgain === "no"
                    ? `0 stars (category avg: ${calculatedOverallRating.toFixed(1)})`
                    : overallRating <= 1
                      ? "Avoid — Major Issues"
                      : overallRating <= 2
                        ? "Poor — Many Problems"
                        : overallRating <= 3
                          ? "Average — Some Issues"
                          : overallRating <= 4
                            ? "Good — Minor Issues"
                            : "Excellent — Highly Recommend"}
              </Text>
              {overallRatingExplanation && (
                <Text style={[styles.overrideText, { color: wouldWorkAgain === "no" ? "#DC2626" : colors.muted }]}>
                  {overallRatingExplanation}
                </Text>
              )}
            </View>
          </View>

          {/* ── Category Ratings ── */}
          <View
            style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Category Ratings *
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
              Rate each area or mark N/A if it doesn't apply.
            </Text>
            {REVIEW_CATEGORIES.map(({ key, label, description }) => (
              <View key={key} style={[styles.categoryDivider, { borderTopColor: colors.border }]}>
                <CategoryRating
                  label={label}
                  description={description}
                  rating={categoryRatings[key].score}
                  notApplicable={categoryRatings[key].notApplicable}
                  interactive
                  onRatingChange={(r) => setCatScore(key, r)}
                  onNotApplicableChange={(na) => setCatNa(key, na)}
                />
              </View>
            ))}
          </View>

          {/* ── Would Work Again ── */}
          <View
            style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Would You Work With Them Again? *
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
              Would you take another job from this client?
            </Text>
            <View style={styles.segmentedRow}>
              {WOULD_WORK_OPTIONS.map((opt) => {
                const selected = wouldWorkAgain === opt.value;
                const pillColor =
                  opt.value === "yes"
                    ? "#22C55E"
                    : opt.value === "no"
                      ? "#DC2626"
                      : colors.muted;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setWouldWorkAgain(opt.value)}
                    style={({ pressed }) => [
                      styles.segmentPill,
                      {
                        backgroundColor: selected ? pillColor + "22" : "transparent",
                        borderColor: selected ? pillColor : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: selected ? pillColor : colors.muted },
                        selected && { fontWeight: "700" },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Flags (Red + Green) ── */}
          <View
            style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Flags</Text>
            <FlagChipsSection
              selectedRedFlags={selectedRedFlags}
              selectedGreenFlags={selectedGreenFlags}
              onToggleRedFlag={toggleRedFlag}
              onToggleGreenFlag={toggleGreenFlag}
            />
          </View>

          {/* ── Written Review ── */}
          <View
            style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Written Review</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="Describe your experience working with this client..."
              placeholderTextColor={colors.muted}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={[styles.charCount, { color: colors.muted }]}>
              {reviewText.length}/2000
            </Text>
          </View>

          {/* ── Photos ── */}
          <View
            style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Photos (Optional)
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
              Add photos to support your review (invoices, damage, etc.)
            </Text>

            {selectedPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {selectedPhotos.map((photo, index) => (
                  <View key={index} style={[styles.photoItem, { borderColor: colors.border }]}>
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                    <Pressable
                      onPress={() => removePhoto(index)}
                      style={[styles.removePhotoBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.removePhotoBtnText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={pickImage}
              style={({ pressed }) => [
                styles.addPhotoBtn,
                { borderColor: colors.primary, backgroundColor: colors.background },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.addPhotoBtnText, { color: colors.primary }]}>+ Add Photo</Text>
            </Pressable>
          </View>

          {/* ── Submit ── */}
          <View style={styles.submitContainer}>
            <Pressable
              onPress={handleSubmit}
              disabled={createReview.isPending || !canSubmit}
              style={({ pressed }) => [
                styles.submitFullBtn,
                { backgroundColor: canSubmit ? colors.primary : colors.muted },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                createReview.isPending && { opacity: 0.6 },
              ]}
            >
              {createReview.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitFullBtnText}>Submit Review</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { width: 70 },
  backText: { fontSize: 17 },
  topTitle: { fontSize: 17, fontWeight: "600", flex: 1, textAlign: "center" },
  submitBtn: { width: 70, alignItems: "flex-end" },
  submitText: { fontSize: 17, fontWeight: "600" },
  scroll: { padding: 16, paddingBottom: 100, gap: 16 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionSubtitle: { fontSize: 13, marginTop: -6 },
  selectedCustomer: { flexDirection: "row", alignItems: "center", gap: 12 },
  selectedAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  selectedAvatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  selectedName: { flex: 1, fontSize: 16, fontWeight: "600" },
  changeText: { fontSize: 14, fontWeight: "600" },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  inputRow: { flexDirection: "row", gap: 12 },
  inputHalf: { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  searchResults: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  searchResultItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  searchResultText: { fontSize: 15, fontWeight: "500" },
  searchResultSubtext: { fontSize: 13, marginTop: 2 },
  createNewBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, alignItems: "center" },
  createNewText: { fontSize: 15, fontWeight: "600" },
  privacyNote: { fontSize: 12, marginTop: -6, marginBottom: 4 },
  matchSuggestionsBox: { borderRadius: 12, borderWidth: 1.5, padding: 12, gap: 10, marginBottom: 4 },
  matchSuggestionsTitle: { fontSize: 14, fontWeight: "700" },
  matchCard: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, padding: 10, gap: 10 },
  matchCardName: { fontSize: 15, fontWeight: "600" },
  useExistingBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 0 },
  useExistingBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  someoneElseText: { fontSize: 13, textAlign: "center", paddingVertical: 4 },
  newCustomerForm: { gap: 12, marginTop: 8, paddingTop: 12, borderTopWidth: 0.5 },
  buttonRow: { flexDirection: "row", gap: 12 },
  halfBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  halfBtnText: { fontSize: 15, fontWeight: "600" },
  halfBtnTextWhite: { fontSize: 15, fontWeight: "600", color: "#fff" },
  overallRatingContainer: { alignItems: "center", gap: 12 },
  overallRatingLabel: { fontSize: 14 },
  overrideText: { fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 2 },
  categoryDivider: { borderTopWidth: 1, paddingTop: 4 },
  segmentedRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  segmentPill: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  segmentText: { fontSize: 15 },
  textArea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  charCount: { fontSize: 12, textAlign: "right" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  photoItem: { width: "48%" as any, aspectRatio: 1, borderRadius: 10, borderWidth: 1, overflow: "hidden", position: "relative" },
  photoImage: { width: "100%", height: "100%" },
  removePhotoBtn: { position: "absolute", top: 4, right: 4, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  removePhotoBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  addPhotoBtn: { borderRadius: 10, borderWidth: 2, borderStyle: "dashed", paddingVertical: 16, alignItems: "center" },
  addPhotoBtnText: { fontSize: 15, fontWeight: "600" },
  submitContainer: { gap: 12 },
  submitFullBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitFullBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
