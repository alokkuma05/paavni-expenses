import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { X, Trash } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import {
  useMasters,
  useVendors,
  useCreateVendor,
  useExpense,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "@/src/api";
import { LabeledInput } from "@/src/components/LabeledInput";
import { PickerField } from "@/src/components/PickerField";
import { DateField } from "@/src/components/DateField";
import { SectionCard } from "@/src/components/common";
import { toDateInput, formatCurrency } from "@/src/format";

export default function ExpenseFormScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const { data: masters } = useMasters();
  const { data: vendors } = useVendors();
  const { data: existing, isLoading: loadingExisting } = useExpense(id);
  const createVendor = useCreateVendor();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense(id || "");
  const deleteExpense = useDeleteExpense();

  // form state
  const [date, setDate] = useState(toDateInput(new Date()));
  const [vendor, setVendor] = useState("");
  const [main, setMain] = useState("");
  const [sub, setSub] = useState("");
  const [head, setHead] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Unpaid");
  const [paymentMode, setPaymentMode] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [costCentre, setCostCentre] = useState("");
  const [gstOn, setGstOn] = useState(false);
  const [taxable, setTaxable] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [tds, setTds] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (existing) {
      setDate(existing.date);
      setVendor(existing.vendor);
      setMain(existing.main_category);
      setSub(existing.sub_category || "");
      setHead(existing.detailed_head || "");
      setAmount(String(existing.amount || ""));
      setPaymentStatus(existing.payment_status);
      setPaymentMode(existing.payment_mode || "");
      setPaidAmount(existing.paid_amount ? String(existing.paid_amount) : "");
      setCostCentre(existing.cost_centre || "");
      setGstOn(!!existing.gst_available);
      setTaxable(existing.taxable_amount ? String(existing.taxable_amount) : "");
      setGstPercent(existing.gst_percent ? String(existing.gst_percent) : "");
      setTds(existing.tds ? String(existing.tds) : "");
      setRemarks(existing.remarks || "");
    }
  }, [existing]);

  const mainOptions = masters?.categories.map((c) => c.main_category) ?? [];
  const subOptions = useMemo(() => {
    const m = masters?.categories.find((c) => c.main_category === main);
    return m?.sub_categories.map((s) => s.sub_category) ?? [];
  }, [masters, main]);
  const headOptions = useMemo(() => {
    const m = masters?.categories.find((c) => c.main_category === main);
    const s = m?.sub_categories.find((x) => x.sub_category === sub);
    return s?.detailed_heads ?? [];
  }, [masters, main, sub]);

  const vendorOptions = vendors?.map((v) => v.name) ?? [];

  const gstAmount = useMemo(() => {
    const t = parseFloat(taxable || "0");
    const p = parseFloat(gstPercent || "0");
    return gstOn ? Math.round(t * p) / 100 : 0;
  }, [taxable, gstPercent, gstOn]);

  const computedTotal = gstOn ? parseFloat(taxable || "0") + gstAmount : parseFloat(amount || "0");

  const save = () => {
    setError("");
    if (!vendor.trim()) return setError("Please select a vendor.");
    if (!main.trim()) return setError("Please select a category.");
    const amt = gstOn ? computedTotal : parseFloat(amount || "0");
    if (!amt || amt <= 0) return setError("Please enter a valid amount.");

    let paid = parseFloat(paidAmount || "0");
    if (paymentStatus === "Paid") paid = amt;
    if (paymentStatus === "Unpaid") paid = 0;

    const body = {
      date,
      vendor: vendor.trim(),
      main_category: main,
      sub_category: sub || null,
      detailed_head: head || null,
      amount: amt,
      payment_status: paymentStatus,
      payment_mode: paymentMode || null,
      paid_amount: paid,
      cost_centre: costCentre || null,
      gst_available: gstOn,
      taxable_amount: gstOn ? parseFloat(taxable || "0") : null,
      gst_percent: gstOn ? parseFloat(gstPercent || "0") : null,
      gst_amount: gstOn ? gstAmount : null,
      tds: tds ? parseFloat(tds) : null,
      remarks: remarks || null,
    };

    const onDone = () => router.back();
    if (isEdit) updateExpense.mutate(body, { onSuccess: onDone });
    else createExpense.mutate(body, { onSuccess: onDone });
  };

  const onDelete = () => {
    if (!id) return;
    deleteExpense.mutate(id, { onSuccess: () => router.back() });
  };

  const saving = createExpense.isPending || updateExpense.isPending;

  if (isEdit && loadingExisting) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="expense-form-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="form-close">
          <X size={24} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? "Edit expense" : "New expense"}</Text>
        {isEdit ? (
          <Pressable onPress={onDelete} hitSlop={10} testID="form-delete">
            <Trash size={22} color={colors.error} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        bottomOffset={90}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard title="Details">
          <DateField label="Date" value={date} onChange={setDate} testID="form-date" />
          <PickerField
            label="Vendor"
            value={vendor}
            options={vendorOptions}
            onChange={setVendor}
            searchable
            onAddCustom={(v) => createVendor.mutate({ name: v })}
            addLabel="Add vendor"
            placeholder="Select or add vendor"
            testID="form-vendor"
          />
          <PickerField
            label="Cost centre (optional)"
            value={costCentre}
            options={masters?.cost_centres ?? []}
            onChange={setCostCentre}
            searchable
            placeholder="Select cost centre"
            testID="form-cost-centre"
          />
        </SectionCard>

        <SectionCard title="Category">
          <PickerField
            label="Main category"
            value={main}
            options={mainOptions}
            onChange={(v) => {
              setMain(v);
              setSub("");
              setHead("");
            }}
            searchable
            placeholder="Select category"
            testID="form-main-category"
          />
          <PickerField
            label="Sub category"
            value={sub}
            options={subOptions}
            onChange={(v) => {
              setSub(v);
              setHead("");
            }}
            disabled={!main}
            searchable
            placeholder="Select sub category"
            testID="form-sub-category"
          />
          <PickerField
            label="Detailed head"
            value={head}
            options={headOptions}
            onChange={setHead}
            disabled={!sub}
            searchable
            placeholder="Select detailed head"
            testID="form-detailed-head"
          />
        </SectionCard>

        <SectionCard title="Amount">
          <View style={styles.gstRow}>
            <Text style={styles.gstLabel}>Bill has GST</Text>
            <Switch
              value={gstOn}
              onValueChange={setGstOn}
              trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }}
              testID="form-gst-toggle"
            />
          </View>
          {gstOn ? (
            <>
              <LabeledInput label="Taxable amount" value={taxable} onChangeText={setTaxable} prefix="₹" keyboardType="decimal-pad" testID="form-taxable" />
              <LabeledInput label="GST %" value={gstPercent} onChangeText={setGstPercent} keyboardType="decimal-pad" placeholder="e.g. 18" testID="form-gst-percent" />
              <View style={styles.computedRow}>
                <Text style={styles.computedLabel}>GST amount</Text>
                <Text style={styles.computedValue}>{formatCurrency(gstAmount)}</Text>
              </View>
              <View style={styles.computedRow}>
                <Text style={styles.computedLabel}>Total (incl. GST)</Text>
                <Text style={[styles.computedValue, styles.computedTotal]}>{formatCurrency(computedTotal)}</Text>
              </View>
            </>
          ) : (
            <LabeledInput label="Amount" value={amount} onChangeText={setAmount} prefix="₹" keyboardType="decimal-pad" placeholder="0" testID="form-amount" />
          )}
          <LabeledInput label="TDS (optional)" value={tds} onChangeText={setTds} prefix="₹" keyboardType="decimal-pad" placeholder="0" testID="form-tds" />
        </SectionCard>

        <SectionCard title="Payment">
          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.statusWrap}>
            {["Unpaid", "Partly Paid", "Paid"].map((s) => {
              const active = s === paymentStatus;
              return (
                <Pressable
                  key={s}
                  onPress={() => setPaymentStatus(s)}
                  style={[styles.statusChip, active && styles.statusChipActive]}
                  testID={`form-status-${s.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
          {paymentStatus === "Partly Paid" ? (
            <LabeledInput label="Amount paid" value={paidAmount} onChangeText={setPaidAmount} prefix="₹" keyboardType="decimal-pad" placeholder="0" testID="form-paid-amount" />
          ) : null}
          {paymentStatus !== "Unpaid" ? (
            <PickerField
              label="Payment mode"
              value={paymentMode}
              options={masters?.payment_modes ?? []}
              onChange={setPaymentMode}
              placeholder="Select mode"
              testID="form-payment-mode"
            />
          ) : null}
        </SectionCard>

        <SectionCard title="Notes">
          <LabeledInput label="Remarks (optional)" value={remarks} onChangeText={setRemarks} multiline placeholder="Add a note…" testID="form-remarks" />
        </SectionCard>

        {error ? (
          <Text style={styles.error} testID="form-error">
            {error}
          </Text>
        ) : null}
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={styles.saveBtn} onPress={save} disabled={saving} testID="form-save">
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : isEdit ? "Update expense" : "Save expense"}</Text>
          </Pressable>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  gstRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  gstLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.onSurface },
  computedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  computedLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  computedValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onSurface },
  computedTotal: { fontSize: 18, color: colors.brandPrimary, fontFamily: fonts.bold },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurfaceTertiary, marginBottom: 8 },
  statusWrap: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statusChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
  },
  statusChipActive: { backgroundColor: colors.brandPrimary },
  statusChipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurfaceTertiary },
  statusChipTextActive: { color: colors.onBrandPrimary, fontFamily: fonts.semibold },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.error, textAlign: "center", marginTop: 4 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onBrandPrimary },
}));
