import { Text, View, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useMemo, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/app-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { checkAndPromptReview } from "@/lib/review-prompt";
import { WorkoutTimer } from "@/components/workout-timer";
import { useInterstitialAd } from "@/hooks/use-interstitial-ad";

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  yoga: { label: "Yoga", color: "#9B59B6" },
  hiit: { label: "HIIT", color: "#E74C3C" },
  strength: { label: "Strength", color: "#3498DB" },
  cardio: { label: "Cardio", color: "#E67E22" },
  stretching: { label: "Stretching", color: "#1ABC9C" },
  core: { label: "Core", color: "#F39C12" },
  bodyweight: { label: "Bodyweight", color: "#2ECC71" },
  general: { label: "General", color: "#95A5A6" },
  walking: { label: "Walking", color: "#27AE60" },
  cycling: { label: "Cycling", color: "#2980B9" },
  running: { label: "Running", color: "#E74C3C" },
};

type ScreenMode = "overview" | "timer" | "completed";

export default function WorkoutScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, completeWorkout, skipWorkout } = useApp();
  const [completing, setCompleting] = useState(false);
  const [mode, setMode] = useState<ScreenMode>("overview");
  const { show: showInterstitial } = useInterstitialAd();

  const workout = useMemo(
    () => state.workouts.find((w) => w.id === id),
    [state.workouts, id]
  );

  if (!workout) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const badge = TYPE_BADGES[workout.type.toLowerCase()] || TYPE_BADGES.general;

  const handleComplete = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCompleting(true);
    await completeWorkout(workout.id);
    setMode("completed");
    await checkAndPromptReview();

    // Show interstitial ad after workout completion, then navigate back
    showInterstitial(() => {
      setTimeout(() => {
        router.back();
      }, 1500);
    });
  };

  const handleSkip = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await skipWorkout(workout.id);
    router.back();
  };

  const handleClose = () => {
    router.back();
  };

  const handleTimerComplete = useCallback(async () => {
    // Auto-complete the workout when the timer finishes
    await handleComplete();
  }, [workout.id]);

  const handleTimerCancel = useCallback(() => {
    // Go back to overview mode
    setMode("overview");
  }, []);

  const handleStartTimer = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setMode("timer");
  };

  // ── Completed state ──
  if (mode === "completed") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centered}>
          <Text style={styles.completedEmoji}>🎉</Text>
          <Text style={[styles.completedTitle, { color: colors.foreground }]}>
            Workout Complete!
          </Text>
          <Text style={[styles.completedSubtitle, { color: colors.muted }]}>
            Great job! Keep the momentum going.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // ── Timer mode ──
  if (mode === "timer") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <WorkoutTimer
          exercises={workout.exercises}
          onComplete={handleTimerComplete}
          onCancel={handleTimerCancel}
        />
      </ScreenContainer>
    );
  }

  // ── Overview mode (default) ──
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: colors.surface },
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialIcons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerInfo}>
          <View style={[styles.typeBadge, { backgroundColor: badge.color }]}>
            <Text style={styles.typeBadgeText}>{badge.label}</Text>
          </View>
          <Text style={[styles.duration, { color: colors.muted }]}>
            {workout.duration} min
          </Text>
        </View>
      </View>

      {/* Workout Title */}
      <View style={styles.titleSection}>
        <Text style={[styles.workoutTitle, { color: colors.foreground }]}>
          {workout.title}
        </Text>
      </View>

      {/* Start Guided Timer Button */}
      <View style={styles.startTimerSection}>
        <Pressable
          onPress={handleStartTimer}
          style={({ pressed }) => [
            styles.startTimerButton,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
          ]}
        >
          <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
          <Text style={styles.startTimerText}>Start Guided Workout</Text>
        </Pressable>
      </View>

      {/* Exercise List */}
      <ScrollView
        style={styles.exerciseList}
        contentContainerStyle={styles.exerciseListContent}
      >
        {workout.exercises.map((exercise, index) => (
          <View
            key={index}
            style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.exerciseNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.exerciseNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={[styles.exerciseName, { color: colors.foreground }]}>
                {exercise.name}
              </Text>
              <Text style={[styles.exerciseSets, { color: colors.primary }]}>
                {exercise.setsReps}
              </Text>
              <Text style={[styles.exerciseCue, { color: colors.muted }]}>
                {exercise.formCue}
              </Text>
              {exercise.durationSeconds != null && (
                <View style={styles.timingRow}>
                  <MaterialIcons name="timer" size={14} color={colors.muted} />
                  <Text style={[styles.timingText, { color: colors.muted }]}>
                    {exercise.durationSeconds}s
                    {exercise.sets != null && exercise.sets > 1
                      ? ` × ${exercise.sets} sets`
                      : ""}
                    {exercise.restSeconds != null
                      ? ` · ${exercise.restSeconds}s rest`
                      : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleComplete}
          disabled={completing}
          style={({ pressed }) => [
            styles.completeButton,
            { backgroundColor: colors.success },
            pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
          ]}
        >
          {completing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={22} color="#FFFFFF" />
              <Text style={styles.completeButtonText}>Mark Complete</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={handleSkip}
          style={({ pressed }) => [
            styles.skipButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={[styles.skipButtonText, { color: colors.muted }]}>
            Skip This One
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  completedEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  duration: {
    fontSize: 14,
    fontWeight: "600",
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  startTimerSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  startTimerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  startTimerText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  exerciseCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    alignItems: "flex-start",
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  exerciseNumberText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  exerciseSets: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  exerciseCue: {
    fontSize: 14,
    lineHeight: 20,
  },
  timingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  timingText: {
    fontSize: 13,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 0.5,
    gap: 8,
  },
  completeButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  skipButton: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
