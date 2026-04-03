import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Appearance, View, useColorScheme as useRNColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors, type ColorScheme } from "@/constants/theme";
import { getThemePreference, saveThemePreference, type ThemePreference } from "@/lib/storage";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Apply CSS variables for web only. On native, NativeWind vars() handles this.
 */
function applySchemeToDOM(scheme: ColorScheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = scheme;
  root.classList.remove("dark", "light");
  root.classList.add(scheme);
  const palette = SchemeColors[scheme];
  Object.entries(palette).forEach(([token, value]) => {
    root.style.setProperty(`--color-${token}`, value);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read the device's actual system color scheme (read-only, never mutate)
  const deviceScheme = useRNColorScheme() ?? "light";

  // Store the resolved color scheme and the user's preference
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("light");
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  // Use a ref to track the preference so effects don't have stale closures
  const prefRef = useRef<ThemePreference>("system");

  /**
   * Apply the resolved scheme everywhere:
   * - NativeWind (for Tailwind token classes on native)
   * - DOM CSS variables (for web)
   * - React state (for useColors() hook)
   *
   * IMPORTANT: We do NOT call Appearance.setColorScheme() because that
   * mutates what useRNColorScheme() returns, creating a feedback loop
   * that prevents explicit light/dark selection from sticking.
   */
  const applyScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    nativewindColorScheme.set(scheme);
    applySchemeToDOM(scheme);
  }, []);

  // On mount, load the saved preference and apply the correct scheme
  useEffect(() => {
    getThemePreference().then((pref) => {
      prefRef.current = pref;
      setThemePreferenceState(pref);

      const resolved: ColorScheme = pref === "system" ? deviceScheme : pref;
      applyScheme(resolved);
      setLoaded(true);
    });
    // Only run on mount - deviceScheme at mount time is fine for initial resolution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user explicitly changes the theme preference
  const setThemePreference = useCallback((pref: ThemePreference) => {
    prefRef.current = pref;
    setThemePreferenceState(pref);
    saveThemePreference(pref);

    const resolved: ColorScheme = pref === "system" ? deviceScheme : pref;
    applyScheme(resolved);
  }, [applyScheme, deviceScheme]);

  // Direct scheme setter (used by dev tools)
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    applyScheme(scheme);
  }, [applyScheme]);

  // When the device system scheme changes, only update if user preference is "system"
  useEffect(() => {
    if (!loaded) return;
    if (prefRef.current === "system") {
      applyScheme(deviceScheme);
    }
    // If preference is explicit light/dark, ignore device scheme changes
  }, [deviceScheme, loaded, applyScheme]);

  // Build NativeWind CSS variable overrides for the wrapping View
  // This is what makes Tailwind token classes (bg-background, text-foreground, etc.)
  // resolve to the correct colors on native
  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      themePreference,
      setThemePreference,
      setColorScheme,
    }),
    [colorScheme, themePreference, setThemePreference, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
