import { Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleGetStarted = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/onboarding/profile" as any);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.heroSection}>
          <Text style={[styles.emoji]}>🏋️</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            GoRep
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Stop planning. Start doing.
          </Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            Get a personalized workout in 3 taps.{"\n"}No browsing. No planning. Just action.
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },
  bottomSection: {
    paddingTop: 16,
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
