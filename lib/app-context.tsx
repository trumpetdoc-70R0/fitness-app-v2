import React, { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import {
  UserProfile,
  EquipmentId,
  ActivityId,
  Workout,
  AILearningData,
  getProfile,
  saveProfile,
  getEquipment,
  saveEquipment,
  getActivities,
  saveActivities,
  getWorkouts,
  saveWorkout as saveWorkoutToStorage,
  getAILearning,
  updateAILearning,
  getWeeklyStats,
  getTrainingLoad,
} from "./storage";

// ============ State ============

interface AppState {
  loading: boolean;
  profile: UserProfile | null;
  equipment: EquipmentId[];
  activities: ActivityId[];
  workouts: Workout[];
  aiLearning: AILearningData;
  weeklyStats: {
    totalWorkouts: number;
    totalMinutes: number;
    streak: number;
    workoutTypes: Record<string, number>;
  };
  trainingLoad: {
    dailyStress: number;
    weeklyAverage: number;
    missedDays: number;
  };
}

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_PROFILE"; payload: UserProfile | null }
  | { type: "SET_EQUIPMENT"; payload: EquipmentId[] }
  | { type: "SET_ACTIVITIES"; payload: ActivityId[] }
  | { type: "SET_WORKOUTS"; payload: Workout[] }
  | { type: "SET_AI_LEARNING"; payload: AILearningData }
  | { type: "SET_WEEKLY_STATS"; payload: AppState["weeklyStats"] }
  | { type: "SET_TRAINING_LOAD"; payload: AppState["trainingLoad"] }
  | { type: "HYDRATE"; payload: Partial<AppState> };

const initialState: AppState = {
  loading: true,
  profile: null,
  equipment: [],
  activities: [],
  workouts: [],
  aiLearning: {
    completedTypes: {},
    skippedTypes: {},
    preferenceWeights: {},
    lastUpdated: new Date().toISOString(),
  },
  weeklyStats: {
    totalWorkouts: 0,
    totalMinutes: 0,
    streak: 0,
    workoutTypes: {},
  },
  trainingLoad: {
    dailyStress: 0,
    weeklyAverage: 0,
    missedDays: 0,
  },
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_PROFILE":
      return { ...state, profile: action.payload };
    case "SET_EQUIPMENT":
      return { ...state, equipment: action.payload };
    case "SET_ACTIVITIES":
      return { ...state, activities: action.payload };
    case "SET_WORKOUTS":
      return { ...state, workouts: action.payload };
    case "SET_AI_LEARNING":
      return { ...state, aiLearning: action.payload };
    case "SET_WEEKLY_STATS":
      return { ...state, weeklyStats: action.payload };
    case "SET_TRAINING_LOAD":
      return { ...state, trainingLoad: action.payload };
    case "HYDRATE":
      return { ...state, ...action.payload, loading: false };
    default:
      return state;
  }
}

// ============ Context ============

interface AppContextValue {
  state: AppState;
  updateProfile: (profile: UserProfile) => Promise<void>;
  updateEquipment: (equipment: EquipmentId[]) => Promise<void>;
  updateActivities: (activities: ActivityId[]) => Promise<void>;
  addWorkout: (workout: Workout) => Promise<void>;
  completeWorkout: (workoutId: string) => Promise<void>;
  skipWorkout: (workoutId: string) => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate state from AsyncStorage on mount
  useEffect(() => {
    async function hydrate() {
      try {
        const [profile, equipment, activities, workouts, aiLearning, stats, load] =
          await Promise.all([
            getProfile(),
            getEquipment(),
            getActivities(),
            getWorkouts(),
            getAILearning(),
            getWeeklyStats(),
            getTrainingLoad(),
          ]);

        dispatch({
          type: "HYDRATE",
          payload: {
            profile,
            equipment,
            activities,
            workouts,
            aiLearning,
            weeklyStats: stats,
            trainingLoad: load,
          },
        });
      } catch (error) {
        console.error("Failed to hydrate state:", error);
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
    hydrate();
  }, []);

  const updateProfile = useCallback(async (profile: UserProfile) => {
    await saveProfile(profile);
    dispatch({ type: "SET_PROFILE", payload: profile });
  }, []);

  const updateEquipment = useCallback(async (equipment: EquipmentId[]) => {
    await saveEquipment(equipment);
    dispatch({ type: "SET_EQUIPMENT", payload: equipment });
  }, []);

  const updateActivities = useCallback(async (activities: ActivityId[]) => {
    await saveActivities(activities);
    dispatch({ type: "SET_ACTIVITIES", payload: activities });
  }, []);

  const addWorkout = useCallback(async (workout: Workout) => {
    await saveWorkoutToStorage(workout);
    const workouts = await getWorkouts();
    dispatch({ type: "SET_WORKOUTS", payload: workouts });
  }, []);

  const completeWorkout = useCallback(async (workoutId: string) => {
    const workouts = await getWorkouts();
    const workout = workouts.find((w) => w.id === workoutId);
    if (workout) {
      workout.completed = true;
      workout.completedAt = new Date().toISOString();
      await saveWorkoutToStorage(workout);
      await updateAILearning(workout.type, true);

      const [updatedWorkouts, aiLearning, stats, load] = await Promise.all([
        getWorkouts(),
        getAILearning(),
        getWeeklyStats(),
        getTrainingLoad(),
      ]);

      dispatch({ type: "SET_WORKOUTS", payload: updatedWorkouts });
      dispatch({ type: "SET_AI_LEARNING", payload: aiLearning });
      dispatch({ type: "SET_WEEKLY_STATS", payload: stats });
      dispatch({ type: "SET_TRAINING_LOAD", payload: load });
    }
  }, []);

  const skipWorkout = useCallback(async (workoutId: string) => {
    const workouts = await getWorkouts();
    const workout = workouts.find((w) => w.id === workoutId);
    if (workout) {
      workout.skipped = true;
      await saveWorkoutToStorage(workout);
      await updateAILearning(workout.type, false);

      const [updatedWorkouts, aiLearning] = await Promise.all([
        getWorkouts(),
        getAILearning(),
      ]);

      dispatch({ type: "SET_WORKOUTS", payload: updatedWorkouts });
      dispatch({ type: "SET_AI_LEARNING", payload: aiLearning });
    }
  }, []);

  const refreshStats = useCallback(async () => {
    const [stats, load] = await Promise.all([
      getWeeklyStats(),
      getTrainingLoad(),
    ]);
    dispatch({ type: "SET_WEEKLY_STATS", payload: stats });
    dispatch({ type: "SET_TRAINING_LOAD", payload: load });
  }, []);

  const refreshAll = useCallback(async () => {
    const [profile, equipment, activities, workouts, aiLearning, stats, load] =
      await Promise.all([
        getProfile(),
        getEquipment(),
        getActivities(),
        getWorkouts(),
        getAILearning(),
        getWeeklyStats(),
        getTrainingLoad(),
      ]);

    dispatch({
      type: "HYDRATE",
      payload: {
        profile,
        equipment,
        activities,
        workouts,
        aiLearning,
        weeklyStats: stats,
        trainingLoad: load,
      },
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        updateProfile,
        updateEquipment,
        updateActivities,
        addWorkout,
        completeWorkout,
        skipWorkout,
        refreshStats,
        refreshAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
