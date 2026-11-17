import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
