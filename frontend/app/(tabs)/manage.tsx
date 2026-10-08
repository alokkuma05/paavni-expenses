import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Trash } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import {
  useVendors,
  useCreateVendor,
  useDeleteVendor,
  useMasters,
  useCreateCategory,
  useBudgets,
  useUpsertBudget,
} from "@/src/api";
import { Segmented } from "@/src/components/common";
import { LabeledInput } from "@/src/components/LabeledInput";
import { PickerField } from "@/src/components/PickerField";
import { usesNativeTabs } from "@/src/navigation";
import { currentMonth, monthLabel, formatCurrency } from "@/src/format";

export default function ManageScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("Vendors");
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="manage-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Manage</Text>
      </View>
      <View style={styles.segmentWrap}>
        <Segmented options={["Vendors", "Categories", "Budgets"]} value={tab} onChange={setTab} testID="manage-segment" />
      </View>
      {tab === "Vendors" ? (
        <VendorsTab bottom={bottomChrome} />
      ) : tab === "Categories" ? (
        <CategoriesTab bottom={bottomChrome} />
      ) : (
        <BudgetsTab bottom={bottomChrome} />
      )}
    </View>
  );
}

function VendorsTab({ bottom }: { bottom: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { data: vendors, isLoading } = useVendors();
  const createVendor = useCreateVendor();
  const deleteVendor = useDeleteVendor();
  const [name, setName] = useState("");

  const add = () => {
    if (!name.trim()) return;
    createVendor.mutate({ name: name.trim() });
    setName("");
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom + 40, paddingTop: 8 }}
      bottomOffset={16}
    >
      <View style={styles.addCard}>
        <LabeledInput label="New vendor name" value={name} onChangeText={setName} placeholder="e.g. Verka Dairy" testID="vendor-name-input" />
        <Pressable
          style={[styles.addBtn, !name.trim() && styles.addBtnDisabled]}
          onPress={add}
          disabled={!name.trim() || createVendor.isPending}
          testID="vendor-add-button"
        >
          <Text style={styles.addBtnText}>{createVendor.isPending ? "Adding…" : "Add vendor"}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 24 }} />
      ) : !vendors || vendors.length === 0 ? (
        <Text style={styles.emptyText}>No vendors yet. Add one above.</Text>
      ) : (
        vendors.map((v) => (
          <View key={v.id} style={styles.listRow} testID={`vendor-row-${v.id}`}>
            <Text style={styles.listRowText}>{v.name}</Text>
            <Pressable onPress={() => deleteVendor.mutate(v.id)} hitSlop={10} testID={`vendor-delete-${v.id}`}>
              <Trash size={20} color={colors.error} />
            </Pressable>
          </View>
        ))
      )}
    </KeyboardAwareScrollView>
  );
}

function CategoriesTab({ bottom }: { bottom: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { data: masters, isLoading } = useMasters();
  const createCategory = useCreateCategory();
  const [main, setMain] = useState("");
  const [sub, setSub] = useState("");
  const [head, setHead] = useState("");

  const mainOptions = masters?.categories.map((c) => c.main_category) ?? [];

  const add = () => {
    if (!main.trim() || !sub.trim() || !head.trim()) return;
    createCategory.mutate({ main_category: main, sub_category: sub, detailed_head: head });
    setSub("");
    setHead("");
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom + 40, paddingTop: 8 }}
      bottomOffset={16}
    >
      <View style={styles.addCard}>
        <Text style={styles.addCardTitle}>Add custom category</Text>
        <PickerField
          label="Main category"
          value={main}
          options={mainOptions}
          onChange={setMain}
          searchable
          onAddCustom={setMain}
          addLabel="Add main category"
          placeholder="Select or add"
          testID="cat-main-picker"
        />
        <LabeledInput label="Sub category" value={sub} onChangeText={setSub} placeholder="e.g. Packaging" testID="cat-sub-input" />
        <LabeledInput label="Detailed head" value={head} onChangeText={setHead} placeholder="e.g. Pouch Purchase" testID="cat-head-input" />
        <Pressable
          style={[styles.addBtn, (!main.trim() || !sub.trim() || !head.trim()) && styles.addBtnDisabled]}
          onPress={add}
          disabled={!main.trim() || !sub.trim() || !head.trim() || createCategory.isPending}
          testID="cat-add-button"
        >
          <Text style={styles.addBtnText}>{createCategory.isPending ? "Adding…" : "Add category"}</Text>
        </Pressable>
      </View>

      {!!masters?.custom_categories?.length && (
        <>
          <Text style={styles.sectionLabel}>Custom categories</Text>
          {masters.custom_categories.map((c) => (
            <View key={c.id} style={styles.listRow}>
              <Text style={styles.listRowText}>
                {c.main_category} · {c.sub_category} · {c.detailed_head}
              </Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionLabel}>Built-in categories</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.brandPrimary} />
      ) : (
        masters?.categories.map((c) => (
          <View key={c.main_category} style={styles.builtinRow}>
            <Text style={styles.builtinMain}>{c.main_category}</Text>
            <Text style={styles.builtinSub} numberOfLines={2}>
              {c.sub_categories.map((s) => s.sub_category).join(", ")}
            </Text>
          </View>
        ))
      )}
    </KeyboardAwareScrollView>
  );
}

function BudgetsTab({ bottom }: { bottom: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [month, setMonth] = useState(currentMonth());
  const { data: masters } = useMasters();
  const { data: budgets } = useBudgets(month);
  const upsert = useUpsertBudget();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const monthOptions = useMemo(() => {
    const now = new Date();
    const arr: string[] = [];
    for (let i = -3; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return arr.reverse();
  }, []);

  useEffect(() => {
    const map: Record<string, string> = {};
    (budgets ?? []).forEach((b) => {
      map[b.main_category] = String(b.amount);
    });
    setAmounts(map);
  }, [budgets, month]);

  const categories = masters?.categories.map((c) => c.main_category) ?? [];
  const totalBudget = categories.reduce((s, c) => s + (parseFloat(amounts[c] || "0") || 0), 0);

  const save = () => {
    categories.forEach((cat) => {
      const val = parseFloat(amounts[cat] || "");
      const existing = (budgets ?? []).find((b) => b.main_category === cat);
      if (!isNaN(val) && val > 0 && (!existing || existing.amount !== val)) {
        upsert.mutate({ month, main_category: cat, amount: val });
      }
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom + 40, paddingTop: 8 }}
      bottomOffset={16}
    >
      <PickerField
        label="Budget month"
        value={monthLabel(month)}
        options={monthOptions.map(monthLabel)}
        onChange={(label) => {
          const m = monthOptions.find((x) => monthLabel(x) === label);
          if (m) setMonth(m);
        }}
        testID="budget-month"
      />

      <View style={styles.budgetTotalCard}>
        <Text style={styles.budgetTotalLabel}>Total monthly budget</Text>
        <Text style={styles.budgetTotalValue}>{formatCurrency(totalBudget)}</Text>
      </View>

      <Text style={styles.sectionLabel}>Set a budget per category</Text>
      {categories.map((cat) => (
        <View key={cat} style={styles.budgetRow}>
          <Text style={styles.budgetCat} numberOfLines={2}>{cat}</Text>
          <View style={styles.budgetInputWrap}>
            <Text style={styles.budgetPrefix}>₹</Text>
            <TextInput
              style={styles.budgetInput}
              value={amounts[cat] || ""}
              onChangeText={(t) => setAmounts((p) => ({ ...p, [cat]: t }))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.muted}
              testID={`budget-input-${cat.replace(/\s+/g, "-").toLowerCase()}`}
            />
          </View>
        </View>
      ))}

      <Pressable style={styles.addBtn} onPress={save} disabled={upsert.isPending} testID="budget-save">
        <Text style={styles.addBtnText}>{saved ? "Saved ✓" : upsert.isPending ? "Saving…" : "Save budgets"}</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  title: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.onSurface },
  segmentWrap: { paddingHorizontal: 20, marginBottom: 12 },
  addCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  addCardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onSurface, marginBottom: 12 },
  addBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onBrandPrimary },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 24 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  listRowText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  builtinRow: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  builtinMain: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onSurface },
  builtinSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
  budgetTotalCard: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  budgetTotalLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.onBrandPrimary, opacity: 0.85 },
  budgetTotalValue: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.onBrandPrimary, marginTop: 4 },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 12,
  },
  budgetCat: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface },
  budgetInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 8,
    paddingHorizontal: 10,
    minWidth: 110,
  },
  budgetPrefix: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onSurfaceTertiary, marginRight: 2 },
  budgetInput: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.onSurface, paddingVertical: 10, textAlign: "right" },
}));
