import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, TextInput } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";

export default function AdminModerationScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("disputes");
  const [showModal, setShowModal] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [state, setState] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) {
      Alert.alert("Access Denied", "You must be logged in to access this page.");
      router.back();
    }
  }, [user]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Admin Moderation</Text>
        </View>

        <View style={styles.tabsContainer}>
          {["disputes", "reviews", "verification"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                { backgroundColor: activeTab === tab ? colors.primary : colors.surface },
              ]}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? "white" : colors.foreground }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {activeTab === "disputes" && "Pending Disputes"}
            {activeTab === "reviews" && "Flagged Reviews"}
            {activeTab === "verification" && "Pending Verifications"}
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>No items to review</Text>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  tabsContainer: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600" },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 20 },
});
