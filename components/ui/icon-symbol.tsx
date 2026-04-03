// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "clock.fill": "history",
  "person.fill": "person",
  "figure.run": "fitness-center",
  "bolt.fill": "bolt",
  "flame.fill": "local-fire-department",
  "battery.25": "battery-2-bar",
  "checkmark.circle.fill": "check-circle",
  "arrow.clockwise": "refresh",
  "gearshape.fill": "settings",
  "xmark": "close",
  "pencil": "edit",
  "plus": "add",
  "minus": "remove",
  "star.fill": "star",
  "trophy.fill": "emoji-events",
  "calendar": "calendar-today",
  "timer": "timer",
  "dumbbell.fill": "fitness-center",
} as IconMapping;

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
