import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, DownloadSimple } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import { useExpenses, Expense } from "@/src/api";
import { formatCurrency, formatDate } from "@/src/format";
import { StatusBadge } from "@/src/components/StatusBadge";
import { EmptyState, categoryColor } from "@/src/components/common";
import { exportVendor } from "@/src/export";

export default function VendorStatementScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const vendor = decodeURIComponent(name || "");

  const { data, isLoading } = useExpenses({ vendor });

  const summary = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.reduce((s, e) => s + e.amount, 0),
      paid: list.reduce((s, e) => s + e.paid_amount, 0),
      outstanding: list.reduce((s, e) => s + e.outstanding, 0),
      count: list.length,
    };
  }, [data]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="vendor-statement-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="vendor-back">
          <ArrowLeft size={24} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{vendor}</Text>
        <Pressable
          onPress={() => exportVendor(vendor).catch(() => {})}
          hitSlop={10}
          disabled={!data || data.length === 0}
          testID="vendor-export"
        >
          <DownloadSimple size={22} color={colors.brandPrimary} weight="bold" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : !data || data.length === 0 ? (
        <EmptyState title="No bills" subtitle={`No expenses recorded for ${vendor}.`} testID="vendor-empty" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.summaryCard} testID="vendor-summary">
              <View style={styles.summaryTopRow}>
                <Text style={styles.summaryOutstanding}>{formatCurrency(summary.outstanding)}</Text>
                <Text style={styles.summaryOutLabel}>outstanding</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryMeta}>{summary.count} bills</Text>
                <Text style={styles.summaryMeta}>Billed {formatCurrency(summary.total)}</Text>
                <Text style={styles.summaryMeta}>Paid {formatCurrency(summary.paid)}</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => <Row expense={item} onPress={() => router.push(`/expense-form?id=${item.id}`)} />}
        />
      )}
    </View>
  );
}

function Row({ expense, onPress }: { expense: Expense; onPress: () => void }) {
  const styles = useStyles();
  const tint = categoryColor(expense.main_category);
  return (
    <Pressable style={styles.row} onPress={onPress} testID={`vendor-bill-${expense.id}`}>
      <View style={[styles.rowIcon, { backgroundColor: tint + "22" }]}>
        <View style={[styles.rowDot, { backgroundColor: tint }]} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowCat} numberOfLines={1}>
          {expense.recurring ? "🔁 " : ""}{expense.main_category}
          {expense.detailed_head ? ` · ${expense.detailed_head}` : ""}
        </Text>
        <Text style={styles.rowDate}>{formatDate(expense.date)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={styles.rowAmount}>{formatCurrency(expense.amount)}</Text>
        <StatusBadge status={expense.payment_status} />
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
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  summaryCard: { backgroundColor: colors.brandPrimary, borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryTopRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  summaryOutstanding: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.onBrandPrimary },
  summaryOutLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.onBrandPrimary, opacity: 0.85 },
  summaryRow: { flexDirection: "row", gap: 16, marginTop: 10, flexWrap: "wrap" },
  summaryMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.onBrandPrimary, opacity: 0.9 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowDot: { width: 14, height: 14, borderRadius: 4 },
  rowCat: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onSurface },
  rowDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  rowAmount: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface },
}));
