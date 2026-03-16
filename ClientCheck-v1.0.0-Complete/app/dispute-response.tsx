import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
   FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

export default function DisputeResponseScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    disputeId?: string;
    reviewId?: string;
  }>();

  const disputeId = params.disputeId ? parseInt(params.disputeId, 10) : null;
  const reviewId = params.reviewId ? parseInt(params.reviewId, 10) : null;

  const [response, setResponse] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<{ uri: string; name: string; type?: string }[]>([]);

  const utils = trpc.useUtils();
  const respondToDispute = trpc.disputes.respondToDispute.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Response Submitted", "Your response has been posted successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "Failed to submit response.");
    },
  });

  const handlePickPhoto = async () => {
    if (Platform.OS !== "web") {
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

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!disputeId) {
      Alert.alert("Error", "Dispute ID is missing.");
      return;
    }

    if (!response.trim() || response.trim().length < 10) {
      Alert.alert("Response Required", "Please provide a response of at least 10 characters.");
      return;
    }

    let photoUrls: string[] = [];
    if (selectedPhotos.length > 0) {
      for (let i = 0; i < selectedPhotos.length; i++) {
        try {
          const { presignedUrl, publicUrl } = await utils.photos.getPresignedDisputeUrl.fetch({
            disputeId,
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
          photoUrls.push(publicUrl);
        } catch (e) {
          console.warn("Dispute photo upload failed for index", i, e);
        }
      }
    }

    await respondToDispute.mutateAsync({
      disputeId,
      response: response.trim(),
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
    });
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Respond to Review</Text>
        <Pressable
          onPress={handleSubmit}
          disabled={respondToDispute.isPending}
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }]}
        >
          {respondToDispute.isPending ? (
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
          {/* Info Section */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Respond to Negative Review
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
              You have the right to respond to reviews about you. Provide your perspective on the situation.
            </Text>
          </View>

          {/* Response Text Area */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Response *</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
              Explain your side of the story. Be professional and factual.
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="Provide a professional response to this review..."
              placeholderTextColor={colors.muted}
              value={response}
              onChangeText={setResponse}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={[styles.charCount, { color: colors.muted }]}>
              {response.length}/2000
            </Text>
          </View>

          {/* Photo Upload */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Add Photos (Optional)</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
              Upload photos to support your response (e.g., before/after, receipts)
            </Text>
            <Pressable
              onPress={handlePickPhoto}
              style={({ pressed }) => [
                styles.photoPickerBtn,
                { borderColor: colors.primary },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.photoPickerText, { color: colors.primary }]}>+ Add Photos</Text>
            </Pressable>
            {selectedPhotos.length > 0 && (
              <FlatList
                data={selectedPhotos}
                renderItem={({ item, index }) => (
                  <View style={styles.photoItem}>
                    <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
                    <Pressable
                      onPress={() => handleRemovePhoto(index)}
                      style={styles.removePhotoBtn}
                    >
                      <Text style={styles.removePhotoBtnText}>✕</Text>
                    </Pressable>
                  </View>
                )}
                keyExtractor={(_, index) => String(index)}
                scrollEnabled={false}
                numColumns={3}
                columnWrapperStyle={styles.photoGrid}
              />
            )}
          </View>

          {/* Guidelines */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Guidelines</Text>
            <Text style={[styles.guideline, { color: colors.muted }]}>
              • Stay professional and respectful
            </Text>
            <Text style={[styles.guideline, { color: colors.muted }]}>
              • Provide factual information only
            </Text>
            <Text style={[styles.guideline, { color: colors.muted }]}>
              • Don't make personal attacks
            </Text>
            <Text style={[styles.guideline, { color: colors.muted }]}>
              • Offer solutions if applicable
            </Text>
          </View>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Pressable
              onPress={handleSubmit}
              disabled={respondToDispute.isPending}
              style={({ pressed }) => [
                styles.submitFullBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                respondToDispute.isPending && { opacity: 0.6 },
              ]}
            >
              {respondToDispute.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitFullBtnText}>Submit Response</Text>
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
  guideline: {
    fontSize: 14,
    lineHeight: 20,
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
  photoPickerBtn: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  photoPickerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  photoItem: {
    position: "relative",
    marginBottom: 8,
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  removePhotoBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  photoGrid: {
    gap: 8,
  },
});
