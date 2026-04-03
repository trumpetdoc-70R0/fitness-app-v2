import { Text, View, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { EQUIPMENT_OPTIONS, type EquipmentId } from "@/lib/storage";
import { useApp } from "@/lib/app-context";

export default function EquipmentScreen() {
  const router = useRouter();
  const colors = useColors();
  const { updateEquipment } = useApp();

  const [selected, setSelected] = useState<Set<EquipmentId>>(new Set(["bodyweight"]));

  const toggleEquipment = (id: EquipmentId) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleNext = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await updateEquipment(Array.from(selected));
    router.push("/onboarding/preferences" as any);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.stepLabel, { color: colors.primary }]}>Step 2 of 3</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Your Equipment</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Select what you have available. We'll tailor workouts to your gear.
        </Text>

        <View style={styles.grid}>
          {EQUIPMENT_OPTIONS.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => toggleEquipment(item.id)}
                style={({ pressed }) => [
                  styles.equipmentCard,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.equipmentIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.equipmentLabel,
                    { color: isSelected ? "#FFFFFF" : colors.foreground },
                  ]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
          ]}
        >
          <Text style={styles.buttonText}>Next</Text>
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
    marginBottom: 28,
    lineHeight: 22,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  equipmentCard: {
    width: "47%",
    aspectRatio: 1.3,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  equipmentIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  equipmentLabel: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
