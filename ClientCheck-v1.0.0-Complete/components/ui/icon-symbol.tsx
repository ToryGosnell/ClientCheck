// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for ClientCheck.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "magnifyingglass": "search",
  "plus.circle.fill": "add-circle",
  "bell.fill": "notifications",
  "person.fill": "person",
  // Actions
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "star.fill": "star",
  "star": "star-outline",
  "star.leadinghalf.filled": "star-half",
  "hand.thumbsup.fill": "thumb-up",
  "hand.thumbsdown.fill": "thumb-down",
  "flag.fill": "flag",
  "exclamationmark.triangle.fill": "warning",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "pencil": "edit",
  "trash.fill": "delete",
  "plus": "add",
  "xmark": "close",
  // Info
  "phone.fill": "phone",
  "envelope.fill": "email",
  "mappin.fill": "location-on",
  "building.2.fill": "business",
  "person.2.fill": "group",
  "doc.text.fill": "description",
  "dollarsign.circle.fill": "attach-money",
  "clock.fill": "access-time",
  "calendar": "calendar-today",
  "shield.fill": "verified-user",
  "gear": "settings",
  "arrow.right.square.fill": "logout",
  "info.circle.fill": "info",
  "moon.fill": "dark-mode",
  "sun.max.fill": "light-mode",
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
