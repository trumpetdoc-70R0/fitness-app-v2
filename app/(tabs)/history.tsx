import { Text, View, Pressable, FlatList, StyleSheet, Platform } from "react-native";
import { useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AdBanner } from "@/components/ad-banner";

const TYPE_COLORS: Record<string, string> = {
  yoga: "#9B59B6",
  hiit: "#E74C3C",
  strength: "#3498DB",
  cardio: "#E67E22",
  stretching: "#1ABC9C",
  core: "#F39C12",
  bodyweight: "#2ECC71",
  general: "#95A5A6",
  walking: "#27AE60",
  cycling: "#2980B9",
  running: "#E74C3C",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function HistoryScreen() {
  const colors = useColors();
  const { state, refreshStats } = useApp();

  useEffect(() => {
    refreshStats();
  }, []);

  const completedWorkouts = state.workouts.filter((w) => w.completed);

  const renderWorkoutItem = ({ item }: { item: typeof completedWorkouts[0] }) => {
    const typeColor = TYPE_COLORS[item.type.toLowerCase()] || TYPE_COLORS.general;
    return (
      <View style={[styles.workoutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.typeIndicator, { backgroundColor: typeColor }]} />
        <View style={styles.workoutInfo}>
          <Text style={[styles.workoutTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.workoutMeta}>
            <Text style={[styles.workoutType, { color: typeColor }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
            <Text style={[styles.workoutDot, { color: colors.muted }]}> · </Text>
            <Text style={[styles.workoutDuration, { color: colors.muted }]}>
              {item.duration} min
            </Text>
          </View>
        </View>
        <Text style={[styles.workoutDate, { color: colors.muted }]}>
          {formatDate(item.date)}
        </Text>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
        </View>

        {/* Weekly Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {state.weeklyStats.streak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Day Streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {state.weeklyStats.totalWorkouts}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>This Week</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {state.weeklyStats.totalMinutes}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Minutes</Text>
            </View>
          </View>
        </View>

        {/* Workout List */}
        {completedWorkouts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="fitness-center" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No workouts yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Complete your first workout to see it here
            </Text>
          </View>
        ) : (
          <FlatList
            data={completedWorkouts}
            keyExtractor={(item) => item.id}
            renderItem={renderWorkoutItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>
                Completed Workouts
              </Text>
            }
          />
        )}
      </View>
      <AdBanner style={{ marginBottom: 4 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statsCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  workoutCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  typeIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  workoutMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  workoutType: {
    fontSize: 13,
    fontWeight: "600",
  },
  workoutDot: {
    fontSize: 13,
  },
  workoutDuration: {
    fontSize: 13,
  },
  workoutDate: {
    fontSize: 13,
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
  },
});
