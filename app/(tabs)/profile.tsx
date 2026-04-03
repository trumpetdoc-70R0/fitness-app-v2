import {
  Text,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { useState, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useApp } from "@/lib/app-context";
import {
  EQUIPMENT_OPTIONS,
  ACTIVITY_OPTIONS,
  REST_TIME_OPTIONS,
  DEFAULT_REST_BETWEEN_SETS,
  DEFAULT_REST_BETWEEN_EXERCISES,
  getRestBetweenSets,
  saveRestBetweenSets,
  getRestBetweenExercises,
  saveRestBetweenExercises,
  type EquipmentId,
  type ActivityId,
  type FitnessLevel,
} from "@/lib/storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AdBanner } from "@/components/ad-banner";
import { useAds } from "@/lib/ad-context";
import { purchaseRemoveAds, restorePurchases } from "@/lib/iap";
import { useThemeContext } from "@/lib/theme-provider";
import type { ThemePreference } from "@/lib/storage";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "system", label: "System", icon: "settings-brightness" },
  { value: "light", label: "Light", icon: "light-mode" },
  { value: "dark", label: "Dark", icon: "dark-mode" },
];

const FITNESS_LEVELS: { value: FitnessLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { state, updateProfile, updateEquipment, updateActivities } = useApp();
  const { isAdFree, setAdFree, showAds } = useAds();
  const { themePreference, setThemePreference } = useThemeContext();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restBetweenSets, setRestBetweenSets] = useState(DEFAULT_REST_BETWEEN_SETS);
  const [restBetweenExercises, setRestBetweenExercises] = useState(DEFAULT_REST_BETWEEN_EXERCISES);


  // Local edit states
  const [editEquipment, setEditEquipment] = useState<Set<EquipmentId>>(new Set());
  const [editActivities, setEditActivities] = useState<Set<ActivityId>>(new Set());
  const [editFitnessLevel, setEditFitnessLevel] = useState<FitnessLevel>("beginner");

  useEffect(() => {
    setEditEquipment(new Set(state.equipment));
    setEditActivities(new Set(state.activities));
    if (state.profile) {
      setEditFitnessLevel(state.profile.fitnessLevel);
    }
  }, [state.equipment, state.activities, state.profile]);

  // Load rest time preferences
  useEffect(() => {
    (async () => {
      const sets = await getRestBetweenSets();
      const exercises = await getRestBetweenExercises();
      setRestBetweenSets(sets);
      setRestBetweenExercises(exercises);
    })();
  }, []);

  const handleRestBetweenSetsChange = async (value: number) => {
    setRestBetweenSets(value);
    await saveRestBetweenSets(value);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRestBetweenExercisesChange = async (value: number) => {
    setRestBetweenExercises(value);
    await saveRestBetweenExercises(value);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSaveEquipment = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await updateEquipment(Array.from(editEquipment));
    setEditingSection(null);
  };

  const handleSaveActivities = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await updateActivities(Array.from(editActivities));
    setEditingSection(null);
  };

  const handleSaveFitnessLevel = async () => {
    if (state.profile) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await updateProfile({ ...state.profile, fitnessLevel: editFitnessLevel });
      setEditingSection(null);
    }
  };



  if (!state.profile) return null;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>

        </View>

        {/* Appearance Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Appearance</Text>
          </View>
          <View style={styles.themeToggleRow}>
            {THEME_OPTIONS.map((option) => {
              const isSelected = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setThemePreference(option.value);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.themeOption,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialIcons
                    name={option.icon as any}
                    size={20}
                    color={isSelected ? "#FFFFFF" : colors.muted}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: isSelected ? "#FFFFFF" : colors.foreground },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Rest Time Settings Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Rest Timers</Text>
            <MaterialIcons name="timer" size={20} color={colors.muted} />
          </View>

          <Text style={[styles.restLabel, { color: colors.foreground }]}>Between Sets</Text>
          <Text style={[styles.restDescription, { color: colors.muted }]}>
            Rest time between sets of the same exercise
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.restOptionsScroll}>
            <View style={styles.restOptionsRow}>
              {REST_TIME_OPTIONS.map((seconds) => {
                const isSelected = restBetweenSets === seconds;
                return (
                  <Pressable
                    key={`sets-${seconds}`}
                    onPress={() => handleRestBetweenSetsChange(seconds)}
                    style={({ pressed }) => [
                      styles.restOption,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.background,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.restOptionText,
                        { color: isSelected ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {seconds}s
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.restDivider, { backgroundColor: colors.border }]} />

          <Text style={[styles.restLabel, { color: colors.foreground }]}>Between Exercises</Text>
          <Text style={[styles.restDescription, { color: colors.muted }]}>
            Transition time between different exercises
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.restOptionsScroll}>
            <View style={styles.restOptionsRow}>
              {REST_TIME_OPTIONS.map((seconds) => {
                const isSelected = restBetweenExercises === seconds;
                return (
                  <Pressable
                    key={`exercises-${seconds}`}
                    onPress={() => handleRestBetweenExercisesChange(seconds)}
                    style={({ pressed }) => [
                      styles.restOption,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.background,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.restOptionText,
                        { color: isSelected ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {seconds}s
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* User Info Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>About You</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Age</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{state.profile.age}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Gender</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {state.profile.gender.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
          </View>
        </View>

        {/* Fitness Level Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Fitness Level</Text>
            <Pressable
              onPress={() => setEditingSection(editingSection === "fitness" ? null : "fitness")}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.editButton, { color: colors.primary }]}>
                {editingSection === "fitness" ? "Cancel" : "Edit"}
              </Text>
            </Pressable>
          </View>
          {editingSection === "fitness" ? (
            <View style={styles.editSection}>
              {FITNESS_LEVELS.map((level) => (
                <Pressable
                  key={level.value}
                  onPress={() => {
                    setEditFitnessLevel(level.value);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.editChip,
                    {
                      backgroundColor: editFitnessLevel === level.value ? colors.primary : colors.background,
                      borderColor: editFitnessLevel === level.value ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.editChipText,
                      { color: editFitnessLevel === level.value ? "#FFFFFF" : colors.foreground },
                    ]}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={handleSaveFitnessLevel}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.currentValue, { color: colors.foreground }]}>
              {state.profile.fitnessLevel.charAt(0).toUpperCase() + state.profile.fitnessLevel.slice(1)}
            </Text>
          )}
        </View>

        {/* Equipment Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Equipment</Text>
            <Pressable
              onPress={() => setEditingSection(editingSection === "equipment" ? null : "equipment")}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.editButton, { color: colors.primary }]}>
                {editingSection === "equipment" ? "Cancel" : "Edit"}
              </Text>
            </Pressable>
          </View>
          {editingSection === "equipment" ? (
            <View style={styles.editSection}>
              <View style={styles.chipGrid}>
                {EQUIPMENT_OPTIONS.map((item) => {
                  const isSelected = editEquipment.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setEditEquipment((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                        if (Platform.OS !== "web") {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.editChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.editChipText,
                          { color: isSelected ? "#FFFFFF" : colors.foreground },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={handleSaveEquipment}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.chipGrid}>
              {state.equipment.map((id) => {
                const item = EQUIPMENT_OPTIONS.find((e) => e.id === id);
                return item ? (
                  <View
                    key={id}
                    style={[styles.displayChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <Text style={[styles.displayChipText, { color: colors.foreground }]}>
                      {item.label}
                    </Text>
                  </View>
                ) : null;
              })}
              {state.equipment.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.muted }]}>No equipment selected</Text>
              )}
            </View>
          )}
        </View>

        {/* Activities Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Preferred Activities</Text>
            <Pressable
              onPress={() => setEditingSection(editingSection === "activities" ? null : "activities")}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.editButton, { color: colors.primary }]}>
                {editingSection === "activities" ? "Cancel" : "Edit"}
              </Text>
            </Pressable>
          </View>
          {editingSection === "activities" ? (
            <View style={styles.editSection}>
              <View style={styles.chipGrid}>
                {ACTIVITY_OPTIONS.map((item) => {
                  const isSelected = editActivities.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setEditActivities((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                        if (Platform.OS !== "web") {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.editChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.editChipText,
                          { color: isSelected ? "#FFFFFF" : colors.foreground },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={handleSaveActivities}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.chipGrid}>
              {state.activities.map((id) => {
                const item = ACTIVITY_OPTIONS.find((a) => a.id === id);
                return item ? (
                  <View
                    key={id}
                    style={[styles.displayChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <Text style={[styles.displayChipText, { color: colors.foreground }]}>
                      {item.label}
                    </Text>
                  </View>
                ) : null;
              })}
              {state.activities.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.muted }]}>No activities selected</Text>
              )}
            </View>
          )}
        </View>


        {/* Remove Ads Card */}
        {!isAdFree && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Remove Ads</Text>
            </View>
            <Text style={[styles.removeAdsDescription, { color: colors.muted }]}>
              Enjoy GoRep without ads for a one-time purchase of $9.99
            </Text>
            <Pressable
              onPress={async () => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                setPurchasing(true);
                try {
                  const result = await purchaseRemoveAds();
                  if (result.success) {
                    await setAdFree(true);
                    if (Platform.OS !== "web") {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                  }
                } catch (e) {
                  console.log("Purchase error:", e);
                } finally {
                  setPurchasing(false);
                }
              }}
              disabled={purchasing}
              style={({ pressed }) => [
                styles.purchaseButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                purchasing && { opacity: 0.6 },
              ]}
            >
              <MaterialIcons name="block" size={20} color="#FFFFFF" />
              <Text style={styles.purchaseButtonText}>
                {purchasing ? "Processing..." : "Remove Ads — $9.99"}
              </Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                setRestoring(true);
                try {
                  const restored = await restorePurchases();
                  if (restored) {
                    await setAdFree(true);
                    if (Platform.OS !== "web") {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                  }
                } catch (e) {
                  console.log("Restore error:", e);
                } finally {
                  setRestoring(false);
                }
              }}
              disabled={restoring}
              style={({ pressed }) => [
                styles.restoreButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
                {restoring ? "Restoring..." : "Restore Purchase"}
              </Text>
            </Pressable>
          </View>
        )}

        {isAdFree && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="check-circle" size={22} color={colors.success} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Ad-Free</Text>
            </View>
            <Text style={[styles.removeAdsDescription, { color: colors.muted, marginTop: 4 }]}>
              You're enjoying GoRep without ads. Thank you for your support!
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
      <AdBanner style={{ marginBottom: 4 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  editButton: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: 0.5,
  },
  currentValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  editSection: {
    gap: 12,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  editChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  editChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  displayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  displayChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 14,
  },
  saveButton: {
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  removeAdsDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  purchaseButton: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  purchaseButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 20,
  },
  themeToggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  restLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  restDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  restOptionsScroll: {
    marginBottom: 4,
  },
  restOptionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  restOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 52,
    alignItems: "center",
  },
  restOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  restDivider: {
    height: 0.5,
    marginVertical: 14,
  },
});
