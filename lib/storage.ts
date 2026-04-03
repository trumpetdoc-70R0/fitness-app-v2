import AsyncStorage from "@react-native-async-storage/async-storage";

// ============ Types ============

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type EnergyLevel = "low" | "medium" | "high";
export type TimeAvailable = 10 | 20 | 30;

export interface UserProfile {
  age: number;
  gender: Gender;
  fitnessLevel: FitnessLevel;
  onboardingComplete: boolean;
  createdAt: string;

}

export const EQUIPMENT_OPTIONS = [
  { id: "bodyweight", label: "Bodyweight", icon: "🏋️" },
  { id: "dumbbells", label: "Dumbbells", icon: "🏋️" },
  { id: "barbell", label: "Barbell", icon: "🏋️" },
  { id: "resistance_bands", label: "Resistance Bands", icon: "🔗" },
  { id: "pull_up_bar", label: "Pull-up Bar", icon: "💪" },
  { id: "jump_rope", label: "Jump Rope", icon: "🪢" },
  { id: "yoga_mat", label: "Yoga Mat", icon: "🧘" },
  { id: "kettlebell", label: "Kettlebell", icon: "🔔" },
  { id: "treadmill", label: "Treadmill", icon: "🏃" },
  { id: "stationary_bike", label: "Stationary Bike", icon: "🚴" },
] as const;

export const ACTIVITY_OPTIONS = [
  { id: "running", label: "Running" },
  { id: "cycling", label: "Cycling" },
  { id: "yoga", label: "Yoga" },
  { id: "hiit", label: "HIIT" },
  { id: "strength", label: "Strength Training" },
  { id: "stretching", label: "Stretching" },
  { id: "walking", label: "Walking" },
  { id: "swimming", label: "Swimming" },
  { id: "bodyweight_exercises", label: "Bodyweight Exercises" },
  { id: "core_work", label: "Core Work" },
] as const;

export type EquipmentId = typeof EQUIPMENT_OPTIONS[number]["id"];
export type ActivityId = typeof ACTIVITY_OPTIONS[number]["id"];

export interface Exercise {
  name: string;
  setsReps: string;
  formCue: string;
  /** Duration in seconds for each set/rep block (e.g. 40 for a 40-second set) */
  durationSeconds?: number;
  /** Number of sets (defaults to 1 if not provided) */
  sets?: number;
  /** Rest duration in seconds between sets (defaults to 15) */
  restSeconds?: number;
}

export interface Workout {
  id: string;
  date: string;
  type: string;
  title: string;
  duration: number;
  energyLevel: EnergyLevel;
  exercises: Exercise[];
  completed: boolean;
  skipped: boolean;
  completedAt?: string;
}

export interface AILearningData {
  completedTypes: Record<string, number>;
  skippedTypes: Record<string, number>;
  preferenceWeights: Record<string, number>;
  lastUpdated: string;
}

// ============ Storage Keys ============

const KEYS = {
  PROFILE: "fitness_profile",
  EQUIPMENT: "fitness_equipment",
  ACTIVITIES: "fitness_activities",
  WORKOUTS: "fitness_workouts",
  AI_LEARNING: "fitness_ai_learning",
  PREMIUM: "fitness_premium",
  REVIEW_PROMPTED: "fitness_review_prompted",
  COMPLETED_COUNT: "fitness_completed_count",
  THEME_PREFERENCE: "fitness_theme_preference",
  AUDIO_ENABLED: "fitness_audio_enabled",
  VOICE_ENABLED: "fitness_voice_enabled",
  REST_BETWEEN_SETS: "fitness_rest_between_sets",
  REST_BETWEEN_EXERCISES: "fitness_rest_between_exercises",
} as const;

// ============ Profile ============

export async function getProfile(): Promise<UserProfile | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export async function isOnboardingComplete(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.onboardingComplete === true;
}

// ============ Equipment ============

export async function getEquipment(): Promise<EquipmentId[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.EQUIPMENT);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveEquipment(equipment: EquipmentId[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.EQUIPMENT, JSON.stringify(equipment));
}

// ============ Activities ============

export async function getActivities(): Promise<ActivityId[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ACTIVITIES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveActivities(activities: ActivityId[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
}

// ============ Workouts ============

export async function getWorkouts(): Promise<Workout[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.WORKOUTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveWorkout(workout: Workout): Promise<void> {
  const workouts = await getWorkouts();
  const existingIndex = workouts.findIndex((w) => w.id === workout.id);
  if (existingIndex >= 0) {
    workouts[existingIndex] = workout;
  } else {
    workouts.unshift(workout);
  }
  // Keep last 90 days of workouts
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const filtered = workouts.filter((w) => new Date(w.date) >= cutoff);
  await AsyncStorage.setItem(KEYS.WORKOUTS, JSON.stringify(filtered));
}

export async function getRecentWorkouts(days: number = 7): Promise<Workout[]> {
  const workouts = await getWorkouts();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return workouts.filter((w) => new Date(w.date) >= cutoff);
}

export async function getLastNCompletedWorkouts(n: number): Promise<Workout[]> {
  const workouts = await getWorkouts();
  return workouts.filter((w) => w.completed).slice(0, n);
}

// ============ AI Learning ============

export async function getAILearning(): Promise<AILearningData> {
  try {
    const data = await AsyncStorage.getItem(KEYS.AI_LEARNING);
    if (data) return JSON.parse(data);
  } catch {
    // fall through
  }
  return {
    completedTypes: {},
    skippedTypes: {},
    preferenceWeights: {},
    lastUpdated: new Date().toISOString(),
  };
}

export async function updateAILearning(
  workoutType: string,
  completed: boolean
): Promise<void> {
  const learning = await getAILearning();
  if (completed) {
    learning.completedTypes[workoutType] =
      (learning.completedTypes[workoutType] || 0) + 1;
    learning.preferenceWeights[workoutType] =
      (learning.preferenceWeights[workoutType] || 0) + 1;
  } else {
    learning.skippedTypes[workoutType] =
      (learning.skippedTypes[workoutType] || 0) + 1;
    learning.preferenceWeights[workoutType] =
      (learning.preferenceWeights[workoutType] || 0) - 0.5;
  }
  learning.lastUpdated = new Date().toISOString();
  await AsyncStorage.setItem(KEYS.AI_LEARNING, JSON.stringify(learning));
}



// ============ Weekly Stats ============

export async function getWeeklyStats(): Promise<{
  totalWorkouts: number;
  totalMinutes: number;
  streak: number;
  workoutTypes: Record<string, number>;
}> {
  const weekWorkouts = await getRecentWorkouts(7);
  const completed = weekWorkouts.filter((w) => w.completed);

  const workoutTypes: Record<string, number> = {};
  let totalMinutes = 0;

  completed.forEach((w) => {
    totalMinutes += w.duration;
    workoutTypes[w.type] = (workoutTypes[w.type] || 0) + 1;
  });

  // Calculate streak (consecutive days with completed workouts)
  const allWorkouts = await getWorkouts();
  const completedDates = new Set(
    allWorkouts
      .filter((w) => w.completed)
      .map((w) => new Date(w.date).toDateString())
  );

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    if (completedDates.has(checkDate.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return {
    totalWorkouts: completed.length,
    totalMinutes,
    streak,
    workoutTypes,
  };
}

// ============ Training Load ============

export async function getTrainingLoad(): Promise<{
  dailyStress: number;
  weeklyAverage: number;
  missedDays: number;
}> {
  const weekWorkouts = await getRecentWorkouts(7);
  const completed = weekWorkouts.filter((w) => w.completed);

  // Simple training stress: sum of (duration * intensity multiplier)
  const stressMap: Record<string, number> = {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
  };

  let totalStress = 0;
  completed.forEach((w) => {
    const multiplier = stressMap[w.energyLevel] || 1.0;
    totalStress += w.duration * multiplier;
  });

  const todayWorkouts = completed.filter(
    (w) => new Date(w.date).toDateString() === new Date().toDateString()
  );
  let dailyStress = 0;
  todayWorkouts.forEach((w) => {
    const multiplier = stressMap[w.energyLevel] || 1.0;
    dailyStress += w.duration * multiplier;
  });

  // Count days with no workout in the past 7 days
  const workoutDates = new Set(
    completed.map((w) => new Date(w.date).toDateString())
  );
  let missedDays = 0;
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    if (!workoutDates.has(checkDate.toDateString())) {
      missedDays++;
    }
  }

  return {
    dailyStress,
    weeklyAverage: completed.length > 0 ? totalStress / 7 : 0,
    missedDays,
  };
}

// ============ Premium / Ad-Free ============

export async function isPremium(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PREMIUM);
    return data === "true";
  } catch {
    return false;
  }
}

export async function setPremium(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.PREMIUM, value ? "true" : "false");
}

// ============ Review Prompt ============

export async function getCompletedWorkoutCount(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(KEYS.COMPLETED_COUNT);
    return data ? parseInt(data, 10) : 0;
  } catch {
    return 0;
  }
}

export async function incrementCompletedWorkoutCount(): Promise<number> {
  const count = await getCompletedWorkoutCount();
  const newCount = count + 1;
  await AsyncStorage.setItem(KEYS.COMPLETED_COUNT, String(newCount));
  return newCount;
}

export async function hasBeenPromptedForReview(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(KEYS.REVIEW_PROMPTED);
    return data === "true";
  } catch {
    return false;
  }
}

export async function setReviewPrompted(): Promise<void> {
  await AsyncStorage.setItem(KEYS.REVIEW_PROMPTED, "true");
}

// ============ Theme Preference ============

export type ThemePreference = "system" | "light" | "dark";

export async function getThemePreference(): Promise<ThemePreference> {
  try {
    const data = await AsyncStorage.getItem(KEYS.THEME_PREFERENCE);
    if (data === "light" || data === "dark" || data === "system") return data;
    return "system";
  } catch {
    return "system";
  }
}

export async function saveThemePreference(pref: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(KEYS.THEME_PREFERENCE, pref);
}

// ============ Audio Preference ============

export async function getAudioEnabled(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(KEYS.AUDIO_ENABLED);
    // Default to true (audio on) if never set
    return data !== "false";
  } catch {
    return true;
  }
}

export async function saveAudioEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.AUDIO_ENABLED, enabled ? "true" : "false");
}

// ============ Voice Announcements Preference ============

export async function getVoiceEnabled(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(KEYS.VOICE_ENABLED);
    // Default to true (voice on) if never set
    return data !== "false";
  } catch {
    return true;
  }
}

export async function saveVoiceEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.VOICE_ENABLED, enabled ? "true" : "false");
}

// ============ Rest Time Preferences ============

export const REST_TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;
export type RestTimeOption = typeof REST_TIME_OPTIONS[number];

export const DEFAULT_REST_BETWEEN_SETS = 15;
export const DEFAULT_REST_BETWEEN_EXERCISES = 20;

export async function getRestBetweenSets(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(KEYS.REST_BETWEEN_SETS);
    return data ? parseInt(data, 10) : DEFAULT_REST_BETWEEN_SETS;
  } catch {
    return DEFAULT_REST_BETWEEN_SETS;
  }
}

export async function saveRestBetweenSets(seconds: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.REST_BETWEEN_SETS, String(seconds));
}

export async function getRestBetweenExercises(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(KEYS.REST_BETWEEN_EXERCISES);
    return data ? parseInt(data, 10) : DEFAULT_REST_BETWEEN_EXERCISES;
  } catch {
    return DEFAULT_REST_BETWEEN_EXERCISES;
  }
}

export async function saveRestBetweenExercises(seconds: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.REST_BETWEEN_EXERCISES, String(seconds));
}

// ============ Reset ============

export async function resetAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
