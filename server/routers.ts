import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  workout: router({
    generate: publicProcedure
      .input(
        z.object({
          energyLevel: z.enum(["low", "medium", "high"]),
          timeAvailable: z.number().int().min(10).max(30),
          profile: z.object({
            age: z.number(),
            gender: z.string(),
            fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]),
          }),
          equipment: z.array(z.string()),
          activities: z.array(z.string()),
          recentWorkouts: z.array(
            z.object({
              type: z.string(),
              date: z.string(),
              duration: z.number(),
            })
          ),
          aiLearning: z.object({
            preferenceWeights: z.record(z.string(), z.number()),
          }),
          trainingLoad: z.object({
            dailyStress: z.number(),
            weeklyAverage: z.number(),
            missedDays: z.number(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const {
          energyLevel,
          timeAvailable,
          profile,
          equipment,
          activities,
          recentWorkouts,
          aiLearning,
          trainingLoad,
        } = input;

        // Build the prompt for the LLM
        const recentTypes = recentWorkouts.map((w) => w.type);
        const avoidTypes = recentTypes.length > 0
          ? `AVOID these workout types (done recently): ${recentTypes.join(", ")}.`
          : "";

        const preferredActivities = Object.entries(aiLearning.preferenceWeights)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([type]) => type);

        const preferenceHint = preferredActivities.length > 0
          ? `User tends to prefer: ${preferredActivities.join(", ")}.`
          : "";

        let intensityGuidance = "";
        if (trainingLoad.weeklyAverage > 25) {
          intensityGuidance = "User has been training hard this week. Consider a lighter session.";
        }
        if (trainingLoad.missedDays >= 3) {
          intensityGuidance = "User has missed several days. Ease them back in gently.";
        }

        const systemPrompt = `You are a fitness coach AI. Generate a single workout plan as JSON.

RULES:
- Keep instructions extremely simple, clear, and short
- Each exercise description should be ONE short sentence for form cue
- Match the workout to the user's energy level, time, fitness level, and available equipment
- For "low" energy: gentle, recovery-focused (yoga, stretching, easy walk)
- For "medium" energy: moderate intensity (light strength, moderate cardio)
- For "high" energy: intense (HIIT, heavy strength, sprints)
- Duration must fit within ${timeAvailable} minutes
- Only use equipment the user has
${avoidTypes}
${preferenceHint}
${intensityGuidance}

Return ONLY valid JSON with this exact structure:
{
  "type": "string (workout category like 'yoga', 'hiit', 'strength', 'cardio', 'stretching', 'core', 'bodyweight')",
  "title": "string (catchy short workout name, 3-5 words)",
  "exercises": [
    {
      "name": "string (exercise name)",
      "setsReps": "string (e.g. '3 x 10' or '30 seconds' or '2 minutes')",
      "formCue": "string (one short sentence about form)",
      "durationSeconds": "number (seconds per set, e.g. 40 for timed exercises, or estimate 3-5 sec per rep for rep-based)",
      "sets": "number (number of sets, e.g. 3)",
      "restSeconds": "number (rest between sets in seconds, 10-30 depending on intensity)"
    }
  ]
}

TIMING RULES:
- The total of all (durationSeconds * sets) + rest times MUST fit within ${timeAvailable} minutes
- For timed exercises (e.g. plank, wall sit): durationSeconds = the hold time
- For rep-based exercises: estimate ~4 seconds per rep (e.g. 10 reps = 40 seconds)
- Include 15-30 second rest between sets (shorter for low intensity, longer for high)
- Include 4-8 exercises depending on time available. No warm-up or cool-down unless it IS the workout type.`;

        const userMessage = `Generate a ${timeAvailable}-minute workout for:
- Age: ${profile.age}, Gender: ${profile.gender}
- Fitness Level: ${profile.fitnessLevel}
- Energy Level: ${energyLevel}
- Available Equipment: ${equipment.join(", ") || "bodyweight only"}
- Preferred Activities: ${activities.join(", ") || "any"}`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            response_format: { type: "json_object" },
          });

          const content = response.choices[0]?.message?.content;
          if (!content || typeof content !== "string") {
            throw new Error("No content in LLM response");
          }

          const parsed = JSON.parse(content);

          // Validate the response structure
          const result = {
            type: String(parsed.type || "general"),
            title: String(parsed.title || "Quick Workout"),
            exercises: Array.isArray(parsed.exercises)
              ? parsed.exercises.map((e: any) => ({
                  name: String(e.name || "Exercise"),
                  setsReps: String(e.setsReps || e.sets_reps || "1 set"),
                  formCue: String(e.formCue || e.form_cue || "Focus on form"),
                  durationSeconds: Number(e.durationSeconds || e.duration_seconds || 40),
                  sets: Number(e.sets || 1),
                  restSeconds: Number(e.restSeconds || e.rest_seconds || 15),
                }))
              : [],
          };

          return result;
        } catch (error) {
          console.error("LLM workout generation failed:", error);
          // Fallback workout
          return generateFallbackWorkout(energyLevel, timeAvailable, equipment, profile.fitnessLevel);
        }
      }),
  }),
});

function generateFallbackWorkout(
  energy: string,
  duration: number,
  equipment: string[],
  level: string
) {
  const workouts: Record<string, any> = {
    low: {
      type: "stretching",
      title: "Gentle Recovery Flow",
      exercises: [
        { name: "Cat-Cow Stretch", setsReps: "10 reps", formCue: "Move slowly with your breath", durationSeconds: 40, sets: 1, restSeconds: 10 },
        { name: "Child's Pose", setsReps: "60 seconds", formCue: "Relax your hips back toward heels", durationSeconds: 60, sets: 1, restSeconds: 10 },
        { name: "Standing Forward Fold", setsReps: "45 seconds", formCue: "Bend knees slightly, let head hang", durationSeconds: 45, sets: 1, restSeconds: 10 },
        { name: "Seated Spinal Twist", setsReps: "30 sec each side", formCue: "Sit tall, twist from your mid-back", durationSeconds: 30, sets: 2, restSeconds: 10 },
        { name: "Supine Figure Four", setsReps: "45 sec each side", formCue: "Keep lower back on the floor", durationSeconds: 45, sets: 2, restSeconds: 10 },
      ],
    },
    medium: {
      type: "bodyweight",
      title: "Balanced Body Burn",
      exercises: [
        { name: "Jumping Jacks", setsReps: "2 x 30 seconds", formCue: "Land softly on the balls of your feet", durationSeconds: 30, sets: 2, restSeconds: 15 },
        { name: "Bodyweight Squats", setsReps: "3 x 12", formCue: "Push knees out, chest up", durationSeconds: 45, sets: 3, restSeconds: 20 },
        { name: "Push-ups", setsReps: "3 x 8", formCue: "Keep body in a straight line", durationSeconds: 35, sets: 3, restSeconds: 20 },
        { name: "Reverse Lunges", setsReps: "3 x 10 each leg", formCue: "Step back, lower knee toward floor", durationSeconds: 40, sets: 3, restSeconds: 20 },
        { name: "Plank Hold", setsReps: "3 x 30 seconds", formCue: "Squeeze glutes, don't let hips sag", durationSeconds: 30, sets: 3, restSeconds: 15 },
        { name: "Mountain Climbers", setsReps: "2 x 20", formCue: "Drive knees to chest quickly", durationSeconds: 30, sets: 2, restSeconds: 15 },
      ],
    },
    high: {
      type: "hiit",
      title: "Full Throttle HIIT",
      exercises: [
        { name: "Burpees", setsReps: "3 x 10", formCue: "Explosive jump at the top", durationSeconds: 40, sets: 3, restSeconds: 20 },
        { name: "Jump Squats", setsReps: "3 x 12", formCue: "Land soft, immediately drop into next squat", durationSeconds: 45, sets: 3, restSeconds: 20 },
        { name: "Push-up to Shoulder Tap", setsReps: "3 x 8", formCue: "Minimize hip rotation on the tap", durationSeconds: 35, sets: 3, restSeconds: 20 },
        { name: "High Knees", setsReps: "3 x 30 seconds", formCue: "Drive knees above hip height", durationSeconds: 30, sets: 3, restSeconds: 15 },
        { name: "Tuck Jumps", setsReps: "3 x 8", formCue: "Pull knees to chest at peak", durationSeconds: 30, sets: 3, restSeconds: 25 },
        { name: "Plank Jacks", setsReps: "3 x 15", formCue: "Keep core tight, jump feet in and out", durationSeconds: 35, sets: 3, restSeconds: 15 },
      ],
    },
  };

  return workouts[energy] || workouts.medium;
}

export type AppRouter = typeof appRouter;
