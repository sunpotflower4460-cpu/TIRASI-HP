// Support for the iOS app build (Capacitor wrapper in /ios-app).
//
// Inside the app's WebView, `<a download>` on a blob and `window.print()` do
// nothing. Files are therefore written to the app cache and handed to the
// iOS share sheet, where the person can pick "Save Image", "Save to Files" or
// "Print". The plugins are imported lazily so the browser build never loads them.

type CapacitorGlobal = { isNativePlatform?: () => boolean };

export function isNativeApp(): boolean {
  try {
    const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export type ShareOutcome = "shared" | "cancelled";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("ファイルを読み込めませんでした。"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

function isCancel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /cancel/i.test(message);
}

/** Opens the iOS share sheet for a file. Resolves "cancelled" when the person dismisses it. */
export async function shareFileNative(blob: Blob, fileName: string, title?: string): Promise<ShareOutcome> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const data = await blobToBase64(blob);
  // Earlier exports are only temporary copies: clear them so the cache does not grow.
  await Filesystem.rmdir({ path: "export", directory: Directory.Cache, recursive: true }).catch(() => undefined);
  // Always write to the cache folder: files here are temporary and are not backed up.
  const written = await Filesystem.writeFile({
    // A fresh folder per export keeps the shared file name clean (no prefix).
    path: `export/${Date.now()}/${fileName}`,
    data,
    directory: Directory.Cache,
    recursive: true,
  });
  try {
    await Share.share({ title: title ?? fileName, files: [written.uri] });
    return "shared";
  } catch (error) {
    if (isCancel(error)) return "cancelled";
    throw error;
  }
}
