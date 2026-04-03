import { Text, View, Pressable, TextInput, ScrollView, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import type { Gender, FitnessLevel } from "@/lib/storage";
import { useApp } from "@/lib/app-context";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const FITNESS_LEVELS: { value: FitnessLevel; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "New to exercise or returning after a long break" },
  { value: "intermediate", label: "Intermediate", desc: "Exercise regularly, comfortable with most movements" },
  { value: "advanced", label: "Advanced", desc: "Experienced athlete, ready for intense workouts" },
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const { updateProfile } = useApp();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(null);

  const isValid = age.length > 0 && parseInt(age) > 0 && parseInt(age) < 120 && gender && fitnessLevel;

  const handleNext = async () => {
    if (!isValid || !gender || !fitnessLevel) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await updateProfile({
      age: parseInt(age),
      gender,
      fitnessLevel,
      onboardingComplete: false,
      createdAt: new Date().toISOString(),
    });
    router.push("/onboarding/equipment" as any);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.stepLabel, { color: colors.primary }]}>Step 1 of 3</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>About You</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Help us personalize your workouts
        </Text>

        {/* Age Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Age</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.foreground,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            value={age}
            onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ""))}
            placeholder="Enter your age"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={3}
            returnKeyType="done"
          />
        </View>

        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Gender</Text>
          <View style={styles.optionGrid}>
            {GENDER_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setGender(option.value);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={({ pressed }) => [
                  styles.optionChip,
                  {
                    backgroundColor: gender === option.value ? colors.primary : colors.surface,
                    borderColor: gender === option.value ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    { color: gender === option.value ? "#FFFFFF" : colors.foreground },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Fitness Level Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fitness Level</Text>
          {FITNESS_LEVELS.map((level) => (
            <Pressable
              key={level.value}
              onPress={() => {
                setFitnessLevel(level.value);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={({ pressed }) => [
                styles.levelCard,
                {
                  backgroundColor: fitnessLevel === level.value ? colors.primary : colors.surface,
                  borderColor: fitnessLevel === level.value ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[
                  styles.levelLabel,
                  { color: fitnessLevel === level.value ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {level.label}
              </Text>
              <Text
                style={[
                  styles.levelDesc,
                  { color: fitnessLevel === level.value ? "rgba(255,255,255,0.8)" : colors.muted },
                ]}
              >
                {level.desc}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleNext}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: isValid ? colors.primary : colors.border },
            pressed && isValid && { transform: [{ scale: 0.97 }], opacity: 0.9 },
          ]}
        >
          <Text style={[styles.buttonText, { opacity: isValid ? 1 : 0.5 }]}>Next</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  textInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 17,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  levelCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  levelLabel: {
    fontSize: 17,
    fontWeight: "700",
  },
  levelDesc: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 0.5,
  },
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
