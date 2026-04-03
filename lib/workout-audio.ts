/**
 * Workout Audio Manager
 *
 * Manages preloading and playing audio cues during guided workouts.
 * Uses expo-audio's createAudioPlayer for manual lifecycle management.
 */
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

type AudioPlayer = ReturnType<typeof createAudioPlayer>;

// Sound asset imports
const SOUNDS = {
  tick: require("@/assets/sounds/tick.wav"),
  go: require("@/assets/sounds/go.wav"),
  workStart: require("@/assets/sounds/work-start.wav"),
  restStart: require("@/assets/sounds/rest-start.wav"),
  transition: require("@/assets/sounds/transition.wav"),
  complete: require("@/assets/sounds/complete.wav"),
  halfway: require("@/assets/sounds/halfway.wav"),
} as const;

type SoundName = keyof typeof SOUNDS;

class WorkoutAudioManager {
  private players: Map<SoundName, AudioPlayer> = new Map();
  private initialized = false;
  private _muted = false;
  private _voiceEnabled = true;

  get muted(): boolean {
    return this._muted;
  }

  set muted(value: boolean) {
    this._muted = value;
  }

  get voiceEnabled(): boolean {
    return this._voiceEnabled;
  }

  set voiceEnabled(value: boolean) {
    this._voiceEnabled = value;
  }

  /**
   * Initialize audio mode and preload all sounds.
   * Call this before starting a workout timer.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Enable playback in iOS silent mode
      await setAudioModeAsync({ playsInSilentMode: true });

      // Preload all sounds
      for (const [name, source] of Object.entries(SOUNDS)) {
        try {
          const player = createAudioPlayer(source);
          player.volume = 1.0;
          this.players.set(name as SoundName, player);
        } catch (err) {
          console.warn(`[WorkoutAudio] Failed to load sound "${name}":`, err);
        }
      }

      this.initialized = true;
    } catch (err) {
      console.warn("[WorkoutAudio] Failed to initialize audio:", err);
    }
  }

  /**
   * Play a named sound cue. No-op if muted or not initialized.
   */
  play(name: SoundName): void {
    if (this._muted || !this.initialized) return;
    if (Platform.OS === "web") return; // Skip audio on web preview

    const player = this.players.get(name);
    if (!player) return;

    try {
      // Reset to beginning and play
      player.seekTo(0);
      player.play();
    } catch (err) {
      console.warn(`[WorkoutAudio] Failed to play "${name}":`, err);
    }
  }

  /**
   * Play the countdown tick (3, 2, 1).
   */
  playTick(): void {
    this.play("tick");
  }

  /**
   * Play the "GO!" sound when work starts.
   */
  playGo(): void {
    this.play("go");
  }

  /**
   * Play the work-start ascending tone.
   */
  playWorkStart(): void {
    this.play("workStart");
  }

  /**
   * Play the rest-start descending tone.
   */
  playRestStart(): void {
    this.play("restStart");
  }

  /**
   * Play the transition sound between exercises.
   */
  playTransition(): void {
    this.play("transition");
  }

  /**
   * Play the workout completion fanfare.
   */
  playComplete(): void {
    this.play("complete");
  }

  /**
   * Play the halfway marker sound.
   */
  playHalfway(): void {
    this.play("halfway");
  }

  // ── Voice Announcements (TTS) ────────────────────────────────────────

  /**
   * Speak a phrase using text-to-speech. No-op if voice is disabled or on web.
   * Uses a slightly faster rate for a coach-like feel.
   */
  speak(text: string, options?: { rate?: number; delay?: number }): void {
    if (!this._voiceEnabled || Platform.OS === "web") return;

    const rate = options?.rate ?? 1.05;
    const delay = options?.delay ?? 0;

    const doSpeak = () => {
      try {
        Speech.speak(text, {
          rate,
          pitch: 1.0,
          language: "en-US",
          onError: (err) => console.warn("[WorkoutAudio] TTS error:", err),
        });
      } catch (err) {
        console.warn("[WorkoutAudio] TTS failed:", err);
      }
    };

    if (delay > 0) {
      setTimeout(doSpeak, delay);
    } else {
      doSpeak();
    }
  }

  /**
   * Stop any ongoing speech.
   */
  stopSpeech(): void {
    try {
      Speech.stop();
    } catch {
      // ignore
    }
  }

  /**
   * Announce the start of a work segment.
   * e.g. "Push-ups. Set 2 of 3."
   */
  announceWorkStart(exerciseName: string, setNumber: number, totalSets: number): void {
    if (totalSets > 1) {
      this.speak(`${exerciseName}. Set ${setNumber} of ${totalSets}.`, { delay: 300 });
    } else {
      this.speak(exerciseName, { delay: 300 });
    }
  }

  /**
   * Announce the start of a rest period.
   */
  announceRest(durationSeconds: number): void {
    this.speak(`Rest. ${durationSeconds} seconds.`, { delay: 200 });
  }

  /**
   * Announce the next exercise during a transition.
   */
  announceTransition(nextExerciseName: string): void {
    this.speak(`Get ready. Next up, ${nextExerciseName}.`, { delay: 300 });
  }

  /**
   * Announce workout start.
   */
  announceGo(firstExerciseName: string): void {
    this.speak(`Let's go! Starting with ${firstExerciseName}.`, { delay: 200 });
  }

  /**
   * Announce workout completion.
   */
  announceComplete(): void {
    this.speak("Workout complete. Great job!", { delay: 500 });
  }

  /**
   * Announce halfway point.
   */
  announceHalfway(): void {
    this.speak("Halfway there.");
  }

  /**
   * Release all audio players and stop speech. Call when workout timer unmounts.
   */
  release(): void {
    this.stopSpeech();
    for (const player of this.players.values()) {
      try {
        player.remove();
      } catch {
        // ignore cleanup errors
      }
    }
    this.players.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const workoutAudio = new WorkoutAudioManager();
