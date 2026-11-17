import { Tabs } from "expo-router";
import { Briefcase, Bookmark, User } from "@/components/icons";
import React from "react";
import Colors from "@/constants/colors";
import { useReducedMotion } from "@/components/useReducedMotion";

export default function TabLayout() {
  const reduceMotion = useReducedMotion();

  return (
    <Tabs
      screenOptions={{
        animation: reduceMotion ? "none" : "fade",
        transitionSpec: { animation: "timing", config: { duration: 180 } },
        sceneStyle: { backgroundColor: Colors.dark.background },
        tabBarActiveTintColor: Colors.dark.tint,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.dark.tabBar,
          borderTopColor: Colors.dark.tabBarBorder,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600" as const,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color, size }) => (
            <Briefcase size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, size }) => (
            <Bookmark size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
