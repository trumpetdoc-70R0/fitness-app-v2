import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    multiRemove: vi.fn((keys: string[]) => {
      keys.forEach((k) => delete mockStorage[k]);
      return Promise.resolve();
    }),
  },
}));

import {
  getProfile,
  saveProfile,
  getEquipment,
  saveEquipment,
  getActivities,
  saveActivities,
  getWorkouts,
  saveWorkout,
  getAILearning,
  updateAILearning,
  getWeeklyStats,
  getTrainingLoad,
  resetAllData,
  EQUIPMENT_OPTIONS,
  ACTIVITY_OPTIONS,
  type UserProfile,
  type Workout,
} from "../lib/storage";

describe("Storage Layer", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  describe("Profile", () => {
    it("should return null when no profile exists", async () => {
      const profile = await getProfile();
      expect(profile).toBeNull();
    });

    it("should save and retrieve a profile", async () => {
      const profile: UserProfile = {
        age: 30,
        gender: "male",
        fitnessLevel: "intermediate",
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
      };
      await saveProfile(profile);
      const retrieved = await getProfile();
      expect(retrieved).toEqual(profile);
    });
  });

  describe("Equipment", () => {
    it("should return empty array when no equipment set", async () => {
      const equipment = await getEquipment();
      expect(equipment).toEqual([]);
    });

    it("should save and retrieve equipment", async () => {
      const equipment = ["bodyweight", "dumbbells"] as any;
      await saveEquipment(equipment);
      const retrieved = await getEquipment();
      expect(retrieved).toEqual(equipment);
    });
  });

  describe("Activities", () => {
    it("should return empty array when no activities set", async () => {
      const activities = await getActivities();
      expect(activities).toEqual([]);
    });

    it("should save and retrieve activities", async () => {
      const activities = ["running", "yoga"] as any;
      await saveActivities(activities);
      const retrieved = await getActivities();
      expect(retrieved).toEqual(activities);
    });
  });

  describe("Workouts", () => {
    it("should return empty array when no workouts exist", async () => {
      const workouts = await getWorkouts();
      expect(workouts).toEqual([]);
    });

    it("should save and retrieve a workout", async () => {
      const workout: Workout = {
        id: "test-1",
        date: new Date().toISOString(),
        type: "hiit",
        title: "Test HIIT",
        duration: 20,
        energyLevel: "high",
        exercises: [
          { name: "Burpees", setsReps: "3 x 10", formCue: "Explosive jump" },
        ],
        completed: false,
        skipped: false,
      };
      await saveWorkout(workout);
      const workouts = await getWorkouts();
      expect(workouts.length).toBe(1);
      expect(workouts[0].id).toBe("test-1");
    });

    it("should update an existing workout", async () => {
      const workout: Workout = {
        id: "test-1",
        date: new Date().toISOString(),
        type: "hiit",
        title: "Test HIIT",
        duration: 20,
        energyLevel: "high",
        exercises: [],
        completed: false,
        skipped: false,
      };
      await saveWorkout(workout);
      workout.completed = true;
      workout.completedAt = new Date().toISOString();
      await saveWorkout(workout);
      const workouts = await getWorkouts();
      expect(workouts.length).toBe(1);
      expect(workouts[0].completed).toBe(true);
    });
  });

  describe("AI Learning", () => {
    it("should return default AI learning data", async () => {
      const learning = await getAILearning();
      expect(learning.completedTypes).toEqual({});
      expect(learning.skippedTypes).toEqual({});
      expect(learning.preferenceWeights).toEqual({});
    });

    it("should track completed workout types", async () => {
      await updateAILearning("hiit", true);
      await updateAILearning("hiit", true);
      const learning = await getAILearning();
      expect(learning.completedTypes["hiit"]).toBe(2);
      expect(learning.preferenceWeights["hiit"]).toBe(2);
    });

    it("should track skipped workout types", async () => {
      await updateAILearning("yoga", false);
      const learning = await getAILearning();
      expect(learning.skippedTypes["yoga"]).toBe(1);
      expect(learning.preferenceWeights["yoga"]).toBe(-0.5);
    });
  });

  describe("Constants", () => {
    it("should have equipment options defined", () => {
      expect(EQUIPMENT_OPTIONS.length).toBeGreaterThan(0);
      expect(EQUIPMENT_OPTIONS[0]).toHaveProperty("id");
      expect(EQUIPMENT_OPTIONS[0]).toHaveProperty("label");
      expect(EQUIPMENT_OPTIONS[0]).toHaveProperty("icon");
    });

    it("should have activity options defined", () => {
      expect(ACTIVITY_OPTIONS.length).toBeGreaterThan(0);
      expect(ACTIVITY_OPTIONS[0]).toHaveProperty("id");
      expect(ACTIVITY_OPTIONS[0]).toHaveProperty("label");
    });
  });

  describe("Reset", () => {
    it("should clear all data", async () => {
      await saveProfile({
        age: 30,
        gender: "male",
        fitnessLevel: "intermediate",
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
      });
      await resetAllData();
      const profile = await getProfile();
      expect(profile).toBeNull();
    });
  });
});
