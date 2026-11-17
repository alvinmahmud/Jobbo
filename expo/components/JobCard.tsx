import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bookmark, MapPin, Clock, Briefcase } from "@/components/icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { Job } from "@/types";
import { useJobs } from "@/providers/JobProvider";
import { UNKNOWN, getJobDisplay } from "@/utils/jobs";

interface JobCardProps {
  job: Job;
}

function JobCardInner({ job }: JobCardProps) {
  const router = useRouter();
  const { isSaved, toggleSaved } = useJobs();
  const saved = isSaved(job.id);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  const display = getJobDisplay(job);
  const sourceColor = Colors.sources[job.source] ?? Colors.dark.accent;
  const hasTags = !!display.salary || !!display.workType || job.isNew;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    router.push(`/job/${job.id}`);
  }, [job.id, router, scaleAnim]);

  const handleBookmark = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    toggleSaved(job.id);
  }, [job.id, toggleSaved, bookmarkScale]);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPress={handlePress} style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <View style={styles.companyRow}>
            {job.companyLogo === UNKNOWN ? (
              <View style={[styles.companyLogo, styles.logoFallback]}>
                <Briefcase size={22} color={Colors.dark.textMuted} />
              </View>
            ) : (
              <Image
                source={{ uri: job.companyLogo }}
                style={styles.companyLogo}
                contentFit="cover"
              />
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName} numberOfLines={1}>
                {display.company}
              </Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color={Colors.dark.textMuted} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {display.location}
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={handleBookmark}
            hitSlop={12}
            style={styles.bookmarkBtn}
            testID={`bookmark-${job.id}`}
          >
            <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
              <Bookmark
                size={20}
                color={saved ? Colors.dark.tint : Colors.dark.textMuted}
                fill={saved ? Colors.dark.tint : "none"}
              />
            </Animated.View>
          </Pressable>
        </View>

        <Text style={styles.jobTitle} numberOfLines={2}>
          {display.title}
        </Text>

        {hasTags && (
          <View style={styles.tagsRow}>
            {display.salary && (
              <View
                style={[styles.tag, { backgroundColor: Colors.dark.tintLight }]}
              >
                <Text style={[styles.tagText, { color: Colors.dark.tint }]}>
                  {display.salary}
                </Text>
              </View>
            )}
            {display.workType && (
              <View
                style={[
                  styles.tag,
                  { backgroundColor: Colors.dark.accentLight },
                ]}
              >
                <Text style={[styles.tagText, { color: Colors.dark.accent }]}>
                  {display.workType}
                </Text>
              </View>
            )}
            {job.isNew && (
              <View
                style={[
                  styles.tag,
                  { backgroundColor: Colors.dark.warningLight },
                ]}
              >
                <Text style={[styles.tagText, { color: Colors.dark.warning }]}>
                  New
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          {display.source && (
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
                {display.source}
              </Text>
            </View>
          )}
          <View style={styles.timeRow}>
            <Clock size={12} color={Colors.dark.textMuted} />
            <Text style={styles.timeText}>{display.cardDate}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const JobCard = React.memo(JobCardInner);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
  },
  cardInner: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  companyLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.dark.surfaceElevated,
  },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },

  companyInfo: {
    marginLeft: 10,
    flex: 1,
  },
  companyName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.dark.textSecondary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 3,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  bookmarkBtn: {
    padding: 4,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  timeRow: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: Colors.dark.textMuted,
  },
});
