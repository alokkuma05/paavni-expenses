import { Linking, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { exportUrl, exportVendorUrl } from "@/src/api";

async function shareUrl(url: string, name: string): Promise<void> {
  if (Platform.OS === "web") {
    const w = (globalThis as any).window;
    if (w?.open) w.open(url, "_blank");
    else await Linking.openURL(url);
    return;
  }
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

export async function exportMonth(month: string | null): Promise<void> {
  await shareUrl(exportUrl(month), `paavni-expenses-${month || "all"}.xlsx`);
}

export async function exportVendor(vendor: string): Promise<void> {
  await shareUrl(exportVendorUrl(vendor), `paavni-${vendor.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
}
