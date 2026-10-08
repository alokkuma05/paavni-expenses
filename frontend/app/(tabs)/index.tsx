import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PieChart } from "react-native-gifted-charts";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import { useDashboard } from "@/src/api";
import { formatCompact, formatCurrency, monthLabel, currentMonth } from "@/src/format";
import { FAB, EmptyState, SectionCard, categoryColor } from "@/src/components/common";
import { PickerField } from "@/src/components/PickerField";
import { usesNativeTabs } from "@/src/navigation";

export default function DashboardScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [month, setMonth] = useState<string | null>(currentMonth());
  const autoSwitched = useRef(false);

  const { data, isLoading, refetch, isRefetching } = useDashboard(month);
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  // On first load, if the current month has no data but other months do,
  // jump to the most recent month that has expenses.
  useEffect(() => {
    if (autoSwitched.current || isLoading || !data) return;
    if (data.count === 0 && data.months.length > 0 && month !== data.months[0]) {
      autoSwitched.current = true;
      setMonth(data.months[0]);
    } else if (data.count > 0) {
      autoSwitched.current = true;
    }
  }, [data, isLoading, month]);

  const periodOptions = ["All time", ...(data?.months ?? [])].map((m) =>
    m === "All time" ? "All time" : monthLabel(m),
  );
  const paidPct = data && data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0;

  const pieData =
    data?.by_category.slice(0, 6).map((c) => ({
      value: c.amount,
      color: categoryColor(c.category),
    })) ?? [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="dashboard-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Paavni</Text>
          <Text style={styles.subtitle}>Expenses & Payments</Text>
        </View>
        <View style={styles.periodPicker}>
          <PickerField
            label="Period"
            value={monthLabel(month)}
            options={periodOptions}
            onChange={(label) => {
              if (label === "All time") setMonth(null);
              else {
                const match = (data?.months ?? []).find((m) => monthLabel(m) === label);
                setMonth(match ?? null);
              }
            }}
            testID="dashboard-month-selector"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : !data || data.count === 0 ? (
        <EmptyState
          title="No expenses yet"
          subtitle="Record your first expense to see monthly totals, category breakdowns and outstanding payments."
          actionLabel="Add expense"
          onAction={() => router.push("/expense-form")}
          testID="dashboard-empty"
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomChrome + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />
          }
        >
          {/* Total hero card */}
          <View style={styles.hero} testID="dashboard-total-card">
            <Text style={styles.heroLabel}>Total expenses</Text>
            <Text style={styles.heroValue}>{formatCurrency(data.total)}</Text>
            <Text style={styles.heroMeta}>{data.count} bills recorded</Text>
          </View>

          {/* Paid vs outstanding */}
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { marginRight: 6 }]} testID="dashboard-paid-card">
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.metricLabel}>Paid</Text>
              <Text style={styles.metricValue}>{formatCurrency(data.paid)}</Text>
            </View>
            <View style={[styles.metricCard, { marginLeft: 6 }]} testID="dashboard-outstanding-card">
              <View style={[styles.dot, { backgroundColor: colors.error }]} />
              <Text style={styles.metricLabel}>Outstanding</Text>
              <Text style={styles.metricValue}>{formatCurrency(data.outstanding)}</Text>
            </View>
          </View>

          <SectionCard title="Payment progress">
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${paidPct}%` }]} />
            </View>
            <View style={styles.progressMeta}>
              <Text style={styles.progressText}>{paidPct}% paid</Text>
              <Text style={styles.progressTextMuted}>{formatCurrency(data.outstanding)} pending</Text>
            </View>
          </SectionCard>

          {data.budget?.has_budgets && month ? (
            <SectionCard title="Budget vs actual" testID="dashboard-budget-card">
              {(() => {
                const over = data.budget.total_spent > data.budget.total_budget;
                const pct = data.budget.total_budget > 0
                  ? Math.min((data.budget.total_spent / data.budget.total_budget) * 100, 100)
                  : 0;
                const atRisk = data.budget.by_category.filter((b) => b.pct >= 90);
                return (
                  <>
                    {atRisk.length > 0 ? (
                      <View style={styles.alertBanner} testID="budget-alert-banner">
                        <Text style={styles.alertText}>
                          ⚠️ {atRisk.length} {atRisk.length === 1 ? "category needs" : "categories need"} attention —{" "}
                          {atRisk.filter((b) => b.pct >= 100).length} over, {atRisk.filter((b) => b.pct >= 90 && b.pct < 100).length} near limit
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.budgetTopRow}>
                      <Text style={styles.budgetSpent}>{formatCurrency(data.budget.total_spent)}</Text>
                      <Text style={styles.budgetOf}>of {formatCurrency(data.budget.total_budget)}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: over ? colors.error : colors.brandPrimary }]} />
                    </View>
                    <Text style={[styles.budgetNote, { color: over ? colors.error : colors.muted }]}>
                      {over
                        ? `${formatCurrency(data.budget.total_spent - data.budget.total_budget)} over budget`
                        : `${formatCurrency(data.budget.total_budget - data.budget.total_spent)} remaining`}
                    </Text>
                  </>
                );
              })()}

              <View style={styles.budgetList}>
                {data.budget.by_category.map((b) => {
                  const over = b.pct >= 100;
                  const warn = b.pct >= 90 && b.pct < 100;
                  const barColor = over ? colors.error : warn ? colors.warning : colors.brandSecondary;
                  const pct = Math.min(b.pct, 100);
                  return (
                    <View key={b.category} style={styles.budgetItem} testID={`budget-cat-${b.category.replace(/\s+/g, "-").toLowerCase()}`}>
                      <View style={styles.barHeader}>
                        <Text style={styles.barLabel} numberOfLines={1}>
                          {over ? "🔴 " : warn ? "🟠 " : ""}{b.category}
                        </Text>
                        <Text style={[styles.barValue, (over || warn) && { color: barColor }]}>
                          {formatCompact(b.spent)} / {formatCompact(b.budget)}
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </SectionCard>
          ) : null}

          {pieData.length > 0 && (
            <SectionCard title="By category">
              <View style={styles.pieRow}>
                <PieChart
                  data={pieData}
                  donut
                  radius={70}
                  innerRadius={44}
                  innerCircleColor={colors.surfaceSecondary}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: "center" }}>
                      <Text style={styles.pieCenterLabel}>Total</Text>
                      <Text style={styles.pieCenterValue}>{formatCompact(data.total)}</Text>
                    </View>
                  )}
                />
                <View style={styles.legend}>
                  {data.by_category.slice(0, 6).map((c) => (
                    <View key={c.category} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: categoryColor(c.category) }]} />
                      <Text style={styles.legendLabel} numberOfLines={1}>
                        {c.category}
                      </Text>
                      <Text style={styles.legendValue}>{formatCompact(c.amount)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </SectionCard>
          )}

          <SectionCard title="Top spends">
            {data.by_category.slice(0, 8).map((c) => {
              const pct = data.total > 0 ? (c.amount / data.total) * 100 : 0;
              return (
                <View key={c.category} style={styles.barItem}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {c.category}
                    </Text>
                    <Text style={styles.barValue}>{formatCurrency(c.amount)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[styles.barFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: categoryColor(c.category) }]}
                    />
                  </View>
                </View>
              );
            })}
          </SectionCard>
        </ScrollView>
      )}

      <FAB onPress={() => router.push("/expense-form")} bottom={bottomChrome + 16} testID="dashboard-fab" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  brand: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.onSurface },
  subtitle: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 2 },
  periodPicker: { width: 150 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  hero: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  heroLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.onBrandPrimary, opacity: 0.85 },
  heroValue: { fontFamily: fonts.extrabold, fontSize: 36, color: colors.onBrandPrimary, marginTop: 6 },
  heroMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.onBrandPrimary, opacity: 0.8, marginTop: 4 },
  metricsRow: { flexDirection: "row", marginBottom: 16 },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: 8 },
  metricLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  metricValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.onSurface, marginTop: 4 },
  progressTrack: {
    height: 12,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: 12, backgroundColor: colors.success, borderRadius: 999 },
  progressMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  progressText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onSurface },
  progressTextMuted: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  budgetTopRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 10 },
  alertBanner: {
    backgroundColor: "#FFF3E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  alertText: { fontFamily: fonts.semibold, fontSize: 13, color: "#B45309", lineHeight: 18 },
  budgetSpent: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.onSurface },
  budgetOf: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  budgetNote: { fontFamily: fonts.semibold, fontSize: 13, marginTop: 10 },
  budgetList: { marginTop: 16, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14 },
  budgetItem: { marginBottom: 14 },
  pieRow: { flexDirection: "row", alignItems: "center" },
  pieCenterLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  pieCenterValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.onSurface },
  legend: { flex: 1, marginLeft: 16, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.onSurfaceTertiary },
  legendValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.onSurface },
  barItem: { marginBottom: 14 },
  barHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  barLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface, marginRight: 8 },
  barValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onSurface },
  barTrack: { height: 8, backgroundColor: colors.surfaceTertiary, borderRadius: 999, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999 },
}));
