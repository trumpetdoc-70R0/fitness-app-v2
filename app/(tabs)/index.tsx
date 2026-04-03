import { Text, View, Pressable, StyleSheet, Platform, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/app-context";
import type { EnergyLevel, TimeAvailable } from "@/lib/storage";
import { trpc } from "@/lib/trpc";
import { AdBanner } from "@/components/ad-banner";

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; icon: string; color: string }[] = [
  { value: "low", label: "Low", icon: "🔋", color: "#8E8E93" },
  { value: "medium", label: "Medium", icon: "⚡", color: "#FF9F0A" },
  { value: "high", label: "High", icon: "🔥", color: "#FF3B30" },
];

const TIME_OPTIONS: { value: TimeAvailable; label: string }[] = [
  { value: 10, label: "10 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
];

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, addWorkout, refreshStats } = useApp();

  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [time, setTime] = useState<TimeAvailable | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect to onboarding if not complete
  useEffect(() => {
    if (!state.loading && !state.profile?.onboardingComplete) {
      router.replace("/onboarding" as any);
    }
  }, [state.loading, state.profile?.onboardingComplete]);

  const generateWorkout = trpc.workout.generate.useMutation();

  const handleGenerate = async () => {
    if (!energy || !time || !state.profile) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setLoading(true);
    try {
      const last3 = state.workouts
        .filter((w) => w.completed)
        .slice(0, 3)
        .map((w) => ({ type: w.type, date: w.date, duration: w.duration }));

      const result = await generateWorkout.mutateAsync({
        energyLevel: energy,
        timeAvailable: time,
        profile: {
          age: state.profile.age,
          gender: state.profile.gender,
          fitnessLevel: state.profile.fitnessLevel,
        },
        equipment: state.equipment,
        activities: state.activities,
        recentWorkouts: last3,
        aiLearning: {
          preferenceWeights: state.aiLearning.preferenceWeights,
        },
        trainingLoad: state.trainingLoad,
      });

      const workout = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: result.type,
        title: result.title,
        duration: time,
        energyLevel: energy,
        exercises: result.exercises,
        completed: false,
        skipped: false,
      };

      await addWorkout(workout);
      router.push(`/workout?id=${workout.id}` as any);
    } catch (error: any) {
      console.error("Failed to generate workout:", error);
      Alert.alert(
        "Workout Generation Failed",
        "Could not connect to the server. Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset selections
  const resetSelections = () => {
    setEnergy(null);
    setTime(null);
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const canGenerate = energy !== null && time !== null && !loading;

  // Show loading while hydrating
  if (state.loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const todayCompleted = state.workouts.filter(
    (w) => w.completed && new Date(w.date).toDateString() === new Date().toDateString()
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.muted }]}>
            {todayCompleted.length > 0 ? "Great work today!" : "Ready to move?"}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            What's your{"\n"}move today?
          </Text>
          {state.weeklyStats.streak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.surface }]}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={[styles.streakText, { color: colors.foreground }]}>
                {state.weeklyStats.streak} day streak
              </Text>
            </View>
          )}
        </View>

        {/* Energy Level Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>
            Energy / Motivation Level
          </Text>
          <View style={styles.cardRow}>
            {ENERGY_OPTIONS.map((option) => {
              const isSelected = energy === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setEnergy(option.value);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.energyCard,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.cardIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.cardLabel,
                      { color: isSelected ? "#FFFFFF" : colors.foreground },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Time Available Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>
            Time Available
          </Text>
          <View style={styles.cardRow}>
            {TIME_OPTIONS.map((option) => {
              const isSelected = time === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setTime(option.value);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.timeCard,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                  ]}
                >
                  <Text
                    style={[
                      styles.timeValue,
                      { color: isSelected ? "#FFFFFF" : colors.foreground },
                    ]}
                  >
                    {option.value}
                  </Text>
                  <Text
                    style={[
                      styles.timeUnit,
                      { color: isSelected ? "rgba(255,255,255,0.8)" : colors.muted },
                    ]}
                  >
                    min
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Generate Button */}
        <View style={styles.generateSection}>
          <Pressable
            onPress={handleGenerate}
            disabled={!canGenerate}
            style={({ pressed }) => [
              styles.generateButton,
              {
                backgroundColor: canGenerate ? colors.primary : colors.border,
              },
              pressed && canGenerate && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={[styles.generateText, { opacity: canGenerate ? 1 : 0.5 }]}>
                Tell Me What To Do
              </Text>
            )}
          </Pressable>

          {(energy !== null || time !== null) && !loading && (
            <Pressable
              onPress={resetSelections}
              style={({ pressed }) => [
                styles.resetButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.resetText, { color: colors.muted }]}>Reset</Text>
            </Pressable>
          )}
        </View>
      </View>
      <AdBanner style={{ marginBottom: 4 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 4,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardRow: {
    flexDirection: "row",
    gap: 10,
  },
  energyCard: {
    flex: 1,
    height: 88,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  timeCard: {
    flex: 1,
    height: 88,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  timeValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  timeUnit: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  generateSection: {
    marginTop: 8,
    alignItems: "center",
  },
  generateButton: {
    width: "100%",
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  generateText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  resetButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resetText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
