import React, { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarBlank } from "phosphor-react-native";
import { makeStyles, useTheme, fonts } from "@/src/theme";
import { formatDate, toDateInput } from "@/src/format";

export function DateField({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [show, setShow] = useState(false);

  if (Platform.OS === "web") {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.field}>
          <CalendarBlank size={18} color={colors.muted} />
          <TextInput
            style={styles.webInput}
            value={value}
            onChangeText={onChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            testID={testID}
          />
        </View>
      </View>
    );
  }

  const dateObj = value ? new Date(value + "T00:00:00") : new Date();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setShow(true)} testID={testID}>
        <CalendarBlank size={18} color={colors.muted} />
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? formatDate(value) : "Select date"}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setShow(Platform.OS === "ios");
            if (event.type === "set" && selected) onChange(toDateInput(selected));
            if (Platform.OS !== "ios") setShow(false);
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { marginBottom: 14 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurfaceTertiary, marginBottom: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  value: { fontFamily: fonts.medium, fontSize: 16, color: colors.onSurface },
  placeholder: { color: colors.muted, fontFamily: fonts.regular },
  webInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.onSurface, paddingVertical: 12 },
}));
