import { Tabs } from "expo-router";
import { Briefcase, Bookmark, User } from "@/components/icons";
import React from "react";
import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
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
        name='(home)'
        options={{
          title: "Jobs",
          tabBarIcon: ({ color, size }) => <Briefcase size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='saved'
        options={{
          title: "Saved",
          tabBarIcon: ({ color, size }) => <Bookmark size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
