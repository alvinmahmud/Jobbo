import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { Bookmark, Trash2 } from "@/components/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useJobs } from "@/providers/JobProvider";
import { JobCard } from "@/components/JobCard";
import { EmptyState } from "@/components/EmptyState";
import { Job } from "@/types";

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { savedJobs, toggleSaved, savedIds } = useJobs();

  const handleClearAll = useCallback(() => {
    if (savedIds.length === 0) return;
    Alert.alert(
      "Clear All Saved",
      "Are you sure you want to remove all saved jobs?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            savedIds.forEach((id) => toggleSaved(id));
            if (Platform.OS !== "web") {
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }
          },
        },
      ],
    );
  }, [savedIds, toggleSaved]);

  const renderItem = useCallback(({ item }: { item: Job }) => {
    return <JobCard job={item} />;
  }, []);

  const keyExtractor = useCallback((item: Job) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Saved Jobs</Text>
          <Text style={styles.subtitle}>
            {savedJobs.length} {savedJobs.length === 1 ? "job" : "jobs"} saved
          </Text>
        </View>
        {savedJobs.length > 0 && (
          <Pressable onPress={handleClearAll} style={styles.clearBtn}>
            <Trash2 size={16} color={Colors.dark.danger} />
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={savedJobs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          <EmptyState
            icon={<Bookmark size={32} color={Colors.dark.textMuted} />}
            title="No saved jobs yet"
            subtitle="Tap the bookmark icon on any job to save it for later"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          savedJobs.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontWeight: "500" as const,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  clearText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.danger,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 0,
  },
});
