import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { DownloadSimple } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import { useExpenses, Expense } from "@/src/api";
import { formatCurrency, formatDate, currentMonth, monthLabel } from "@/src/format";
import { FAB, EmptyState, categoryColor } from "@/src/components/common";
import { StatusBadge } from "@/src/components/StatusBadge";
import { exportMonth } from "@/src/export";
import { usesNativeTabs } from "@/src/navigation";

const STATUS_FILTERS = ["All", "Unpaid", "Partly Paid", "Paid"];

export default function ExpensesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [status, setStatus] = useState("All");
  const [scope, setScope] = useState<"month" | "all">("all");

  const month = scope === "month" ? currentMonth() : null;
  const { data, isLoading } = useExpenses({
    payment_status: status === "All" ? null : status,
    month,
  });

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const total = useMemo(() => (data ?? []).reduce((s, e) => s + e.amount, 0), [data]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="expenses-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => exportMonth(month).catch(() => {})}
            disabled={!data || data.length === 0}
            testID="expenses-export"
          >
            <DownloadSimple size={20} color={colors.brandPrimary} weight="bold" />
          </Pressable>
          <Pressable
            style={styles.scopeBtn}
            onPress={() => setScope((s) => (s === "all" ? "month" : "all"))}
            testID="expenses-scope-toggle"
          >
            <Text style={styles.scopeText}>{scope === "all" ? "All time" : monthLabel(currentMonth())}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.chipRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {STATUS_FILTERS.map((s) => {
            const active = s === status;
            return (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`expenses-filter-${s.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No expenses found"
          subtitle={status === "All" ? "Add your first expense to get started." : `No ${status.toLowerCase()} expenses.`}
          actionLabel="Add expense"
          onAction={() => router.push("/expense-form")}
          testID="expenses-empty"
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: bottomChrome + 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.summary}>
              {data.length} bills · {formatCurrency(total)}
            </Text>
          }
          renderItem={({ item }) => <ExpenseRow expense={item} onPress={() => router.push(`/expense-form?id=${item.id}`)} />}
        />
      )}

      <FAB onPress={() => router.push("/expense-form")} bottom={bottomChrome + 16} testID="expenses-fab" />
    </View>
  );
}

function ExpenseRow({ expense, onPress }: { expense: Expense; onPress: () => void }) {
  const styles = useStyles();
  const tint = categoryColor(expense.main_category);
  return (
    <Pressable style={styles.row} onPress={onPress} testID={`expense-row-${expense.id}`}>
      <View style={[styles.rowIcon, { backgroundColor: tint + "22" }]}>
        <View style={[styles.rowIconDot, { backgroundColor: tint }]} />
      </View>
      <View style={styles.rowMiddle}>
        <Text style={styles.rowVendor} numberOfLines={1}>
          {expense.vendor}
        </Text>
        <Text style={styles.rowCat} numberOfLines={1}>
          {expense.main_category}
          {expense.detailed_head ? ` · ${expense.detailed_head}` : ""}
        </Text>
        <Text style={styles.rowDate}>{formatDate(expense.date)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>{formatCurrency(expense.amount)}</Text>
        <StatusBadge status={expense.payment_status} />
        {expense.outstanding > 0 && expense.payment_status !== "Unpaid" ? (
          <Text style={styles.rowOutstanding}>{formatCurrency(expense.outstanding)} due</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.onSurface },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeBtn: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  scopeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.onSurfaceTertiary },
  chipRowWrap: { height: 56, justifyContent: "center" },
  chipRow: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  chip: {
    height: 36,
    flexShrink: 0,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurfaceTertiary },
  chipTextActive: { color: colors.onBrandPrimary, fontFamily: fonts.semibold },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  summary: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowIconDot: { width: 14, height: 14, borderRadius: 4 },
  rowMiddle: { flex: 1, marginLeft: 12 },
  rowVendor: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onSurface },
  rowCat: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  rowDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 4, marginLeft: 8 },
  rowAmount: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
  rowOutstanding: { fontFamily: fonts.medium, fontSize: 11, color: colors.error },
}));
