import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CaretRight } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import { useVendorDues } from "@/src/api";
import { formatCurrency, formatCompact } from "@/src/format";
import { EmptyState, categoryColor } from "@/src/components/common";
import { usesNativeTabs } from "@/src/navigation";

export default function DuesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useVendorDues();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const withDues = (data?.vendors ?? []).filter((v) => v.outstanding > 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="dues-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Vendor Dues</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : withDues.length === 0 ? (
        <EmptyState
          title="All settled up"
          subtitle="You have no outstanding payments to any vendor right now."
          testID="dues-empty"
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: bottomChrome + 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        >
          <View style={styles.hero} testID="dues-total-card">
            <Text style={styles.heroLabel}>Total outstanding</Text>
            <Text style={styles.heroValue}>{formatCurrency(data?.total_outstanding ?? 0)}</Text>
            <Text style={styles.heroMeta}>{withDues.length} vendors pending</Text>
          </View>

          {withDues.map((v) => {
            const tint = categoryColor(v.vendor);
            const paidPct = v.total > 0 ? (v.paid / v.total) * 100 : 0;
            return (
              <Pressable
                key={v.vendor}
                style={styles.card}
                onPress={() => router.push(`/vendor/${encodeURIComponent(v.vendor)}`)}
                testID={`dues-vendor-${v.vendor.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: tint + "22" }]}>
                    <Text style={[styles.avatarText, { color: tint }]}>{v.vendor.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vendorName} numberOfLines={1}>{v.vendor}</Text>
                    <Text style={styles.vendorMeta}>
                      {v.open_bills} open of {v.bills} bills
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.outstanding}>{formatCurrency(v.outstanding)}</Text>
                    <Text style={styles.outstandingLabel}>outstanding</Text>
                  </View>
                  <CaretRight size={18} color={colors.muted} weight="bold" />
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${paidPct}%` }]} />
                </View>
                <View style={styles.breakdown}>
                  <Text style={styles.breakdownText}>Paid {formatCompact(v.paid)}</Text>
                  <Text style={styles.breakdownText}>of {formatCompact(v.total)}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.onSurface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: colors.brandPrimary, borderRadius: 16, padding: 20, marginBottom: 16 },
  heroLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.onBrandPrimary, opacity: 0.85 },
  heroValue: { fontFamily: fonts.extrabold, fontSize: 34, color: colors.onBrandPrimary, marginTop: 6 },
  heroMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.onBrandPrimary, opacity: 0.8, marginTop: 4 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, fontSize: 18 },
  vendorName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.onSurface },
  vendorMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  outstanding: { fontFamily: fonts.bold, fontSize: 18, color: colors.error },
  outstandingLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  track: { height: 6, backgroundColor: colors.surfaceTertiary, borderRadius: 999, overflow: "hidden", marginTop: 14 },
  fill: { height: 6, backgroundColor: colors.success, borderRadius: 999 },
  breakdown: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  breakdownText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
}));
