import { Text, View, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { ACTIVITY_OPTIONS, type ActivityId } from "@/lib/storage";
import { useApp } from "@/lib/app-context";

export default function PreferencesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, updateActivities, updateProfile } = useApp();

  const [selected, setSelected] = useState<Set<ActivityId>>(new Set());

  const toggleActivity = (id: ActivityId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDone = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await updateActivities(Array.from(selected));
    // Mark onboarding as complete
    if (state.profile) {
      await updateProfile({
        ...state.profile,
        onboardingComplete: true,
      });
    }
    router.replace("/(tabs)" as any);
  };

  const isValid = selected.size >= 1;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.stepLabel, { color: colors.primary }]}>Step 3 of 3</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Your Preferences</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Pick activities you enjoy. Select at least one — the AI will learn your preferences over time.
        </Text>

        <View style={styles.chipContainer}>
          {ACTIVITY_OPTIONS.map((activity) => {
            const isSelected = selected.has(activity.id);
            return (
              <Pressable
                key={activity.id}
                onPress={() => toggleActivity(activity.id)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? "#FFFFFF" : colors.foreground },
                  ]}
                >
                  {activity.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleDone}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: isValid ? colors.primary : colors.border },
            pressed && isValid && { transform: [{ scale: 0.97 }], opacity: 0.9 },
          ]}
        >
          <Text style={[styles.buttonText, { opacity: isValid ? 1 : 0.5 }]}>
            Let's Go!
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 22,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 0.5,
  },
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
