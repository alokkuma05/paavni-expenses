import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { DownloadSimple, Funnel, MagnifyingGlass, X } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import { useExpenses, useMasters, Expense } from "@/src/api";
import { formatCurrency, formatDate } from "@/src/format";
import { FAB, EmptyState, categoryColor } from "@/src/components/common";
import { StatusBadge } from "@/src/components/StatusBadge";
import { PickerField } from "@/src/components/PickerField";
import { DateField } from "@/src/components/DateField";
import { exportMonth } from "@/src/export";
import { usesNativeTabs } from "@/src/navigation";

const STATUS_FILTERS = ["All", "Unpaid", "Partly Paid", "Paid"];

export default function ExpensesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: masters } = useMasters();

  const [status, setStatus] = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // debounce the search text
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useExpenses({
    payment_status: status === "All" ? null : status,
    main_category: filterCat || null,
    date_from: dateFrom || null,
    date_to: dateTo || null,
    q: q || null,
  });

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const total = useMemo(() => (data ?? []).reduce((s, e) => s + e.amount, 0), [data]);
  const activeFilters = !!(filterCat || dateFrom || dateTo);

  const clearFilters = () => {
    setFilterCat("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="expenses-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => exportMonth(dateFrom ? dateFrom.slice(0, 7) : null).catch(() => {})}
            disabled={!data || data.length === 0}
            testID="expenses-export"
          >
            <DownloadSimple size={20} color={colors.brandPrimary} weight="bold" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setShowFilters(true)} testID="expenses-filter-button">
            <Funnel size={20} color={colors.brandPrimary} weight={activeFilters ? "fill" : "bold"} />
            {activeFilters ? <View style={styles.filterDot} /> : null}
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <MagnifyingGlass size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search vendor, category, note…"
          placeholderTextColor={colors.muted}
          testID="expenses-search"
        />
        {searchInput ? (
          <Pressable onPress={() => setSearchInput("")} hitSlop={10} testID="expenses-search-clear">
            <X size={16} color={colors.muted} weight="bold" />
          </Pressable>
        ) : null}
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

      {activeFilters ? (
        <View style={styles.activeFilterBar}>
          <Text style={styles.activeFilterText} numberOfLines={1}>
            {filterCat ? filterCat : ""}
            {filterCat && (dateFrom || dateTo) ? " · " : ""}
            {dateFrom || dateTo ? `${dateFrom || "…"} → ${dateTo || "…"}` : ""}
          </Text>
          <Pressable onPress={clearFilters} testID="expenses-clear-filters">
            <Text style={styles.activeFilterClear}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No expenses found"
          subtitle={q || activeFilters || status !== "All" ? "Try adjusting your search or filters." : "Add your first expense to get started."}
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
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.summary}>
              {data.length} bills · {formatCurrency(total)}
            </Text>
          }
          renderItem={({ item }) => <ExpenseRow expense={item} onPress={() => router.push(`/expense-form?id=${item.id}`)} />}
        />
      )}

      <FAB onPress={() => router.push("/expense-form")} bottom={bottomChrome + 16} testID="expenses-fab" />

      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowFilters(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <Pressable onPress={() => setShowFilters(false)} hitSlop={10} testID="expenses-filter-close">
              <X size={22} color={colors.onSurface} weight="bold" />
            </Pressable>
          </View>
          <PickerField
            label="Category"
            value={filterCat}
            options={masters?.categories.map((c) => c.main_category) ?? []}
            onChange={setFilterCat}
            searchable
            placeholder="Any category"
            testID="expenses-filter-category"
          />
          <DateField label="From date" value={dateFrom} onChange={setDateFrom} testID="expenses-filter-from" />
          <DateField label="To date" value={dateTo} onChange={setDateTo} testID="expenses-filter-to" />
          <View style={styles.sheetActions}>
            <Pressable style={styles.clearBtn} onPress={clearFilters} testID="expenses-filter-clear">
              <Text style={styles.clearBtnText}>Clear all</Text>
            </Pressable>
            <Pressable style={styles.applyBtn} onPress={() => setShowFilters(false)} testID="expenses-filter-apply">
              <Text style={styles.applyBtnText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
          {expense.recurring ? "🔁 " : ""}{expense.main_category}
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
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.onSurface, paddingVertical: 12 },
  activeFilterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: colors.brandTertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  activeFilterText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.onBrandTertiary },
  activeFilterClear: { fontFamily: fonts.semibold, fontSize: 12, color: colors.brandPrimary },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
  },
  clearBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onSurfaceTertiary },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
  },
  applyBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onBrandPrimary },
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
