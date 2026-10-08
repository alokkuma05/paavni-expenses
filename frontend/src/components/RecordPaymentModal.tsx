import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { X } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import { Expense, useRecordPayment, useMasters } from "@/src/api";
import { LabeledInput } from "@/src/components/LabeledInput";
import { PickerField } from "@/src/components/PickerField";
import { DateField } from "@/src/components/DateField";
import { formatCurrency, toDateInput } from "@/src/format";

export function RecordPaymentModal({
  expense,
  visible,
  onClose,
}: {
  expense: Expense;
  visible: boolean;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: masters } = useMasters();
  const recordPayment = useRecordPayment();

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState(expense.payment_mode || "");
  const [date, setDate] = useState(toDateInput(new Date()));
  const [error, setError] = useState("");

  const submit = () => {
    setError("");
    const amt = parseFloat(amount || "0");
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    recordPayment.mutate(
      { id: expense.id, paid_amount: amt, payment_mode: mode || undefined, payment_date: date },
      {
        onSuccess: () => {
          setAmount("");
          setError("");
          onClose();
        },
        onError: () => setError("Could not record payment. Try again."),
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Record payment</Text>
          <Pressable onPress={onClose} hitSlop={10} testID="record-payment-close">
            <X size={22} color={colors.onSurface} weight="bold" />
          </Pressable>
        </View>

        <View style={styles.outstandingBox}>
          <Text style={styles.outstandingLabel}>Outstanding</Text>
          <Text style={styles.outstandingValue}>{formatCurrency(expense.outstanding)}</Text>
        </View>

        <KeyboardAwareScrollView bottomOffset={16} keyboardShouldPersistTaps="handled">
          <View style={styles.amountRow}>
            <View style={{ flex: 1 }}>
              <LabeledInput
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                prefix="₹"
                keyboardType="decimal-pad"
                placeholder="0"
                testID="record-payment-amount"
              />
            </View>
          </View>
          <Pressable
            style={styles.fullBtn}
            onPress={() => setAmount(String(expense.outstanding))}
            testID="record-payment-full"
          >
            <Text style={styles.fullBtnText}>Pay full outstanding ({formatCurrency(expense.outstanding)})</Text>
          </Pressable>
          <PickerField
            label="Payment mode"
            value={mode}
            options={masters?.payment_modes ?? []}
            onChange={setMode}
            placeholder="Select mode"
            testID="record-payment-mode"
          />
          <DateField label="Payment date" value={date} onChange={setDate} testID="record-payment-date" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </KeyboardAwareScrollView>

        <Pressable
          style={styles.submitBtn}
          onPress={submit}
          disabled={recordPayment.isPending}
          testID="record-payment-submit"
        >
          <Text style={styles.submitText}>{recordPayment.isPending ? "Saving…" : "Record payment"}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: "88%",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface },
  outstandingBox: {
    backgroundColor: colors.brandTertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  outstandingLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.onBrandTertiary },
  outstandingValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.onBrandTertiary },
  amountRow: { flexDirection: "row", gap: 12 },
  fullBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 14,
    marginTop: -4,
  },
  fullBtnText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.brandPrimary },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.error, marginBottom: 8 },
  submitBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onBrandPrimary },
}));
