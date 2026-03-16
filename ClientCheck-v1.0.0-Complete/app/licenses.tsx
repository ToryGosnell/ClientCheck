import { ScrollView, StyleSheet, Text, View , Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const LICENSES = [
  {
    name: "React Native",
    license: "MIT",
    url: "https://github.com/facebook/react-native",
  },
  {
    name: "Expo",
    license: "MIT",
    url: "https://github.com/expo/expo",
  },
  {
    name: "React",
    license: "MIT",
    url: "https://github.com/facebook/react",
  },
  {
    name: "Drizzle ORM",
    license: "Apache 2.0",
    url: "https://github.com/drizzle-team/drizzle-orm",
  },
  {
    name: "TanStack Query",
    license: "MIT",
    url: "https://github.com/tanstack/query",
  },
  {
    name: "tRPC",
    license: "MIT",
    url: "https://github.com/trpc/trpc",
  },
  {
    name: "NativeWind",
    license: "MIT",
    url: "https://github.com/marklawlor/nativewind",
  },
  {
    name: "Tailwind CSS",
    license: "MIT",
    url: "https://github.com/tailwindlabs/tailwindcss",
  },
  {
    name: "Expo Router",
    license: "MIT",
    url: "https://github.com/expo/expo",
  },
  {
    name: "React Native Reanimated",
    license: "MIT",
    url: "https://github.com/software-mansion/react-native-reanimated",
  },
  {
    name: "React Native Gesture Handler",
    license: "MIT",
    url: "https://github.com/software-mansion/react-native-gesture-handler",
  },
  {
    name: "React Native Safe Area Context",
    license: "MIT",
    url: "https://github.com/th3rdwave/react-native-safe-area-context",
  },
  {
    name: "Zod",
    license: "MIT",
    url: "https://github.com/colinhacks/zod",
  },
  {
    name: "Clsx",
    license: "MIT",
    url: "https://github.com/lukeed/clsx",
  },
  {
    name: "Tailwind Merge",
    license: "MIT",
    url: "https://github.com/dcastil/tailwind-merge",
  },
  {
    name: "Expo Haptics",
    license: "MIT",
    url: "https://github.com/expo/expo",
  },
  {
    name: "Expo Symbols",
    license: "MIT",
    url: "https://github.com/expo/expo",
  },
  {
    name: "Expo Vector Icons",
    license: "MIT",
    url: "https://github.com/expo/expo",
  },
];

export default function LicensesScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Licenses</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.intro, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.introTitle, { color: colors.foreground }]}>
            Open Source Licenses
          </Text>
          <Text style={[styles.introText, { color: colors.muted }]}>
            ClientCheck is built on amazing open-source libraries. Below is a complete list of all dependencies and their licenses.
          </Text>
        </View>

        <View style={styles.licensesList}>
          {LICENSES.map((lib, idx) => (
            <View
              key={idx}
              style={[
                styles.licenseItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.licenseHeader}>
                <Text style={[styles.licenseName, { color: colors.foreground }]}>
                  {lib.name}
                </Text>
                <Text style={[styles.licenseBadge, { backgroundColor: colors.primary + "22", color: colors.primary }]}>
                  {lib.license}
                </Text>
              </View>
              <Text style={[styles.licenseUrl, { color: colors.muted }]}>
                {lib.url}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.footerTitle, { color: colors.foreground }]}>
            License Summary
          </Text>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            Most dependencies use the MIT License, which is permissive and allows commercial use. Some use Apache 2.0, which is also permissive. All licenses are compatible with ClientCheck's use.
          </Text>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            For full license texts, visit the repository links above.
          </Text>
        </View>
      </ScrollView>
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
    width: 60,
  },
  backText: {
    fontSize: 17,
    fontWeight: "500",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  intro: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
  },
  licensesList: {
    gap: 8,
  },
  licenseItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  licenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  licenseName: {
    fontSize: 15,
    fontWeight: "600",
  },
  licenseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
  licenseUrl: {
    fontSize: 12,
  },
  footer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
