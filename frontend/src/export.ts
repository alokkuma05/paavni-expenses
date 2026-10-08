import { Linking, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { exportUrl } from "@/src/api";

export async function exportMonth(month: string | null): Promise<void> {
  const url = exportUrl(month);

  if (Platform.OS === "web") {
    const w = (globalThis as any).window;
    if (w?.open) w.open(url, "_blank");
    else await Linking.openURL(url);
    return;
  }

  const name = `paavni-expenses-${month || "all"}.xlsx`;
  const dest = (FileSystem.cacheDirectory || "") + name;
  const res = await FileSystem.downloadAsync(url, dest);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(res.uri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Export expenses",
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });
  }
}
