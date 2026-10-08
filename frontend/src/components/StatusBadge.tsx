import React from "react";
import { Text, View } from "react-native";
import { makeStyles, ThemeColors, fonts, useTheme } from "@/src/theme";

export function statusColors(colors: ThemeColors, status: string): { bg: string; fg: string } {
  switch (status) {
    case "Paid":
      return { bg: colors.brandTertiary, fg: "#1B6B33" };
    case "Partly Paid":
      return { bg: "#FFF3E0", fg: colors.warning };
    case "Unpaid":
      return { bg: "#FFE9E7", fg: colors.error };
    case "Reimbursed":
      return { bg: colors.brandTertiary, fg: colors.onBrandTertiary };
    case "Accrued / Provision":
      return { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary };
    default:
      return { bg: colors.surfaceTertiary, fg: colors.muted };
  }
}

export function StatusBadge({ status, testID }: { status: string; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const c = statusColors(colors, status);
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]} testID={testID}>
      <Text style={[styles.text, { color: c.fg }]} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
}));
