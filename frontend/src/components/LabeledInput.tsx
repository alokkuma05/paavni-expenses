import React from "react";
import { Text, TextInput, View, KeyboardTypeOptions } from "react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";

export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  prefix,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  prefix?: string;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, multiline && styles.inputRowMultiline]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          testID={testID}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { marginBottom: 14 },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.onSurfaceTertiary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputRowMultiline: { alignItems: "flex-start", paddingVertical: 8 },
  prefix: { fontFamily: fonts.semibold, fontSize: 16, color: colors.onSurfaceTertiary, marginRight: 4 },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.onSurface,
    paddingVertical: 10,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
}));
