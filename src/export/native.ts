import { tr } from "../i18n";
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
    reader.onerror = () => reject(reader.error ?? new Error(tr("ファイルを読み込めませんでした。")));
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

/** Writes a temporary copy to the app cache and returns its file URI. */
async function writeCacheFile(blob: Blob, fileName: string): Promise<string> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const data = await blobToBase64(blob);
  // Earlier exports are only temporary copies: remove the old ones so the cache does
  // not grow. Recent folders stay, because a share sheet or save may still be using them.
  const listing = await Filesystem.readdir({ path: "export", directory: Directory.Cache }).catch(() => undefined);
  const oldest = Date.now() - 10 * 60 * 1000;
  await Promise.all(
    (listing?.files ?? [])
      .filter((entry) => Number(entry.name) < oldest)
      .map((entry) =>
        Filesystem.rmdir({ path: `export/${entry.name}`, directory: Directory.Cache, recursive: true }).catch(() => undefined),
      ),
  );
  const written = await Filesystem.writeFile({
    // A fresh folder per export keeps the shared file name clean (no prefix).
    path: `export/${Date.now()}/${fileName}`,
    data,
    directory: Directory.Cache,
    recursive: true,
  });
  return written.uri;
}

/** Opens the iOS share sheet for a file. Resolves "cancelled" when the person dismisses it. */
export async function shareFileNative(blob: Blob, fileName: string, title?: string): Promise<ShareOutcome> {
  const uri = await writeCacheFile(blob, fileName);
  const { Share } = await import("@capacitor/share");
  try {
    await Share.share({ title: title ?? fileName, files: [uri] });
    return "shared";
  } catch (error) {
    if (isCancel(error)) return "cancelled";
    throw error;
  }
}

/** Thrown when the person has not allowed the app to add pictures to Photos. */
export class PhotoAccessDeniedError extends Error {
  constructor() {
    // The name shown in iOS Settings is the home-screen name of each app.
    const name = import.meta.env?.VITE_EDITION === "store" ? tr("ライブチラシ") : tr("生音");
    super(tr("写真への保存が許可されていません。設定アプリの「{0}」で「写真」を許可してください。", name));
    this.name = "PhotoAccessDeniedError";
  }
}

/** Saves an image straight to the Photos library (camera roll) without a share sheet. */
export async function savePhotoNative(blob: Blob, fileName: string): Promise<void> {
  const uri = await writeCacheFile(blob, fileName);
  const { Media } = await import("@capacitor-community/media");
  try {
    await Media.savePhoto({ path: uri });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (code === "accessDenied" || /not allowed|denied/i.test(message)) throw new PhotoAccessDeniedError();
    throw error;
  }
}
