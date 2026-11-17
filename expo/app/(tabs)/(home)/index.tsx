import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, SlidersHorizontal, X } from "@/components/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useJobs } from "@/providers/JobProvider";
import { JobCard } from "@/components/JobCard";
import { EmptyState } from "@/components/EmptyState";
import { Job } from "@/types";
import { getWelcomeMessage } from "@/utils/profile";

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jobs, filters, setFilters, activeFilterCount, profile } = useJobs();
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setFilters({ ...filters, search: text });
    },
    [filters, setFilters],
  );

  const clearSearch = useCallback(() => {
    setFilters({ ...filters, search: "" });
    searchInputRef.current?.blur();
  }, [filters, setFilters]);

  const openFilters = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/filter");
  }, [router]);

  const renderItem = useCallback(({ item }: { item: Job }) => {
    return <JobCard job={item} />;
  }, []);

  const keyExtractor = useCallback((item: Job) => item.id, []);

  const ListHeader = (
    <View style={styles.headerContent}>
      <Text style={styles.title}>{getWelcomeMessage(profile.firstName)}</Text>
      <View style={styles.searchRow}>
        <View
          style={[styles.searchBar, searchFocused && styles.searchBarFocused]}
        >
          <Search size={18} color={Colors.dark.textMuted} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search jobs, companies, skills..."
            placeholderTextColor={Colors.dark.textMuted}
            value={filters.search}
            onChangeText={handleSearchChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            testID="search-input"
          />
          {filters.search.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={16} color={Colors.dark.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={openFilters}
          style={[
            styles.filterBtn,
            activeFilterCount > 0 && styles.filterBtnActive,
          ]}
          testID="filter-button"
        >
          <SlidersHorizontal
            size={20}
            color={
              activeFilterCount > 0
                ? Colors.dark.tint
                : Colors.dark.textSecondary
            }
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {jobs.length} {jobs.length === 1 ? "job" : "jobs"} found
        </Text>
        {activeFilterCount > 0 && (
          <Text style={styles.filterActiveText}>
            {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"}{" "}
            active
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={jobs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon={<Search size={32} color={Colors.dark.textMuted} />}
            title="No jobs found"
            subtitle="Try adjusting your search or filters to see more results"
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.tint}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  listContent: {
    paddingBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchBarFocused: {
    borderColor: Colors.dark.tint,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark.text,
    height: 48,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.dark.tintLight,
    borderColor: Colors.dark.tint,
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.dark.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.dark.background,
  },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsText: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontWeight: "500" as const,
  },
  filterActiveText: {
    fontSize: 12,
    color: Colors.dark.tint,
    fontWeight: "600" as const,
  },
});
