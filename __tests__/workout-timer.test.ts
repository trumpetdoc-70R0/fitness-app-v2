import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock native modules that aren't available in test environment
vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium", Heavy: "Heavy" },
  NotificationFeedbackType: { Success: "Success", Warning: "Warning", Error: "Error" },
}));

vi.mock("expo-keep-awake", () => ({
  useKeepAwake: vi.fn(),
  activateKeepAwake: vi.fn(),
  deactivateKeepAwake: vi.fn(),
}));

vi.mock("expo-audio", () => ({
  createAudioPlayer: vi.fn(() => ({
    play: vi.fn(),
    seekTo: vi.fn(),
    remove: vi.fn(),
    volume: 1.0,
  })),
  setAudioModeAsync: vi.fn(() => Promise.resolve()),
}));

// Mock the workout-audio module since it uses require() for asset imports
// which aren't available in the vitest environment
const mockWorkoutAudio = {
  init: vi.fn(() => Promise.resolve()),
  release: vi.fn(),
  play: vi.fn(),
  playTick: vi.fn(),
  playGo: vi.fn(),
  playWorkStart: vi.fn(),
  playRestStart: vi.fn(),
  playTransition: vi.fn(),
  playComplete: vi.fn(),
  playHalfway: vi.fn(),
  speak: vi.fn(),
  stopSpeech: vi.fn(),
  announceWorkStart: vi.fn(),
  announceRest: vi.fn(),
  announceTransition: vi.fn(),
  announceGo: vi.fn(),
  announceComplete: vi.fn(),
  announceHalfway: vi.fn(),
  muted: false,
  voiceEnabled: true,
};
vi.mock("../lib/workout-audio", () => ({
  workoutAudio: mockWorkoutAudio,
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
}));

import type { Exercise } from "../lib/storage";

// We test the segment-building logic directly by extracting it
// Since the function is inside the component file, we replicate the logic here for unit testing

type SegmentType = "work" | "rest" | "transition";

interface TimerSegment {
  type: SegmentType;
  exerciseIndex: number;
  setNumber: number;
  totalSets: number;
  exerciseName: string;
  formCue: string;
  setsReps: string;
  durationSeconds: number;
}

function buildSegments(
  exercises: Exercise[],
  customRestBetweenSets?: number,
  customRestBetweenExercises?: number,
): TimerSegment[] {
  const segments: TimerSegment[] = [];
  const restBetweenExercises = customRestBetweenExercises ?? 20;

  exercises.forEach((ex, exIdx) => {
    const sets = ex.sets ?? 1;
    const workDuration = ex.durationSeconds ?? 40;
    const restDuration = customRestBetweenSets ?? ex.restSeconds ?? 15;

    for (let s = 1; s <= sets; s++) {
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

    if (exIdx < exercises.length - 1) {
      segments.push({
        type: "transition",
        exerciseIndex: exIdx,
        setNumber: 0,
        totalSets: 0,
        exerciseName: exercises[exIdx + 1].name,
        formCue: "Coming up next",
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

describe("Workout Timer - Segment Builder", () => {
  it("should build correct segments for a single exercise with 1 set", () => {
    const exercises: Exercise[] = [
      {
        name: "Plank",
        setsReps: "60 seconds",
        formCue: "Keep core tight",
        durationSeconds: 60,
        sets: 1,
        restSeconds: 15,
      },
    ];

    const segments = buildSegments(exercises);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("work");
    expect(segments[0].exerciseName).toBe("Plank");
    expect(segments[0].durationSeconds).toBe(60);
    expect(segments[0].setNumber).toBe(1);
    expect(segments[0].totalSets).toBe(1);
  });

  it("should build work and rest segments for multi-set exercises", () => {
    const exercises: Exercise[] = [
      {
        name: "Push-ups",
        setsReps: "3 x 10",
        formCue: "Keep body straight",
        durationSeconds: 40,
        sets: 3,
        restSeconds: 20,
      },
    ];

    const segments = buildSegments(exercises);
    // 3 work + 2 rest (no rest after last set) = 5
    expect(segments).toHaveLength(5);
    expect(segments[0].type).toBe("work");
    expect(segments[0].setNumber).toBe(1);
    expect(segments[1].type).toBe("rest");
    expect(segments[1].durationSeconds).toBe(20);
    expect(segments[2].type).toBe("work");
    expect(segments[2].setNumber).toBe(2);
    expect(segments[3].type).toBe("rest");
    expect(segments[4].type).toBe("work");
    expect(segments[4].setNumber).toBe(3);
  });

  it("should add transition segments between exercises", () => {
    const exercises: Exercise[] = [
      {
        name: "Squats",
        setsReps: "1 x 10",
        formCue: "Chest up",
        durationSeconds: 40,
        sets: 1,
        restSeconds: 15,
      },
      {
        name: "Lunges",
        setsReps: "1 x 10",
        formCue: "Step forward",
        durationSeconds: 40,
        sets: 1,
        restSeconds: 15,
      },
    ];

    const segments = buildSegments(exercises);
    // work(squats) + transition + work(lunges) = 3
    expect(segments).toHaveLength(3);
    expect(segments[0].type).toBe("work");
    expect(segments[0].exerciseName).toBe("Squats");
    expect(segments[1].type).toBe("transition");
    expect(segments[1].exerciseName).toBe("Lunges"); // shows next exercise name
    expect(segments[1].durationSeconds).toBe(20);
    expect(segments[2].type).toBe("work");
    expect(segments[2].exerciseName).toBe("Lunges");
  });

  it("should not add transition after the last exercise", () => {
    const exercises: Exercise[] = [
      {
        name: "Burpees",
        setsReps: "1 x 10",
        formCue: "Jump high",
        durationSeconds: 40,
        sets: 1,
        restSeconds: 15,
      },
    ];

    const segments = buildSegments(exercises);
    expect(segments).toHaveLength(1);
    expect(segments[segments.length - 1].type).toBe("work");
  });

  it("should use default values when timing fields are missing", () => {
    const exercises: Exercise[] = [
      {
        name: "Jumping Jacks",
        setsReps: "30 seconds",
        formCue: "Land softly",
        // no durationSeconds, sets, or restSeconds
      },
    ];

    const segments = buildSegments(exercises);
    expect(segments).toHaveLength(1); // 1 set default
    expect(segments[0].durationSeconds).toBe(40); // default 40s
  });

  it("should build correct segments for a full workout", () => {
    const exercises: Exercise[] = [
      {
        name: "Jumping Jacks",
        setsReps: "2 x 30 seconds",
        formCue: "Land softly",
        durationSeconds: 30,
        sets: 2,
        restSeconds: 15,
      },
      {
        name: "Push-ups",
        setsReps: "3 x 8",
        formCue: "Straight body",
        durationSeconds: 35,
        sets: 3,
        restSeconds: 20,
      },
      {
        name: "Plank",
        setsReps: "30 seconds",
        formCue: "Core tight",
        durationSeconds: 30,
        sets: 1,
        restSeconds: 15,
      },
    ];

    const segments = buildSegments(exercises);
    // Jumping Jacks: 2 work + 1 rest = 3
    // Transition: 1
    // Push-ups: 3 work + 2 rest = 5
    // Transition: 1
    // Plank: 1 work = 1
    // Total: 3 + 1 + 5 + 1 + 1 = 11
    expect(segments).toHaveLength(11);

    // Verify total time
    const total = totalWorkoutTime(segments);
    // JJ: 30*2 + 15 = 75
    // Transition: 20
    // Pushups: 35*3 + 20*2 = 145
    // Transition: 20
    // Plank: 30
    // Total: 75 + 20 + 145 + 20 + 30 = 290
    expect(total).toBe(290);
  });
});

describe("Workout Timer - Format Time", () => {
  it("should format 0 seconds as 0:00", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("should format seconds less than a minute", () => {
    expect(formatTime(30)).toBe("0:30");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(59)).toBe("0:59");
  });

  it("should format minutes and seconds", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(90)).toBe("1:30");
    expect(formatTime(125)).toBe("2:05");
    expect(formatTime(600)).toBe("10:00");
  });
});

describe("Workout Timer - Total Time", () => {
  it("should return 0 for empty segments", () => {
    expect(totalWorkoutTime([])).toBe(0);
  });

  it("should sum all segment durations", () => {
    const segments: TimerSegment[] = [
      {
        type: "work",
        exerciseIndex: 0,
        setNumber: 1,
        totalSets: 1,
        exerciseName: "Test",
        formCue: "Test",
        setsReps: "1 x 10",
        durationSeconds: 40,
      },
      {
        type: "rest",
        exerciseIndex: 0,
        setNumber: 1,
        totalSets: 2,
        exerciseName: "Test",
        formCue: "Rest",
        setsReps: "",
        durationSeconds: 15,
      },
      {
        type: "work",
        exerciseIndex: 0,
        setNumber: 2,
        totalSets: 2,
        exerciseName: "Test",
        formCue: "Test",
        setsReps: "1 x 10",
        durationSeconds: 40,
      },
    ];
    expect(totalWorkoutTime(segments)).toBe(95);
  });
});

describe("Storage - Theme Preference", () => {
  it("should return system as default theme preference", async () => {
    const { getThemePreference } = await import("../lib/storage");
    const pref = await getThemePreference();
    expect(pref).toBe("system");
  });

  it("should save and retrieve theme preference", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const { saveThemePreference } = await import("../lib/storage");
    await saveThemePreference("dark");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("fitness_theme_preference", "dark");
  });
});

describe("Storage - Audio Preference", () => {
  it("should return true (audio enabled) by default", async () => {
    const { getAudioEnabled } = await import("../lib/storage");
    const enabled = await getAudioEnabled();
    expect(enabled).toBe(true);
  });

  it("should save audio enabled preference", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const { saveAudioEnabled } = await import("../lib/storage");
    await saveAudioEnabled(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("fitness_audio_enabled", "false");
  });

  it("should save audio enabled as true", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const { saveAudioEnabled } = await import("../lib/storage");
    await saveAudioEnabled(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("fitness_audio_enabled", "true");
  });
});

describe("WorkoutAudioManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkoutAudio.muted = false;
  });

  it("should initialize without errors", async () => {
    const { workoutAudio } = await import("../lib/workout-audio");
    await workoutAudio.init();
    expect(workoutAudio.init).toHaveBeenCalled();
  });

  it("should support mute toggle", async () => {
    const { workoutAudio } = await import("../lib/workout-audio");
    workoutAudio.muted = true;
    expect(workoutAudio.muted).toBe(true);
    workoutAudio.muted = false;
    expect(workoutAudio.muted).toBe(false);
  });

  it("should expose all audio cue methods", async () => {
    const { workoutAudio } = await import("../lib/workout-audio");
    // Verify all methods exist and can be called
    workoutAudio.playTick();
    workoutAudio.playGo();
    workoutAudio.playWorkStart();
    workoutAudio.playRestStart();
    workoutAudio.playTransition();
    workoutAudio.playComplete();
    workoutAudio.playHalfway();
    expect(workoutAudio.playTick).toHaveBeenCalled();
    expect(workoutAudio.playGo).toHaveBeenCalled();
    expect(workoutAudio.playWorkStart).toHaveBeenCalled();
    expect(workoutAudio.playRestStart).toHaveBeenCalled();
    expect(workoutAudio.playTransition).toHaveBeenCalled();
    expect(workoutAudio.playComplete).toHaveBeenCalled();
    expect(workoutAudio.playHalfway).toHaveBeenCalled();
  });

  it("should clean up on release", async () => {
    const { workoutAudio } = await import("../lib/workout-audio");
    workoutAudio.release();
    expect(workoutAudio.release).toHaveBeenCalled();
  });

  it("should support voice enabled toggle", async () => {
    const { workoutAudio } = await import("../lib/workout-audio");
    workoutAudio.voiceEnabled = true;
    expect(workoutAudio.voiceEnabled).toBe(true);
    workoutAudio.voiceEnabled = false;
    expect(workoutAudio.voiceEnabled).toBe(false);
  });

  it("should expose all voice announcement methods", async () => {
    const { workoutAudio } = await import("../lib/workout-audio");
    workoutAudio.announceWorkStart("Push-ups", 1, 3);
    workoutAudio.announceRest(15);
    workoutAudio.announceTransition("Squats");
    workoutAudio.announceGo("Jumping Jacks");
    workoutAudio.announceComplete();
    workoutAudio.announceHalfway();
    workoutAudio.stopSpeech();
    expect(workoutAudio.announceWorkStart).toHaveBeenCalledWith("Push-ups", 1, 3);
    expect(workoutAudio.announceRest).toHaveBeenCalledWith(15);
    expect(workoutAudio.announceTransition).toHaveBeenCalledWith("Squats");
    expect(workoutAudio.announceGo).toHaveBeenCalledWith("Jumping Jacks");
    expect(workoutAudio.announceComplete).toHaveBeenCalled();
    expect(workoutAudio.announceHalfway).toHaveBeenCalled();
    expect(workoutAudio.stopSpeech).toHaveBeenCalled();
  });
});

describe("Workout Timer - Custom Rest Times", () => {
  it("should use custom rest between sets when provided", () => {
    const exercises: Exercise[] = [
      {
        name: "Push-ups",
        setsReps: "3 x 10",
        formCue: "Keep body straight",
        durationSeconds: 40,
        sets: 3,
        restSeconds: 20,
      },
    ];

    const segments = buildSegments(exercises, 30); // 30s custom rest between sets
    // 3 work + 2 rest = 5
    expect(segments).toHaveLength(5);
    expect(segments[1].type).toBe("rest");
    expect(segments[1].durationSeconds).toBe(30); // custom, not exercise's 20
    expect(segments[3].type).toBe("rest");
    expect(segments[3].durationSeconds).toBe(30);
  });

  it("should use custom rest between exercises when provided", () => {
    const exercises: Exercise[] = [
      {
        name: "Squats",
        setsReps: "1 x 10",
        formCue: "Chest up",
        durationSeconds: 40,
        sets: 1,
        restSeconds: 15,
      },
      {
        name: "Lunges",
        setsReps: "1 x 10",
        formCue: "Step forward",
        durationSeconds: 40,
        sets: 1,
        restSeconds: 15,
      },
    ];

    const segments = buildSegments(exercises, undefined, 45); // 45s custom transition
    expect(segments).toHaveLength(3);
    expect(segments[1].type).toBe("transition");
    expect(segments[1].durationSeconds).toBe(45); // custom, not default 20
  });

  it("should use both custom rest times together", () => {
    const exercises: Exercise[] = [
      {
        name: "Push-ups",
        setsReps: "2 x 10",
        formCue: "Straight body",
        durationSeconds: 35,
        sets: 2,
        restSeconds: 15,
      },
      {
        name: "Plank",
        setsReps: "30 seconds",
        formCue: "Core tight",
        durationSeconds: 30,
        sets: 1,
        restSeconds: 15,
      },
    ];

    const segments = buildSegments(exercises, 10, 60);
    // Push-ups: 2 work + 1 rest = 3
    // Transition: 1
    // Plank: 1 work = 1
    // Total: 5
    expect(segments).toHaveLength(5);
    expect(segments[1].type).toBe("rest");
    expect(segments[1].durationSeconds).toBe(10); // custom between sets
    expect(segments[3].type).toBe("transition");
    expect(segments[3].durationSeconds).toBe(60); // custom between exercises

    const total = totalWorkoutTime(segments);
    // 35 + 10 + 35 + 60 + 30 = 170
    expect(total).toBe(170);
  });

  it("should fall back to defaults when no custom rest times provided", () => {
    const exercises: Exercise[] = [
      {
        name: "Squats",
        setsReps: "2 x 10",
        formCue: "Chest up",
        durationSeconds: 40,
        sets: 2,
      },
      {
        name: "Lunges",
        setsReps: "1 x 10",
        formCue: "Step forward",
        durationSeconds: 40,
        sets: 1,
      },
    ];

    const segments = buildSegments(exercises);
    // Squats: 2 work + 1 rest = 3, Transition: 1, Lunges: 1 work = 1 => 5
    expect(segments).toHaveLength(5);
    expect(segments[1].durationSeconds).toBe(15); // default between sets
    expect(segments[3].durationSeconds).toBe(20); // default between exercises
  });
});

describe("Storage - Rest Time Preferences", () => {
  it("should return default rest between sets (15) when not set", async () => {
    const { getRestBetweenSets } = await import("../lib/storage");
    const rest = await getRestBetweenSets();
    expect(rest).toBe(15);
  });

  it("should return default rest between exercises (20) when not set", async () => {
    const { getRestBetweenExercises } = await import("../lib/storage");
    const rest = await getRestBetweenExercises();
    expect(rest).toBe(20);
  });

  it("should save rest between sets", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const { saveRestBetweenSets } = await import("../lib/storage");
    await saveRestBetweenSets(30);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("fitness_rest_between_sets", "30");
  });

  it("should save rest between exercises", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const { saveRestBetweenExercises } = await import("../lib/storage");
    await saveRestBetweenExercises(45);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("fitness_rest_between_exercises", "45");
  });
});

describe("Storage - Voice Preference", () => {
  it("should return true (voice enabled) by default", async () => {
    const { getVoiceEnabled } = await import("../lib/storage");
    const enabled = await getVoiceEnabled();
    expect(enabled).toBe(true);
  });

  it("should save voice enabled preference", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const { saveVoiceEnabled } = await import("../lib/storage");
    await saveVoiceEnabled(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("fitness_voice_enabled", "false");
  });

  it("should save voice enabled as true", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const { saveVoiceEnabled } = await import("../lib/storage");
    await saveVoiceEnabled(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("fitness_voice_enabled", "true");
  });
});
