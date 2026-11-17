import React from "react";
import { Feather, Ionicons } from "@expo/vector-icons";

type IconProps = {
  size?: number;
  color?: string;
  fill?: string;
};

const featherIcon =
  (name: React.ComponentProps<typeof Feather>["name"]) =>
  ({ size = 24, color = "currentColor" }: IconProps) => <Feather name={name} size={size} color={color} />;

export const X = featherIcon("x");
export const RotateCcw = featherIcon("rotate-ccw");
export const Check = featherIcon("check");
export const Briefcase = featherIcon("briefcase");
export const User = featherIcon("user");
export const Search = featherIcon("search");
export const SlidersHorizontal = featherIcon("sliders");
export const MapPin = featherIcon("map-pin");
export const TrendingUp = featherIcon("trending-up");
export const FileText = featherIcon("file-text");
export const Plus = featherIcon("plus");
export const ChevronDown = featherIcon("chevron-down");
export const Trash2 = featherIcon("trash-2");
export const ArrowLeft = featherIcon("arrow-left");
export const Clock = featherIcon("clock");
export const DollarSign = featherIcon("dollar-sign");
export const ExternalLink = featherIcon("external-link");

export function Bookmark({ size = 24, color = "currentColor", fill }: IconProps) {
  const name = fill && fill !== "none" ? "bookmark" : "bookmark-outline";
  return <Ionicons name={name} size={size} color={color} />;
}
