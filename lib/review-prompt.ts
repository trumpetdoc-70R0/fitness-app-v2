import { Platform } from "react-native";
import {
  incrementCompletedWorkoutCount,
  hasBeenPromptedForReview,
  setReviewPrompted,
} from "@/lib/storage";

const REVIEW_THRESHOLD = 5;

/**
 * Call this after a workout is completed.
 * Increments the completed count and triggers the native review prompt
 * once the user has completed 5 workouts (and hasn't been prompted before).
 */
export async function checkAndPromptReview(): Promise<void> {
  if (Platform.OS === "web") return;

  const alreadyPrompted = await hasBeenPromptedForReview();
  if (alreadyPrompted) return;

  const count = await incrementCompletedWorkoutCount();
  if (count >= REVIEW_THRESHOLD) {
    try {
      const StoreReview = await import("expo-store-review");
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
        await setReviewPrompted();
      }
    } catch (e) {
      console.log("StoreReview error:", e);
    }
  }
}
