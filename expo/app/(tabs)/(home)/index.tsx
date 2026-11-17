import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Switch,
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
  const {
    jobs,
    filters,
    setFilters,
    activeFilterCount,
    profile,
    searchJobs,
    hasSearched,
    isSearching,
    isFetchingNextPage,
    searchError,
    hasNextPage,
    loadMore,
    refreshJobs,
    isDemo,
  } = useJobs();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const busy = isSearching || isFetchingNextPage;
  const canSubmit = query.trim().length > 0 && !busy;
  const showResults = isDemo || hasSearched;

  const submitSearch = useCallback(() => {
    if (!query.trim() || busy) return;
    searchInputRef.current?.blur();
    searchJobs(query.trim(), location.trim(), remoteOnly);
  }, [query, location, remoteOnly, busy, searchJobs]);

  const clearSearch = useCallback(() => {
    setQuery("");
    if (isDemo) setFilters({ ...filters, search: "" });
  }, [isDemo, filters, setFilters]);

  const onRefresh = useCallback(() => {
    if ((!showResults && !searchError) || busy) return;
    refreshJobs();
  }, [showResults, searchError, busy, refreshJobs]);

  const onLoadMore = useCallback(() => {
    if (isDemo || !hasNextPage || busy) return;
    loadMore();
  }, [isDemo, hasNextPage, busy, loadMore]);

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
      {isDemo && (
        <Text style={styles.subtitle}>
          Demo · Sample jobs, no live searches
        </Text>
      )}
      <View style={styles.searchRow}>
        <View
          style={[styles.searchBar, searchFocused && styles.searchBarFocused]}
        >
          <Search size={18} color={Colors.dark.textMuted} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Job title, company, skills"
            placeholderTextColor={Colors.dark.textMuted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            accessibilityLabel="Job keywords"
            testID="search-input"
          />
          {query.length > 0 && (
            <Pressable
              onPress={clearSearch}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear keyword draft"
            >
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
          accessibilityRole="button"
          accessibilityLabel={`Filters, ${activeFilterCount} active`}
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
      <TextInput
        style={styles.locationInput}
        placeholder="City, state (optional)"
        placeholderTextColor={Colors.dark.textMuted}
        value={location}
        onChangeText={setLocation}
        onSubmitEditing={submitSearch}
        returnKeyType="search"
        accessibilityLabel="US city or state, optional"

        testID="location-input"
      />
      <View style={styles.remoteRow}>
        <Text style={styles.remoteText}>Remote only</Text>
        <Switch
          value={remoteOnly}
          onValueChange={setRemoteOnly}
          trackColor={{ true: Colors.dark.tint, false: Colors.dark.border }}
          accessibilityLabel="Remote jobs only"
          accessibilityRole="switch"
          testID="remote-toggle"
        />
      </View>
      {isDemo && (
        <Text style={styles.note}>
          Demo searches filter sample jobs by keyword, city/state, and remote
          preference.
        </Text>
      )}
      <Pressable
        onPress={submitSearch}
        disabled={!canSubmit}
        style={[styles.actionButton, !canSubmit && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={isDemo ? "Search demo jobs" : "Search US jobs"}
        accessibilityState={{ disabled: !canSubmit, busy: isSearching }}
        testID="search-submit"
      >
        <Text style={styles.actionText}>Search</Text>
      </Pressable>

      {isSearching && (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <ActivityIndicator
            color={Colors.dark.tint}
            accessibilityLabel="Searching US jobs"
          />
          <Text style={styles.note}>Searching US jobs…</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={showResults ? jobs : []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !isSearching && !searchError ? (
            <EmptyState
              icon={<Search size={32} color={Colors.dark.textMuted} />}
              title={showResults ? "No jobs found" : "Search US jobs"}
              subtitle={
                !showResults
                  ? "Enter keywords and tap Search to find jobs in the United States."
                  : isDemo
                    ? "Try another keyword or adjust your demo filters."
                    : "Try different keywords, a broader location, or adjust filters on the loaded results."
              }
            />
          ) : null
        }
        ListFooterComponent={
          showResults && !isDemo && (hasNextPage || isFetchingNextPage) ? (
            <View style={styles.footer}>
              <Pressable
                onPress={onLoadMore}
                disabled={busy}
                style={[styles.secondaryButton, busy && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Load more jobs"
                accessibilityState={{
                  disabled: busy,
                  busy: isFetchingNextPage,
                }}
                testID="load-more"
              >
                {isFetchingNextPage && (
                  <ActivityIndicator
                    color={Colors.dark.tint}
                    accessibilityLabel="Loading more jobs"
                  />
                )}
                <Text style={styles.secondaryText}>
                  {isFetchingNextPage ? "Loading more…" : "Load more"}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isSearching}
            onRefresh={onRefresh}
            enabled={showResults && !busy}
            tintColor={Colors.dark.tint}
          />
        }
      />
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText} testID="job-count">
          {showResults ? jobs.length : 0} jobs found
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  listContent: { paddingBottom: 20 },
  headerContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  searchBar: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchBarFocused: { borderColor: Colors.dark.tint },
  searchInput: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 15,
    color: Colors.dark.text,
    height: 48,
  },
  locationInput: {
    minWidth: 0,
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
  },
  remoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginVertical: 12,
  },
  remoteText: { flexShrink: 1, fontSize: 15, color: Colors.dark.textSecondary },
  filterBtn: {
    width: 48,
    height: 48,
    flexShrink: 0,
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
    fontWeight: "700",
    color: Colors.dark.background,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Colors.dark.tint,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginVertical: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.dark.background,
  },
  disabled: { opacity: 0.5 },
  resultsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsText: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontWeight: "500",
    flexShrink: 1,
  },
  filterActiveText: {
    fontSize: 12,
    color: Colors.dark.tint,
    fontWeight: "600",
    flexShrink: 1,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.dark.textMuted,
    marginTop: 6,
  },
  status: { gap: 8, marginTop: 16 },

  secondaryButton: {
    minHeight: 48,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.tint,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryText: { fontSize: 14, fontWeight: "600", color: Colors.dark.tint },
  footer: { paddingHorizontal: 16, paddingBottom: 16 },
});
