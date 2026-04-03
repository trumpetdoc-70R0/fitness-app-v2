import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useColors } from "@/hooks/use-colors";
import type { Exercise } from "@/lib/storage";
import {
  getAudioEnabled,
  saveAudioEnabled,
  getVoiceEnabled,
  saveVoiceEnabled,
  getRestBetweenSets,
  getRestBetweenExercises,
  DEFAULT_REST_BETWEEN_SETS,
  DEFAULT_REST_BETWEEN_EXERCISES,
} from "@/lib/storage";
import { workoutAudio } from "@/lib/workout-audio";

// ── Types ──────────────────────────────────────────────────────────────

type SegmentType = "work" | "rest" | "transition";

interface TimerSegment {
  type: SegmentType;
  exerciseIndex: number;
  setNumber: number; // 1-based
  totalSets: number;
  exerciseName: string;
  formCue: string;
  setsReps: string;
  durationSeconds: number;
}

type TimerState = "idle" | "running" | "paused" | "finished";

// ── Helpers ────────────────────────────────────────────────────────────

function buildSegments(
  exercises: Exercise[],
  customRestBetweenSets?: number,
  customRestBetweenExercises?: number,
): TimerSegment[] {
  const segments: TimerSegment[] = [];
  const restBetweenExercises = customRestBetweenExercises ?? DEFAULT_REST_BETWEEN_EXERCISES;

  exercises.forEach((ex, exIdx) => {
    const sets = ex.sets ?? 1;
    const workDuration = ex.durationSeconds ?? 40;
    const restDuration = customRestBetweenSets ?? ex.restSeconds ?? DEFAULT_REST_BETWEEN_SETS;

    for (let s = 1; s <= sets; s++) {
      // Work segment
      segments.push({
        type: "work",
        exerciseIndex: exIdx,
        setNumber: s,
        totalSets: sets,
        exerciseName: ex.name,
        formCue: ex.formCue,
        setsReps: ex.setsReps,
        durationSeconds: workDuration,
      });

      // Rest between sets (not after the last set)
      if (s < sets) {
        segments.push({
          type: "rest",
          exerciseIndex: exIdx,
          setNumber: s,
          totalSets: sets,
          exerciseName: ex.name,
          formCue: "Catch your breath",
          setsReps: "",
          durationSeconds: restDuration,
        });
      }
    }

    // Transition rest between exercises (not after the last exercise)
    if (exIdx < exercises.length - 1) {
      segments.push({
        type: "transition",
        exerciseIndex: exIdx,
        setNumber: 0,
        totalSets: 0,
        exerciseName: exercises[exIdx + 1].name,
        formCue: `Coming up next`,
        setsReps: "",
        durationSeconds: restBetweenExercises,
      });
    }
  });

  return segments;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function totalWorkoutTime(segments: TimerSegment[]): number {
  return segments.reduce((sum, seg) => sum + seg.durationSeconds, 0);
}

// ── Component ──────────────────────────────────────────────────────────

interface WorkoutTimerProps {
  exercises: Exercise[];
  onComplete: () => void;
  onCancel: () => void;
}

export function WorkoutTimer({ exercises, onComplete, onCancel }: WorkoutTimerProps) {
  const colors = useColors();

  // Keep screen awake during workout
  if (Platform.OS !== "web") {
    useKeepAwake();
  }

  const [restBetweenSets, setRestBetweenSets] = useState(DEFAULT_REST_BETWEEN_SETS);
  const [restBetweenExercises, setRestBetweenExercises] = useState(DEFAULT_REST_BETWEEN_EXERCISES);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const segments = useMemo(
    () => buildSegments(exercises, restBetweenSets, restBetweenExercises),
    [exercises, restBetweenSets, restBetweenExercises],
  );
  const totalTime = useMemo(() => totalWorkoutTime(segments), [segments]);

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const halfwayPlayedRef = useRef<Set<number>>(new Set());

  const currentSegment = segments[currentSegmentIndex];

  // Initialize audio on mount, load preferences (including rest times)
  useEffect(() => {
    let mounted = true;

    async function setup() {
      const [audioOn, voiceOn, restSets, restExercises] = await Promise.all([
        getAudioEnabled(),
        getVoiceEnabled(),
        getRestBetweenSets(),
        getRestBetweenExercises(),
      ]);
      if (mounted) {
        setAudioEnabled(audioOn);
        setVoiceEnabled(voiceOn);
        setRestBetweenSets(restSets);
        setRestBetweenExercises(restExercises);
        setPrefsLoaded(true);
        workoutAudio.muted = !audioOn;
        workoutAudio.voiceEnabled = voiceOn;
      }
      await workoutAudio.init();
    }

    setup();

    return () => {
      mounted = false;
      workoutAudio.release();
    };
  }, []);

  // Toggle audio mute
  const toggleAudio = useCallback(async () => {
    const newValue = !audioEnabled;
    setAudioEnabled(newValue);
    workoutAudio.muted = !newValue;
    await saveAudioEnabled(newValue);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [audioEnabled]);

  // Toggle voice announcements
  const toggleVoice = useCallback(async () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    workoutAudio.voiceEnabled = newValue;
    await saveVoiceEnabled(newValue);
    if (!newValue) {
      workoutAudio.stopSpeech();
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [voiceEnabled]);

  // Pulse animation for countdown
  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulseAnim]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerState !== "running") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Segment complete
          moveToNextSegment();
          return 0;
        }

        // Countdown audio + haptic at 3, 2, 1
        if (prev <= 4 && prev > 1) {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          workoutAudio.playTick();
          triggerPulse();
        }

        // Halfway marker for work segments
        if (currentSegment?.type === "work" && currentSegment.durationSeconds > 10) {
          const halfPoint = Math.floor(currentSegment.durationSeconds / 2);
          if (prev - 1 === halfPoint && !halfwayPlayedRef.current.has(currentSegmentIndex)) {
            halfwayPlayedRef.current.add(currentSegmentIndex);
            workoutAudio.playHalfway();
            workoutAudio.announceHalfway();
          }
        }

        setElapsedTotal((e) => e + 1);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState, currentSegmentIndex]);

  const moveToNextSegment = useCallback(() => {
    setCurrentSegmentIndex((prev) => {
      const next = prev + 1;
      if (next >= segments.length) {
        // Workout finished
        setTimerState("finished");
        workoutAudio.playComplete();
        workoutAudio.announceComplete();
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setTimeout(() => onComplete(), 500);
        return prev;
      }
      setTimeRemaining(segments[next].durationSeconds);

      // Play audio cue and voice announcement based on next segment type
      const nextSeg = segments[next];
      if (nextSeg.type === "work") {
        workoutAudio.playWorkStart();
        workoutAudio.announceWorkStart(nextSeg.exerciseName, nextSeg.setNumber, nextSeg.totalSets);
      } else if (nextSeg.type === "rest") {
        workoutAudio.playRestStart();
        workoutAudio.announceRest(nextSeg.durationSeconds);
      } else if (nextSeg.type === "transition") {
        workoutAudio.playTransition();
        workoutAudio.announceTransition(nextSeg.exerciseName);
      }

      // Haptic feedback on segment change
      if (Platform.OS !== "web") {
        if (nextSeg.type === "work") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
      return next;
    });
  }, [segments, onComplete]);

  const handleStart = () => {
    // Set initial time from the first segment
    if (segments.length > 0) {
      setTimeRemaining(segments[0].durationSeconds);
    }
    setTimerState("running");
    workoutAudio.playGo();
    // Voice announce the first exercise
    if (segments.length > 0) {
      workoutAudio.announceGo(segments[0].exerciseName);
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePause = () => {
    setTimerState("paused");
    workoutAudio.stopSpeech();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleResume = () => {
    setTimerState("running");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSkipSegment = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    workoutAudio.stopSpeech();
    setElapsedTotal((e) => e + timeRemaining);
    moveToNextSegment();
  };

  // Progress calculations
  const overallProgress = totalTime > 0 ? elapsedTotal / totalTime : 0;
  const segmentProgress =
    currentSegment && currentSegment.durationSeconds > 0
      ? 1 - timeRemaining / currentSegment.durationSeconds
      : 0;

  // Count unique exercises completed
  const exercisesCompleted = useMemo(() => {
    if (!currentSegment) return exercises.length;
    const completedExercises = new Set<number>();
    for (let i = 0; i < currentSegmentIndex; i++) {
      if (segments[i].type === "work") {
        completedExercises.add(segments[i].exerciseIndex);
      }
    }
    return completedExercises.size;
  }, [currentSegmentIndex, segments, exercises.length]);

  // Determine colors based on segment type
  const segmentColor = useMemo(() => {
    if (!currentSegment) return colors.primary;
    switch (currentSegment.type) {
      case "work":
        return colors.primary;
      case "rest":
        return colors.success;
      case "transition":
        return "#6B7AED";
      default:
        return colors.primary;
    }
  }, [currentSegment, colors]);

  const segmentLabel = useMemo(() => {
    if (!currentSegment) return "";
    switch (currentSegment.type) {
      case "work":
        return currentSegment.totalSets > 1
          ? `Set ${currentSegment.setNumber} of ${currentSegment.totalSets}`
          : "GO";
      case "rest":
        return "REST";
      case "transition":
        return "GET READY";
      default:
        return "";
    }
  }, [currentSegment]);

  // ── Audio + Voice toggle buttons ──
  const ToggleButtons = () => (
    <View style={styles.toggleRow}>
      <Pressable
        onPress={toggleAudio}
        style={({ pressed }) => [
          styles.toggleButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.7 },
        ]}
      >
        <MaterialIcons
          name={audioEnabled ? "volume-up" : "volume-off"}
          size={20}
          color={audioEnabled ? colors.primary : colors.muted}
        />
        <Text style={[styles.toggleLabel, { color: audioEnabled ? colors.primary : colors.muted }]}>
          Sound
        </Text>
      </Pressable>
      <Pressable
        onPress={toggleVoice}
        style={({ pressed }) => [
          styles.toggleButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.7 },
        ]}
      >
        <MaterialIcons
          name={voiceEnabled ? "record-voice-over" : "voice-over-off"}
          size={20}
          color={voiceEnabled ? colors.primary : colors.muted}
        />
        <Text style={[styles.toggleLabel, { color: voiceEnabled ? colors.primary : colors.muted }]}>
          Voice
        </Text>
      </Pressable>
    </View>
  );

  // ── Idle state: "Start Workout" ──
  if (timerState === "idle") {
    return (
      <View style={styles.container}>
        {/* Audio + Voice toggles in top right */}
        <View style={styles.topBar}>
          <View style={styles.topBarSpacer} />
          <ToggleButtons />
        </View>
        <View style={styles.idleContent}>
          <MaterialIcons name="play-circle-filled" size={80} color={colors.primary} />
          <Text style={[styles.idleTitle, { color: colors.foreground }]}>
            Ready to go?
          </Text>
          <Text style={[styles.idleSubtitle, { color: colors.muted }]}>
            {exercises.length} exercises · ~{Math.ceil(totalTime / 60)} min
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusChip}>
              <MaterialIcons
                name={audioEnabled ? "volume-up" : "volume-off"}
                size={14}
                color={colors.muted}
              />
              <Text style={[styles.statusText, { color: colors.muted }]}>
                {audioEnabled ? "Sound on" : "Sound off"}
              </Text>
            </View>
            <View style={styles.statusChip}>
              <MaterialIcons
                name={voiceEnabled ? "record-voice-over" : "voice-over-off"}
                size={14}
                color={colors.muted}
              />
              <Text style={[styles.statusText, { color: colors.muted }]}>
                {voiceEnabled ? "Voice on" : "Voice off"}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusChip}>
              <MaterialIcons name="timer" size={14} color={colors.muted} />
              <Text style={[styles.statusText, { color: colors.muted }]}>
                Rest: {restBetweenSets}s sets · {restBetweenExercises}s exercises
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelLink, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.cancelLinkText, { color: colors.muted }]}>
              Back to overview
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Finished state ──
  if (timerState === "finished") {
    return (
      <View style={styles.container}>
        <View style={styles.idleContent}>
          <Text style={styles.finishedEmoji}>🎉</Text>
          <Text style={[styles.idleTitle, { color: colors.foreground }]}>
            Workout Complete!
          </Text>
          <Text style={[styles.idleSubtitle, { color: colors.muted }]}>
            You crushed it. Great job!
          </Text>
        </View>
      </View>
    );
  }

  // ── Running / Paused state ──
  return (
    <View style={styles.container}>
      {/* Top bar with toggles */}
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        <ToggleButtons />
      </View>

      {/* Overall progress bar */}
      <View style={[styles.overallProgressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.overallProgressFill,
            {
              backgroundColor: colors.primary,
              width: `${Math.min(overallProgress * 100, 100)}%`,
            },
          ]}
        />
      </View>

      {/* Exercise counter */}
      <View style={styles.exerciseCounter}>
        <Text style={[styles.exerciseCounterText, { color: colors.muted }]}>
          Exercise {Math.min(currentSegment.exerciseIndex + 1, exercises.length)} of{" "}
          {exercises.length}
        </Text>
      </View>

      {/* Main timer display */}
      <View style={styles.timerCenter}>
        {/* Segment type label */}
        <View style={[styles.segmentBadge, { backgroundColor: segmentColor }]}>
          <Text style={styles.segmentBadgeText}>{segmentLabel}</Text>
        </View>

        {/* Exercise name */}
        <Text style={[styles.exerciseName, { color: colors.foreground }]} numberOfLines={2}>
          {currentSegment.type === "transition"
            ? `Next: ${currentSegment.exerciseName}`
            : currentSegment.exerciseName}
        </Text>

        {/* Countdown */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={[styles.countdown, { color: segmentColor }]}>
            {formatTime(timeRemaining)}
          </Text>
        </Animated.View>

        {/* Segment progress bar */}
        <View style={[styles.segmentProgressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.segmentProgressFill,
              {
                backgroundColor: segmentColor,
                width: `${segmentProgress * 100}%`,
              },
            ]}
          />
        </View>

        {/* Form cue */}
        {currentSegment.type === "work" && (
          <View style={[styles.formCueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={18} color={segmentColor} />
            <Text style={[styles.formCueText, { color: colors.foreground }]}>
              {currentSegment.formCue}
            </Text>
          </View>
        )}

        {/* Sets/reps info */}
        {currentSegment.type === "work" && currentSegment.setsReps && (
          <Text style={[styles.setsRepsText, { color: colors.muted }]}>
            {currentSegment.setsReps}
          </Text>
        )}

        {/* Rest message */}
        {currentSegment.type === "rest" && (
          <Text style={[styles.restMessage, { color: colors.muted }]}>
            Breathe and recover
          </Text>
        )}

        {/* Transition message */}
        {currentSegment.type === "transition" && (
          <Text style={[styles.restMessage, { color: colors.muted }]}>
            Get into position
          </Text>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Skip segment */}
        <Pressable
          onPress={handleSkipSegment}
          style={({ pressed }) => [
            styles.controlButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialIcons name="skip-next" size={28} color={colors.foreground} />
          <Text style={[styles.controlLabel, { color: colors.muted }]}>Skip</Text>
        </Pressable>

        {/* Play/Pause */}
        <Pressable
          onPress={timerState === "running" ? handlePause : handleResume}
          style={({ pressed }) => [
            styles.playPauseButton,
            { backgroundColor: segmentColor },
            pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 },
          ]}
        >
          <MaterialIcons
            name={timerState === "running" ? "pause" : "play-arrow"}
            size={40}
            color="#FFFFFF"
          />
        </Pressable>

        {/* Stop */}
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.controlButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialIcons name="stop" size={28} color={colors.error} />
          <Text style={[styles.controlLabel, { color: colors.muted }]}>Stop</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topBarSpacer: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Status chips on idle screen
  statusRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Idle / Finished
  idleContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  idleTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8,
  },
  idleSubtitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: 60,
    borderRadius: 16,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  cancelLink: {
    marginTop: 8,
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontSize: 15,
    fontWeight: "500",
  },
  finishedEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  // Running / Paused
  overallProgressBar: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 20,
    marginTop: 4,
    overflow: "hidden",
  },
  overallProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  exerciseCounter: {
    alignItems: "center",
    marginTop: 12,
  },
  exerciseCounterText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timerCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  segmentBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  segmentBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 32,
  },
  countdown: {
    fontSize: 80,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: -2,
  },
  segmentProgressBar: {
    width: "80%",
    height: 6,
    borderRadius: 3,
    marginTop: 20,
    overflow: "hidden",
  },
  segmentProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  formCueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: "90%",
  },
  formCueText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    lineHeight: 22,
  },
  setsRepsText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  restMessage: {
    fontSize: 17,
    fontWeight: "500",
    marginTop: 24,
  },
  // Controls
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
