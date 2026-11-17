import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { X } from "@/components/icons";
import Colors from "@/constants/colors";

interface SkillPillProps {
  label: string;
  onRemove?: () => void;
  selected?: boolean;
  onPress?: () => void;
}

export function SkillPill({ label, onRemove, selected, onPress }: SkillPillProps) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}>
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8}>
          <X size={12} color={Colors.dark.textMuted} />
        </Pressable>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.dark.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  pillSelected: {
    backgroundColor: Colors.dark.tintLight,
    borderColor: Colors.dark.tint,
  },
  pillText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: "500" as const,
  },
  pillTextSelected: {
    color: Colors.dark.tint,
  },
});
