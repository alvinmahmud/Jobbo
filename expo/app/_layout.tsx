import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { JobProvider } from "@/providers/JobProvider";
import Colors from "@/constants/colors";
import { useReducedMotion } from "@/components/useReducedMotion";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const reduceMotion = useReducedMotion();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        animation: reduceMotion ? "none" : "slide_from_right",
        gestureEnabled: true,
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTintColor: Colors.dark.text,
        contentStyle: {
          backgroundColor: Colors.dark.background,
          overflow: "hidden",
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="job/[id]"
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="filter"
        options={{
          presentation: "modal",
          animation: reduceMotion ? "none" : "slide_from_bottom",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView
        style={{ flex: 1, minWidth: 0, overflow: "hidden" }}
      >
        <JobProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </JobProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
