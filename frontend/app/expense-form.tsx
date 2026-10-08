import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { X, Trash, Sparkle } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import {
  useMasters,
  useVendors,
  useCreateVendor,
  useExpense,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useParseExpense,
} from "@/src/api";
import { LabeledInput } from "@/src/components/LabeledInput";
import { PickerField } from "@/src/components/PickerField";
import { DateField } from "@/src/components/DateField";
import { SectionCard } from "@/src/components/common";
import { StatusBadge } from "@/src/components/StatusBadge";
import { RecordPaymentModal } from "@/src/components/RecordPaymentModal";
import { toDateInput, formatCurrency, formatDate } from "@/src/format";

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
  const [productLine, setProductLine] = useState("");
  const [gstOn, setGstOn] = useState(false);
  const [taxable, setTaxable] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [tds, setTds] = useState("");
  const [remarks, setRemarks] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState("");
  const [showPayModal, setShowPayModal] = useState(false);
  const [smartText, setSmartText] = useState("");
  const [smartNote, setSmartNote] = useState("");
  const parseExpense = useParseExpense();

  const runSmartAdd = () => {
    if (!smartText.trim()) return;
    setSmartNote("");
    parseExpense.mutate(smartText.trim(), {
      onSuccess: ({ parsed }) => {
        if (parsed.date) setDate(parsed.date);
        if (parsed.vendor) setVendor(parsed.vendor);
        if (parsed.main_category) setMain(parsed.main_category);
        if (parsed.sub_category) setSub(parsed.sub_category);
        if (parsed.detailed_head) setHead(parsed.detailed_head);
        if (parsed.amount != null && parsed.amount > 0) setAmount(String(parsed.amount));
        if (parsed.payment_mode) setPaymentMode(parsed.payment_mode);
        if (parsed.payment_status) setPaymentStatus(parsed.payment_status);
        if (parsed.product_line) setProductLine(parsed.product_line);
        if (parsed.remarks) setRemarks(parsed.remarks);
        setSmartNote("✓ Filled below — review and save.");
      },
      onError: () => setSmartNote("Couldn't read that. Try rephrasing."),
    });
  };

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
      setProductLine(existing.product_line || "");
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
      product_line: productLine || null,
      gst_available: gstOn,
      taxable_amount: gstOn ? parseFloat(taxable || "0") : null,
      gst_percent: gstOn ? parseFloat(gstPercent || "0") : null,
      gst_amount: gstOn ? gstAmount : null,
      tds: tds ? parseFloat(tds) : null,
      remarks: remarks || null,
      recurring,
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
        {!isEdit ? (
          <View style={styles.smartCard} testID="smart-add-card">
            <View style={styles.smartHeader}>
              <Sparkle size={18} color={colors.brandPrimary} weight="fill" />
              <Text style={styles.smartTitle}>Smart add</Text>
            </View>
            <Text style={styles.smartHint}>Describe the expense and AI fills the form.</Text>
            <TextInput
              style={styles.smartInput}
              value={smartText}
              onChangeText={setSmartText}
              placeholder="e.g. Paid Verka Dairy 45k for milk via UPI"
              placeholderTextColor={colors.muted}
              multiline
              testID="smart-add-input"
            />
            <Pressable
              style={[styles.smartBtn, (!smartText.trim() || parseExpense.isPending) && styles.smartBtnDisabled]}
              onPress={runSmartAdd}
              disabled={!smartText.trim() || parseExpense.isPending}
              testID="smart-add-button"
            >
              {parseExpense.isPending ? (
                <ActivityIndicator color={colors.onBrandPrimary} size="small" />
              ) : (
                <Text style={styles.smartBtnText}>✨ Fill with AI</Text>
              )}
            </Pressable>
            {smartNote ? <Text style={styles.smartNote}>{smartNote}</Text> : null}
          </View>
        ) : null}

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
          <PickerField
            label="Product line (optional)"
            value={productLine}
            options={masters?.product_lines ?? []}
            onChange={setProductLine}
            searchable
            placeholder="Select product line"
            testID="form-product-line"
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

        {isEdit && existing ? (
          <SectionCard title="Payment ledger">
            <View style={styles.ledgerSummary}>
              <View style={styles.ledgerCol}>
                <Text style={styles.ledgerColLabel}>Amount</Text>
                <Text style={styles.ledgerColValue}>{formatCurrency(existing.amount)}</Text>
              </View>
              <View style={styles.ledgerCol}>
                <Text style={styles.ledgerColLabel}>Paid</Text>
                <Text style={[styles.ledgerColValue, { color: colors.success }]}>{formatCurrency(existing.paid_amount)}</Text>
              </View>
              <View style={styles.ledgerCol}>
                <Text style={styles.ledgerColLabel}>Outstanding</Text>
                <Text style={[styles.ledgerColValue, { color: existing.outstanding > 0 ? colors.error : colors.onSurface }]}>
                  {formatCurrency(existing.outstanding)}
                </Text>
              </View>
            </View>
            <View style={styles.ledgerStatusRow}>
              <StatusBadge status={existing.payment_status} />
            </View>

            {existing.payments && existing.payments.length > 0 ? (
              <View style={styles.ledgerList}>
                {existing.payments.map((p) => (
                  <View key={p.id} style={styles.ledgerItem} testID={`ledger-item-${p.id}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ledgerItemAmount}>{formatCurrency(p.amount)}</Text>
                      <Text style={styles.ledgerItemMeta}>
                        {formatDate(p.date)}
                        {p.mode ? ` · ${p.mode}` : ""}
                        {p.note ? ` · ${p.note}` : ""}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.ledgerEmpty}>No payments recorded yet.</Text>
            )}

            {existing.outstanding > 0 ? (
              <Pressable style={styles.recordBtn} onPress={() => setShowPayModal(true)} testID="open-record-payment">
                <Text style={styles.recordBtnText}>Record payment</Text>
              </Pressable>
            ) : null}
          </SectionCard>
        ) : (
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
        )}

        <SectionCard title="Notes">
          <LabeledInput label="Remarks (optional)" value={remarks} onChangeText={setRemarks} multiline placeholder="Add a note…" testID="form-remarks" />
        </SectionCard>

        {!isEdit ? (
          <SectionCard title="Repeat">
            <View style={styles.gstRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.gstLabel}>Repeat monthly</Text>
                <Text style={styles.repeatHint}>Auto-create this bill every month (rent, salaries, subscriptions)</Text>
              </View>
              <Switch
                value={recurring}
                onValueChange={setRecurring}
                trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }}
                testID="form-recurring-toggle"
              />
            </View>
          </SectionCard>
        ) : existing?.recurring ? (
          <SectionCard title="Repeat">
            <View style={styles.recurringBadgeRow}>
              <Text style={styles.recurringBadge}>🔁 Auto-created monthly</Text>
            </View>
            <Text style={styles.repeatHint}>Manage or stop this recurring bill from Manage → Recurring.</Text>
          </SectionCard>
        ) : null}

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

      {isEdit && existing ? (
        <RecordPaymentModal expense={existing} visible={showPayModal} onClose={() => setShowPayModal(false)} />
      ) : null}
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
  smartCard: {
    backgroundColor: colors.brandTertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  smartHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  smartTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.onBrandTertiary },
  smartHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.onBrandTertiary, opacity: 0.8, marginTop: 4, marginBottom: 10 },
  smartInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.onSurface,
    textAlignVertical: "top",
  },
  smartBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  smartBtnDisabled: { opacity: 0.5 },
  smartBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onBrandPrimary },
  smartNote: { fontFamily: fonts.medium, fontSize: 12, color: colors.onBrandTertiary, marginTop: 8, textAlign: "center" },
  gstRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  gstLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.onSurface },
  repeatHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
  recurringBadgeRow: { flexDirection: "row", marginBottom: 6 },
  recurringBadge: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.onBrandTertiary,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
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
  ledgerSummary: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  ledgerCol: { flex: 1 },
  ledgerColLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  ledgerColValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface, marginTop: 4 },
  ledgerStatusRow: { marginBottom: 12 },
  ledgerList: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 4 },
  ledgerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  ledgerItemAmount: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onSurface },
  ledgerItemMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  ledgerEmpty: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, paddingVertical: 8 },
  recordBtn: {
    marginTop: 14,
    backgroundColor: colors.brandTertiary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  recordBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onBrandTertiary },
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
