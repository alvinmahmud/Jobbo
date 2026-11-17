import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { X, RotateCcw, Check } from "@/components/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useJobs } from "@/providers/JobProvider";
import {
  Filters,
  DEFAULT_FILTERS,
  WorkType,
  JobType,
  ExperienceLevel,
} from "@/types";
import { JOB_SOURCES } from "@/mocks/jobs";
import { useWebScreenTransition } from "@/components/useWebScreenTransition";

const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: "entry", label: "Entry" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "executive", label: "Exec" },
];

const SALARY_PRESETS = [
  { min: 0, max: 300000, label: "Any" },
  { min: 50000, max: 100000, label: "$50k-$100k" },
  { min: 100000, max: 150000, label: "$100k-$150k" },
  { min: 150000, max: 200000, label: "$150k-$200k" },
  { min: 200000, max: 300000, label: "$200k+" },
];

export default function FilterScreen() {
  const router = useRouter();
  const { style: transitionStyle, dismiss } = useWebScreenTransition("y");
  const insets = useSafeAreaInsets();
  const { filters, setFilters } = useJobs();
  const [draft, setDraft] = useState<Filters>({ ...filters });

  const toggleArrayItem = useCallback(
    <T extends string>(arr: T[], item: T): T[] => {
      return arr.includes(item)
        ? arr.filter((i) => i !== item)
        : [...arr, item];
    },
    [],
  );

  const handleApply = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    dismiss(() => {
      setFilters({ ...draft });
      router.back();
    });
  }, [draft, setFilters, router, dismiss]);

  const handleReset = useCallback(() => {
    setDraft({ ...DEFAULT_FILTERS, search: filters.search });
  }, [filters.search]);

  const handleClose = useCallback(() => {
    dismiss(() => router.back());
  }, [router, dismiss]);

  const isSalarySelected = (min: number, max: number) =>
    draft.salaryMin === min && draft.salaryMax === max;

  return (
    <Animated.View
      style={[styles.container, { paddingTop: insets.top }, transitionStyle]}
    >
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.closeBtn}>
          <X size={20} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.title}>Filters</Text>
        <Pressable onPress={handleReset} style={styles.resetBtn}>
          <RotateCcw size={14} color={Colors.dark.tint} />
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Type</Text>
          <View style={styles.pillRow}>
            {WORK_TYPE_OPTIONS.map((opt) => {
              const active = draft.workTypes.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    setDraft((p) => ({
                      ...p,
                      workTypes: toggleArrayItem(p.workTypes, opt.value),
                    }))
                  }
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text
                    style={[styles.pillText, active && styles.pillTextActive]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Type</Text>
          <View style={styles.pillRow}>
            {JOB_TYPE_OPTIONS.map((opt) => {
              const active = draft.jobTypes.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    setDraft((p) => ({
                      ...p,
                      jobTypes: toggleArrayItem(p.jobTypes, opt.value),
                    }))
                  }
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text
                    style={[styles.pillText, active && styles.pillTextActive]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience Level</Text>
          <View style={styles.pillRow}>
            {EXPERIENCE_OPTIONS.map((opt) => {
              const active = draft.experienceLevels.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    setDraft((p) => ({
                      ...p,
                      experienceLevels: toggleArrayItem(
                        p.experienceLevels,
                        opt.value,
                      ),
                    }))
                  }
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text
                    style={[styles.pillText, active && styles.pillTextActive]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salary Range</Text>
          <View style={styles.pillRow}>
            {SALARY_PRESETS.map((preset) => {
              const active = isSalarySelected(preset.min, preset.max);
              return (
                <Pressable
                  key={preset.label}
                  onPress={() =>
                    setDraft((p) => ({
                      ...p,
                      salaryMin: preset.min,
                      salaryMax: preset.max,
                    }))
                  }
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text
                    style={[styles.pillText, active && styles.pillTextActive]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Source</Text>
          <View style={styles.pillRow}>
            {JOB_SOURCES.map((source) => {
              const active = draft.sources.includes(source);
              const color = Colors.sources[source] ?? Colors.dark.accent;
              return (
                <Pressable
                  key={source}
                  onPress={() =>
                    setDraft((p) => ({
                      ...p,
                      sources: toggleArrayItem(p.sources, source),
                    }))
                  }
                  style={[
                    styles.pill,
                    active && {
                      backgroundColor: color + "22",
                      borderColor: color,
                    },
                  ]}
                >
                  {active && (
                    <View
                      style={[
                        styles.sourceIndicator,
                        { backgroundColor: color },
                      ]}
                    />
                  )}
                  <Text style={[styles.pillText, active && { color }]}>
                    {source}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <Pressable onPress={handleApply} style={styles.applyBtn}>
          <Check size={18} color={Colors.dark.background} />
          <Text style={styles.applyBtnText}>Apply Filters</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.dark.tintLight,
  },
  resetText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.tint,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 12,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  pillActive: {
    backgroundColor: Colors.dark.tintLight,
    borderColor: Colors.dark.tint,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.dark.textSecondary,
  },
  pillTextActive: {
    color: Colors.dark.tint,
    fontWeight: "600" as const,
  },
  sourceIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bottomBar: {
    backgroundColor: Colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dark.tint,
    paddingVertical: 16,
    borderRadius: 14,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.background,
  },
});
