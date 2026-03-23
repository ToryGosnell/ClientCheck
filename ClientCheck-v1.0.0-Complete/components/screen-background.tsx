import { ImageBackground, StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { type ScreenBackgroundKey, BACKGROUNDS } from "@/shared/background-config";

interface ScreenBackgroundProps {
  /** Which background to use */
  backgroundKey: ScreenBackgroundKey;
  /** Override overlay opacity (0-1) */
  overlayOpacity?: number;
  /** Children rendered on top */
  children: React.ReactNode;
  /** Additional style for the container */
  style?: ViewStyle;
}

/**
 * Full-screen background image with dark overlay and optional gradients.
 * Wraps children so all content renders above the image.
 */
export function ScreenBackground({
  backgroundKey,
  overlayOpacity,
  children,
  style,
}: ScreenBackgroundProps) {
  const config = BACKGROUNDS[backgroundKey];
  const opacity = overlayOpacity ?? config.overlayOpacity;

  return (
    <ImageBackground
      source={config.source}
      style={[styles.container, style]}
      resizeMode="cover"
    >
      {/* Dark overlay — must not intercept touches (esp. RN Web stacking) */}
      <View style={[styles.overlay, { opacity }]} pointerEvents="none" />

      {/* Optional top gradient for status bar readability */}
      {config.gradientTop && (
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "transparent"]}
          style={styles.gradientTop}
          pointerEvents="none"
        />
      )}

      {/* Bottom gradient fade — always present for smooth transition into cards */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.5, 1]}
        style={styles.gradientBottom}
        pointerEvents="none"
      />

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
}

interface HeroHeaderBackgroundProps {
  backgroundKey: ScreenBackgroundKey;
  overlayOpacity?: number;
  children: React.ReactNode;
  height?: number;
  style?: ViewStyle;
}

/**
 * A section-level hero background — used for headers/banners within a screen.
 * Has a fixed height and renders children inside.
 */
export function HeroHeaderBackground({
  backgroundKey,
  overlayOpacity,
  children,
  height = 220,
  style,
}: HeroHeaderBackgroundProps) {
  const config = BACKGROUNDS[backgroundKey];
  const opacity = overlayOpacity ?? config.overlayOpacity;

  return (
    <ImageBackground
      source={config.source}
      style={[styles.heroContainer, { height }, style]}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { opacity }]} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.heroGradient}
        pointerEvents="none"
      />
      <View style={styles.heroContent}>{children}</View>
    </ImageBackground>
  );
}

/**
 * Standalone dark overlay — for layering on custom ImageBackground usage.
 */
export function BackgroundOverlay({ opacity = 0.7 }: { opacity?: number }) {
  return <View style={[styles.overlay, { opacity }]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
    zIndex: 1,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  heroContainer: {
    width: "100%",
    overflow: "hidden",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
    zIndex: 1,
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    zIndex: 2,
  },
});
