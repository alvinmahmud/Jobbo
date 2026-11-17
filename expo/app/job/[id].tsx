import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Bookmark,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  TrendingUp,
  ExternalLink,
} from "@/components/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useJobById } from "@/providers/JobProvider";
import { useWebScreenTransition } from "@/components/useWebScreenTransition";

import {
  UNKNOWN,
  WORK_TYPE_LABELS,
  JOB_TYPE_LABELS,
  EXPERIENCE_LABELS,
  formatJobSalary,
  formatJobAge,
} from "@/utils/jobs";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { style: transitionStyle, dismiss } = useWebScreenTransition("x");
  const handleBack = useCallback(
    () => dismiss(() => router.back()),
    [dismiss, router],
  );
  const insets = useSafeAreaInsets();
  const { job, saved, toggle } = useJobById(id ?? "");
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  const handleApply = useCallback(() => {
    if (job?.sourceUrl && job.sourceUrl !== UNKNOWN) {
      void Linking.openURL(job.sourceUrl);
    }
  }, [job]);

  const handleBookmark = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Animated.sequence([
      Animated.timing(bookmarkScale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bookmarkScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    toggle();
  }, [toggle, bookmarkScale]);

  if (!job) {
    return (
      <Animated.View
        style={[styles.container, { paddingTop: insets.top }, transitionStyle]}
      >
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.dark.text} />
          </Pressable>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Job not found</Text>
        </View>
      </Animated.View>
    );
  }

  const sourceColor = Colors.sources[job.source] ?? Colors.dark.accent;
  const age = formatJobAge(job.postedAt);
  const canApply = !!job.sourceUrl && job.sourceUrl !== UNKNOWN;

  return (
    <Animated.View style={[styles.container, transitionStyle]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.dark.text} />
          </Pressable>
          <View style={styles.topBarRight}>
            <Pressable onPress={handleBookmark} style={styles.iconBtn}>
              <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                <Bookmark
                  size={22}
                  color={saved ? Colors.dark.tint : Colors.dark.textSecondary}
                  fill={saved ? Colors.dark.tint : "none"}
                />
              </Animated.View>
            </Pressable>
          </View>
        </View>

        <View style={styles.companySection}>
          {job.companyLogo === UNKNOWN ? (
            <View style={[styles.logo, styles.logoFallback]}>
              <Text style={styles.logoFallbackText}>{UNKNOWN}</Text>
            </View>
          ) : (
            <Image
              source={{ uri: job.companyLogo }}
              style={styles.logo}
              contentFit="cover"
            />
          )}
          <Text style={styles.company}>{job.company}</Text>
          <View
            style={[
              styles.sourceBadge,
              { backgroundColor: sourceColor + "22" },
            ]}
          >
            <View
              style={[styles.sourceDot, { backgroundColor: sourceColor }]}
            />
            <Text style={[styles.sourceText, { color: sourceColor }]}>
              {job.source === UNKNOWN ? UNKNOWN : `via ${job.source}`}
            </Text>
          </View>
        </View>

        <Text style={styles.jobTitle}>{job.title}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <View
              style={[
                styles.metaIcon,
                { backgroundColor: Colors.dark.tintLight },
              ]}
            >
              <MapPin size={16} color={Colors.dark.tint} />
            </View>
            <View>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>{job.location}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <View
              style={[
                styles.metaIcon,
                { backgroundColor: Colors.dark.accentLight },
              ]}
            >
              <DollarSign size={16} color={Colors.dark.accent} />
            </View>
            <View>
              <Text style={styles.metaLabel}>Salary</Text>
              <Text style={styles.metaValue}>{formatJobSalary(job, true)}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <View
              style={[
                styles.metaIcon,
                { backgroundColor: Colors.dark.warningLight },
              ]}
            >
              <Briefcase size={16} color={Colors.dark.warning} />
            </View>
            <View>
              <Text style={styles.metaLabel}>Type</Text>
              <Text style={styles.metaValue}>
                {job.jobType === UNKNOWN && job.workType === UNKNOWN
                  ? UNKNOWN
                  : `${JOB_TYPE_LABELS[job.jobType]} · ${WORK_TYPE_LABELS[job.workType]}`}
              </Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <View style={[styles.metaIcon, { backgroundColor: "#8B5CF622" }]}>
              <TrendingUp size={16} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.metaLabel}>Level</Text>
              <Text style={styles.metaValue}>
                {EXPERIENCE_LABELS[job.experienceLevel]}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.timeRow}>
          <Clock size={14} color={Colors.dark.textMuted} />
          <Text style={styles.timeText}>
            {age === UNKNOWN ? UNKNOWN : `Posted ${age}`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          {job.requirements.map((req, i) => (
            <View key={i} style={styles.reqRow}>
              <View style={styles.reqBullet} />
              <Text style={styles.reqText}>{req}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsWrap}>
            {job.skills.map((skill) => (
              <View key={skill} style={styles.skillPill}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <Pressable
          onPress={handleApply}
          disabled={!canApply}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canApply }}
          style={[styles.applyBtn, !canApply && styles.applyBtnDisabled]}
          testID="apply-button"
        >
          <ExternalLink size={18} color={Colors.dark.background} />
          <Text style={styles.applyBtnText}>
            {canApply ? `Apply on ${job.source}` : UNKNOWN}
          </Text>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  topBarRight: {
    flexDirection: "row",
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  companySection: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.dark.surfaceElevated,
    marginBottom: 12,
  },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: {
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  company: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 30,
  },
  metaGrid: {
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.dark.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  metaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    fontWeight: "500" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: "600" as const,
    marginTop: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  timeText: {
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    lineHeight: 24,
  },
  reqRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  reqBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.tint,
    marginTop: 7,
  },
  reqText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillPill: {
    backgroundColor: Colors.dark.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  skillText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: "500" as const,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
  applyBtnDisabled: {
    opacity: 0.5,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.background,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 16,
    color: Colors.dark.textMuted,
  },
});
