import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretDown, Check, MagnifyingGlass, Plus, X } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";

export function PickerField({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled,
  searchable,
  onAddCustom,
  addLabel,
  testID,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  onAddCustom?: (v: string) => void;
  addLabel?: string;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const showAdd = !!onAddCustom && query.trim().length > 0 &&
    !options.some((o) => o.toLowerCase() === query.trim().toLowerCase());

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={() => !disabled && setOpen(true)}
        testID={testID}
      >
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder || "Select"}
        </Text>
        <CaretDown size={18} color={colors.muted} weight="bold" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} testID={`${testID}-close`} hitSlop={10}>
              <X size={22} color={colors.onSurface} weight="bold" />
            </Pressable>
          </View>

          {(searchable || onAddCustom) && (
            <View style={styles.searchRow}>
              <MagnifyingGlass size={18} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={onAddCustom ? "Search or add new…" : "Search…"}
                placeholderTextColor={colors.muted}
                testID={`${testID}-search`}
              />
            </View>
          )}

          {showAdd && (
            <Pressable
              style={styles.addRow}
              onPress={() => {
                onAddCustom?.(query.trim());
                onChange(query.trim());
                setQuery("");
                setOpen(false);
              }}
              testID={`${testID}-add`}
            >
              <Plus size={18} color={colors.brandPrimary} weight="bold" />
              <Text style={styles.addText}>
                {addLabel || "Add"} “{query.trim()}”
              </Text>
            </Pressable>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item, i) => `${item}-${i}`}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item === value;
              return (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item);
                    setQuery("");
                    setOpen(false);
                  }}
                  testID={`${testID}-option-${item.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={2}>
                    {item}
                  </Text>
                  {active ? <Check size={18} color={colors.brandPrimary} weight="bold" /> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyList}>No options</Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { marginBottom: 14 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurfaceTertiary, marginBottom: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  fieldDisabled: { opacity: 0.5 },
  value: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.onSurface, marginRight: 8 },
  placeholder: { color: colors.muted, fontFamily: fonts.regular },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: "75%",
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.onSurface, paddingVertical: 12 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 4 },
  addText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.brandPrimary },
  list: { flexGrow: 0 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 12,
  },
  optionText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.onSurface },
  optionTextActive: { color: colors.brandPrimary, fontFamily: fonts.semibold },
  emptyList: { textAlign: "center", color: colors.muted, fontFamily: fonts.regular, paddingVertical: 24 },
}));
