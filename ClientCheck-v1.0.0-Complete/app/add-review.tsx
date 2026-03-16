import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
import { StarRating } from "@/components/star-rating";
import { CategoryRating } from "@/components/category-rating";
import { RedFlagChips } from "@/components/red-flag-chip";
import { LegalDisclaimerModal } from "@/components/legal-disclaimer-modal";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { serializeRedFlags, TRADE_TYPES, type RedFlag } from "@/shared/types";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Platform as RNPlatform } from "react-native";

const CATEGORY_FIELDS = [
  {
    key: "ratingPaymentReliability" as const,
    label: "Payment Reliability",
    description: "How reliable was their payment?",
  },
  {
    key: "ratingCommunication" as const,
    label: "Communication",
    description: "Were they responsive and clear?",
  },
  {
    key: "ratingScopeChanges" as const,
    label: "Scope Changes",
    description: "How did they handle scope changes?",
  },
  {
    key: "ratingPropertyRespect" as const,
    label: "Property Respect",
    description: "Did they respect your property?",
  },
  {
    key: "ratingPermitPulling" as const,
    label: "Permitting Cooperation",
    description: "Did they cooperate on permits?",
  },
  {
    key: "ratingOverallJobExperience" as const,
    label: "Overall Job Experience",
    description: "Overall — would you work with them again?",
  },
] as const;

type CategoryKey = (typeof CATEGORY_FIELDS)[number]["key"];

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

  // Review fields
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<CategoryKey, number>>({
    ratingPaymentReliability: 0,
    ratingCommunication: 0,
    ratingScopeChanges: 0,
    ratingPropertyRespect: 0,
    ratingPermitPulling: 0,
    ratingOverallJobExperience: 0,
  });
  const [selectedFlags, setSelectedFlags] = useState<RedFlag[]>([]);
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
    { enabled: searchQuery.length >= 2 }
  );
  const createCustomer = trpc.customers.create.useMutation();
  const utils = trpc.useUtils();
  const addReviewPhotos = trpc.reviews.addPhotos.useMutation();
  const createReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
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

  const toggleFlag = (flag: RedFlag) => {
    setSelectedFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
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
      
      // Warn if phone is missing (highly recommended but optional)
      if (!newPhone.trim()) {
        return new Promise((resolve) => {
          Alert.alert(
            "Phone Number Recommended",
            "Phone numbers help prevent duplicate customer records. Skipping this increases the risk of the same person having multiple reviews in different locations. Are you sure you want to continue?",
            [
              { text: "Cancel", onPress: () => resolve(null), style: "cancel" },
              { text: "Continue Without Phone", onPress: () => resolve(true), style: "destructive" },
            ]
          );
        }).then((shouldContinue) => {
          if (!shouldContinue) return;
          proceedWithCustomerCreation();
        });
      }
      proceedWithCustomerCreation();
    } catch (error) {
      console.error("Error creating customer:", error);
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

      // Handle duplicate detection response
      if ((result as any).isDuplicate) {
        // Exact match found - use existing customer
        handleSelectCustomer((result as any).id, `${newFirstName} ${newLastName}`);
        Alert.alert(
          "Customer Found",
          (result as any).message || "Using existing customer profile."
        );
      } else if ((result as any).duplicates && (result as any).duplicates.length > 0) {
        // Similar matches found - show confirmation dialog
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
            // Continue with creating new customer
            const id = (result as any).id;
            handleSelectCustomer(id as number, `${newFirstName} ${newLastName}`);
            setShowNewCustomerForm(false);
            resetNewCustomerForm();
          },
        });
        options.push({ text: "Cancel", onPress: () => {} });
        Alert.alert(
          "Similar Customers Found",
          "Is this one of these existing customers?",
          options
        );
      } else {
        // No duplicates - new customer created
        const id = (result as any).id;
        handleSelectCustomer(id as number, `${newFirstName} ${newLastName}`);
        setShowNewCustomerForm(false);
        resetNewCustomerForm();
      }
    } catch (e: unknown) {
      Alert.alert("Error", (e as Error).message || "Failed to create customer.");
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

  const handleSubmit = async () => {
    if (!hasAgreedToTerms) {
      setShowLegalModal(true);
      return;
    }

    if (!selectedCustomerId) {
      Alert.alert("Select Customer", "Please select or create a customer first.");
      return;
    }
    if (overallRating === 0) {
      Alert.alert("Rating Required", "Please give an overall star rating.");
      return;
    }
    const allCategoryRated = Object.values(categoryRatings).every((r) => r > 0);
    if (!allCategoryRated) {
      Alert.alert("Category Ratings", "Please rate all categories before submitting.");
      return;
    }

    const { reviewId } = await createReview.mutateAsync({
      customerId: selectedCustomerId,
      overallRating,
      ...categoryRatings,
      reviewText: reviewText.trim() || undefined,
      jobType: jobType.trim() || undefined,
      jobDate: jobDate.trim() || undefined,
      jobAmount: jobAmount.trim() || undefined,
      redFlags: selectedFlags.length > 0 ? serializeRedFlags(selectedFlags) : undefined,
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

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Legal Disclaimer Modal */}
      <LegalDisclaimerModal
        visible={showLegalModal}
        onAgree={() => {
          setHasAgreedToTerms(true);
          setShowLegalModal(false);
        }}
        onDisagree={() => {
          setShowLegalModal(false);
        }}
      />

      {/* Header */}
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
          disabled={createReview.isPending}
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }]}
        >
          {createReview.isPending ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={[styles.submitText, { color: colors.primary }]}>Submit</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Customer Selection */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Search by name or phone..."
                  placeholderTextColor={colors.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length >= 2 && searchResults && searchResults.length > 0 && (
                  <View style={[styles.searchResults, { borderColor: colors.border }]}>
                    {searchResults.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => handleSelectCustomer(c.id, `${c.firstName} ${c.lastName}`)}
                        style={({ pressed }) => [styles.searchResultItem, pressed && { opacity: 0.6 }]}
                      >
                        <Text style={[styles.searchResultText, { color: colors.foreground }]}>
                          {c.firstName} {c.lastName}
                        </Text>
                        {c.phone && (
                          <Text style={[styles.searchResultSubtext, { color: colors.muted }]}>
                            {c.phone}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
                {searchQuery.length >= 2 && (!searchResults || searchResults.length === 0) && (
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
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: -8 }}>
                  Phone helps prevent duplicate customer records
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="City *"
                  placeholderTextColor={colors.muted}
                  value={newCity}
                  onChangeText={setNewCity}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="State *"
                  placeholderTextColor={colors.muted}
                  value={newState}
                  onChangeText={setNewState}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="ZIP Code *"
                  placeholderTextColor={colors.muted}
                  value={newZip}
                  onChangeText={setNewZip}
                  keyboardType="number-pad"
                />
                <Text style={[styles.privacyNote, { color: colors.muted }]}>
                  City, state, and ZIP are private and only visible to you
                </Text>
                <View style={styles.buttonRow}>
                  <Pressable
                    onPress={() => setShowNewCustomerForm(false)}
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
                      <Text style={styles.halfBtnTextWhite}>Create</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Job Details */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Job Details (Optional)</Text>
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

          {/* Overall Rating */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Overall Rating *</Text>
            <View style={styles.overallRatingContainer}>
              <StarRating
                rating={overallRating}
                size={44}
                interactive
                onRatingChange={setOverallRating}
              />
              <Text style={[styles.overallRatingLabel, { color: colors.muted }]}>
                {overallRating === 0
                  ? "Tap to rate"
                  : overallRating === 1
                  ? "Avoid — Major Issues"
                  : overallRating === 2
                  ? "Poor — Many Problems"
                  : overallRating === 3
                  ? "Average — Some Issues"
                  : overallRating === 4
                  ? "Good — Minor Issues"
                  : "Excellent — Highly Recommend"}
              </Text>
            </View>
          </View>

          {/* Category Ratings */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category Ratings *</Text>
            {CATEGORY_FIELDS.map(({ key, label, description }) => (
              <View key={key} style={[styles.categoryDivider, { borderTopColor: colors.border }]}>
                <CategoryRating
                  label={label}
                  description={description}
                  rating={categoryRatings[key]}
                  interactive
                  onRatingChange={(r) =>
                    setCategoryRatings((prev) => ({ ...prev, [key]: r }))
                  }
                />
              </View>
            ))}
          </View>

          {/* Red Flags */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Red Flags</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
              Select any issues you experienced with this customer.
            </Text>
            <RedFlagChips selected={selectedFlags} onToggle={toggleFlag} />
          </View>

          {/* Written Review */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Written Review</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="Describe your experience with this customer. What went well? What were the issues? Would you recommend other contractors work with them?"
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

          {/* Photos */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Photos (Optional)</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
              Add photos to support your review (invoices, damage, etc.)
            </Text>

            {selectedPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {selectedPhotos.map((photo, index) => (
                  <View key={index} style={[styles.photoItem, { borderColor: colors.border }]}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photoImage}
                    />
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
              <Text style={[styles.addPhotoBtnText, { color: colors.primary }]}>
                + Add Photo
              </Text>
            </Pressable>
          </View>

          {/* Submit */}
          <View style={styles.submitContainer}>
            <Pressable
              onPress={handleSubmit}
              disabled={createReview.isPending}
              style={({ pressed }) => [
                styles.submitFullBtn,
                { backgroundColor: colors.primary },
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
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 70,
  },
  backText: {
    fontSize: 17,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  submitBtn: {
    width: 70,
    alignItems: "flex-end",
  },
  submitText: {
    fontSize: 17,
    fontWeight: "600",
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
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
  sectionSubtitle: {
    fontSize: 13,
    marginTop: -6,
  },
  selectedCustomer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  selectedName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputHalf: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  searchResults: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  searchResultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  searchResultText: {
    fontSize: 15,
    fontWeight: "500",
  },
  searchResultSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  createNewBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  createNewText: {
    fontSize: 15,
    fontWeight: "600",
  },
  privacyNote: {
    fontSize: 12,
    marginTop: -6,
    marginBottom: 4,
  },
  newCustomerForm: {
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  halfBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  halfBtnTextWhite: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  overallRatingContainer: {
    alignItems: "center",
    gap: 12,
  },
  overallRatingLabel: {
    fontSize: 14,
  },
  categoryDivider: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoItem: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  removePhotoBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  addPhotoBtn: {
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    paddingVertical: 16,
    alignItems: "center",
  },
  addPhotoBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  submitContainer: {
    gap: 12,
  },
  submitFullBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitFullBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
