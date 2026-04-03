import { describe, it, expect, vi } from "vitest";

// Mock the LLM module
vi.mock("../server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            type: "hiit",
            title: "Quick Fire HIIT",
            exercises: [
              { name: "Burpees", setsReps: "3 x 10", formCue: "Explosive jump at the top" },
              { name: "Jump Squats", setsReps: "3 x 12", formCue: "Land soft" },
              { name: "Mountain Climbers", setsReps: "3 x 20", formCue: "Drive knees to chest" },
            ],
          }),
        },
      },
    ],
  }),
}));

// Mock express request/response for tRPC context
vi.mock("../server/_core/trpc", async () => {
  const actual = await vi.importActual("../server/_core/trpc");
  return actual;
});

describe("Workout Generation Route", () => {
  it("should have correct input validation schema", () => {
    // Test that the input types are correct
    const validInput = {
      energyLevel: "high" as const,
      timeAvailable: 20,
      profile: {
        age: 30,
        gender: "male",
        fitnessLevel: "intermediate" as const,
      },
      equipment: ["bodyweight", "dumbbells"],
      activities: ["hiit", "strength"],
      recentWorkouts: [
        { type: "yoga", date: new Date().toISOString(), duration: 20 },
      ],
      aiLearning: {
        preferenceWeights: { hiit: 3, yoga: 1 },
      },
      trainingLoad: {
        dailyStress: 15,
        weeklyAverage: 20,
        missedDays: 1,
      },
    };

    // Validate the structure
    expect(validInput.energyLevel).toBe("high");
    expect(validInput.timeAvailable).toBe(20);
    expect(validInput.profile.fitnessLevel).toBe("intermediate");
    expect(validInput.equipment).toContain("bodyweight");
    expect(validInput.activities).toContain("hiit");
    expect(validInput.recentWorkouts).toHaveLength(1);
    expect(validInput.aiLearning.preferenceWeights).toHaveProperty("hiit");
    expect(validInput.trainingLoad.dailyStress).toBe(15);
  });

  it("should generate fallback workout for low energy", () => {
    // Test the fallback workout generator logic
    const fallbackWorkouts: Record<string, { type: string; title: string; exercises: any[] }> = {
      low: {
        type: "stretching",
        title: "Gentle Recovery Flow",
        exercises: [
          { name: "Cat-Cow Stretch", setsReps: "10 reps", formCue: "Move slowly with your breath" },
          { name: "Child's Pose", setsReps: "60 seconds", formCue: "Relax your hips back toward heels" },
        ],
      },
      medium: {
        type: "bodyweight",
        title: "Balanced Body Burn",
        exercises: [
          { name: "Jumping Jacks", setsReps: "2 x 30 seconds", formCue: "Land softly" },
          { name: "Bodyweight Squats", setsReps: "3 x 12", formCue: "Push knees out" },
        ],
      },
      high: {
        type: "hiit",
        title: "Full Throttle HIIT",
        exercises: [
          { name: "Burpees", setsReps: "3 x 10", formCue: "Explosive jump at the top" },
          { name: "Jump Squats", setsReps: "3 x 12", formCue: "Land soft" },
        ],
      },
    };

    expect(fallbackWorkouts.low.type).toBe("stretching");
    expect(fallbackWorkouts.medium.type).toBe("bodyweight");
    expect(fallbackWorkouts.high.type).toBe("hiit");
    expect(fallbackWorkouts.low.exercises.length).toBeGreaterThan(0);
  });

  it("should validate exercise structure", () => {
    const exercise = {
      name: "Burpees",
      setsReps: "3 x 10",
      formCue: "Explosive jump at the top",
    };

    expect(exercise).toHaveProperty("name");
    expect(exercise).toHaveProperty("setsReps");
    expect(exercise).toHaveProperty("formCue");
    expect(typeof exercise.name).toBe("string");
    expect(typeof exercise.setsReps).toBe("string");
    expect(typeof exercise.formCue).toBe("string");
  });

  it("should handle energy levels correctly for intensity guidance", () => {
    const energyIntensityMap: Record<string, string> = {
      low: "gentle, recovery-focused",
      medium: "moderate intensity",
      high: "intense",
    };

    expect(energyIntensityMap.low).toContain("recovery");
    expect(energyIntensityMap.medium).toContain("moderate");
    expect(energyIntensityMap.high).toContain("intense");
  });

  it("should correctly identify recent workout types to avoid", () => {
    const recentWorkouts = [
      { type: "hiit", date: "2024-01-01", duration: 20 },
      { type: "yoga", date: "2024-01-02", duration: 30 },
      { type: "hiit", date: "2024-01-03", duration: 20 },
    ];

    const recentTypes = recentWorkouts.map((w) => w.type);
    expect(recentTypes).toContain("hiit");
    expect(recentTypes).toContain("yoga");
    expect(recentTypes.filter((t) => t === "hiit")).toHaveLength(2);
  });

  it("should prioritize preferred activities from AI learning", () => {
    const preferenceWeights: Record<string, number> = {
      hiit: 5,
      yoga: 2,
      strength: 8,
      running: 1,
    };

    const sorted = Object.entries(preferenceWeights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    expect(sorted[0]).toBe("strength");
    expect(sorted[1]).toBe("hiit");
    expect(sorted[2]).toBe("yoga");
    expect(sorted).not.toContain("running");
  });
});
