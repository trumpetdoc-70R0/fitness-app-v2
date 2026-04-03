import { useThemeContext } from "@/lib/theme-provider";

/**
 * Web version of useColorScheme.
 * Reads from ThemeContext so that explicit light/dark preference
 * is respected (not just the system media query).
 */
export function useColorScheme() {
  return useThemeContext().colorScheme;
}
