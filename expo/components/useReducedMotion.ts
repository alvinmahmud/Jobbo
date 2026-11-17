import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(() =>
    Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : true,
  );

  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        receivedEvent = true;
        setReduceMotion(enabled);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active && !receivedEvent) setReduceMotion(enabled);
      })
      .catch(() => {});

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
