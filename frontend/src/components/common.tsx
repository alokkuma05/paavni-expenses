import React from "react";
import { Pressable, Text, View, ViewStyle } from "react-native";
import { Plus } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";

export const CATEGORY_COLORS = [
  "#2A5C43", "#4A7C5F", "#6B9B7C", "#B45309", "#FF9500",
  "#8FBF9E", "#C98A3B", "#5B7A9E", "#A6705A", "#8E8E93",
];

export function categoryColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

export function SectionCard({
  title,
  children,
  style,
  testID,
}: {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.cardWrap} testID={testID}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      <View style={[styles.card, style]}>{children}</View>
    </View>
  );
}

export function Segmented({
  options,
  value,
  onChange,
  testID,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  testID?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.segment} testID={testID}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
            testID={`segment-${opt.replace(/\s+/g, "-").toLowerCase()}`}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FAB({ onPress, bottom, testID }: { onPress: () => void; bottom: number; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.fab, { bottom }]}
      testID={testID}
      android_ripple={{ color: colors.brandSecondary, borderless: false }}
    >
      <Plus size={24} color={colors.onBrandPrimary} weight="bold" />
    </Pressable>
  );
}

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  testID,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.empty} testID={testID}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.emptyBtn} onPress={onAction} testID={`${testID}-action`}>
          <Text style={styles.emptyBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  cardWrap: { marginBottom: 16 },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 10,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentItemActive: {
    backgroundColor: colors.surfaceSecondary,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  segmentTextActive: { color: colors.onSurface, fontFamily: fonts.semibold },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brandPrimary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface, textAlign: "center" },
  emptySub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 8 },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onBrandPrimary },
}));
