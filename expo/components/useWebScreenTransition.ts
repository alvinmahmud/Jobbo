import { useCallback, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { useReducedMotion } from "./useReducedMotion";

// Native stacks handle their own transitions; web needs an explicit animation.
export function useWebScreenTransition(axis: "x" | "y") {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);
  const enabled = Platform.OS === "web" && !reduceMotion;

  useFocusEffect(
    useCallback(() => {
      closing.current = false;
      progress.setValue(enabled ? 0 : 1);
      const animation = Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      });
      if (enabled) animation.start();
      return () => {
        animation.stop();
        progress.stopAnimation();
      };
    }, [enabled, progress]),
  );

  const dismiss = useCallback(
    (onDismiss: () => void) => {
      if (closing.current) return;
      closing.current = true;
      if (!enabled) {
        onDismiss();
        return;
      }
      Animated.timing(progress, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) onDismiss();
      });
    },
    [enabled, progress],
  );

  const offset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [axis === "y" ? 48 : 24, 0],
  });
  const style = enabled
    ? {
        opacity: progress,
        transform:
          axis === "y" ? [{ translateY: offset }] : [{ translateX: offset }],
      }
    : undefined;

  return { style, dismiss };
}
