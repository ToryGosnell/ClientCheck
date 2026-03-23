import { ImageSourcePropType } from "react-native";

export type ScreenBackgroundKey =
  | "auth"
  | "dashboard"
  | "search"
  | "myReviews"
  | "reviews"
  | "analytics"
  | "alerts"
  | "profile"
  | "riskCheck"
  | "customers"
  | "texture";

export interface BackgroundConfig {
  source: ImageSourcePropType;
  overlayOpacity: number;
  /** @deprecated Bottom gradient is now always rendered */
  gradientBottom?: boolean;
  gradientTop?: boolean;
}

export const BACKGROUNDS: Record<ScreenBackgroundKey, BackgroundConfig> = {
  auth: {
    source: require("@/assets/backgrounds/auth/hero.jpg"),
    overlayOpacity: 0.65,
    gradientBottom: true,
    gradientTop: true,
  },
  dashboard: {
    source: require("@/assets/backgrounds/dashboard/tools.jpg"),
    overlayOpacity: 0.78,
    gradientBottom: true,
  },
  search: {
    source: require("@/assets/backgrounds/customers/search.jpg"),
    overlayOpacity: 0.82,
    gradientTop: true,
  },
  myReviews: {
    source: require("@/assets/backgrounds/reviews/myreviews.jpg"),
    overlayOpacity: 0.8,
    gradientTop: true,
  },
  reviews: {
    source: require("@/assets/backgrounds/reviews/craftsmanship.jpg"),
    overlayOpacity: 0.82,
    gradientBottom: true,
  },
  analytics: {
    source: require("@/assets/backgrounds/dashboard/analytics.jpg"),
    overlayOpacity: 0.8,
    gradientTop: true,
  },
  alerts: {
    source: require("@/assets/backgrounds/shared/alerts.jpg"),
    overlayOpacity: 0.75,
    gradientTop: true,
  },
  profile: {
    source: require("@/assets/backgrounds/auth/profile.jpg"),
    overlayOpacity: 0.8,
    gradientTop: true,
    gradientBottom: true,
  },
  riskCheck: {
    source: require("@/assets/backgrounds/shared/riskcheck.jpg"),
    overlayOpacity: 0.78,
    gradientTop: true,
    gradientBottom: true,
  },
  customers: {
    source: require("@/assets/backgrounds/customers/jobsite.jpg"),
    overlayOpacity: 0.72,
    gradientTop: true,
    gradientBottom: true,
  },
  texture: {
    source: require("@/assets/backgrounds/shared/texture.jpg"),
    overlayOpacity: 0.6,
  },
};
