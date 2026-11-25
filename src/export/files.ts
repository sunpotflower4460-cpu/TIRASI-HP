import { isNativeApp, shareFileNative } from "./native";
export function safeFileName(name: string) { return name.replace(/[\\/:*?"<>|\u0000-\u001f\s]+/g, '-').slice(0, 100) || 'tirasi'; }
export type SaveOutcome = "downloaded" | "shared" | "cancelled";
/** Saves a file: a browser download on the web, the iOS share sheet inside the app. */
export async function downloadBlob(blob: Blob, name: string): Promise<SaveOutcome> {
  if (isNativeApp()) return shareFileNative(blob, name);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name;
  document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return "downloaded";
}
export type JsonSaveOutcome = SaveOutcome | "failed";
/** Saves a JSON file and reports what happened; it never throws. */
export async function downloadJson(value: unknown, name: string): Promise<JsonSaveOutcome> {
  try {
    return await downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), safeFileName(name));
  } catch {
    return "failed";
  }
}
/** For callers with nowhere to show a notice: a failure is reported with an alert instead of being lost. */
export function downloadJsonOrAlert(value: unknown, name: string): void {
  void downloadJson(value, name).then(outcome => {
    if (outcome === "failed") window.alert('ファイルを保存できませんでした。もう一度お試しください。');
  });
}
/** The notice to show after an export, so a cancelled or failed save is never reported as done. */
export function exportNotice(outcome: JsonSaveOutcome, done: string): string {
  if (outcome === "cancelled") return '保存をキャンセルしました。もう一度お試しください。';
  if (outcome === "failed") return 'ファイルを保存できませんでした。もう一度お試しください。';
  return done;
}
export function withTimeout<T>(promise: Promise<T>, ms = 20000, disposeLate?: (value: T) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => { settled = true; reject(new Error('処理がタイムアウトしました。再試行してください。')); }, ms);
    promise.then(value => { if (settled) { disposeLate?.(value); return; } settled = true; clearTimeout(timer); resolve(value); }, error => { if (settled) return; settled = true; clearTimeout(timer); reject(error); });
  });
}
export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return withTimeout(new Promise((resolve, reject) => {
    try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNGの生成に失敗しました。軽量版をお試しください。')), 'image/png'); }
    catch { reject(new Error('画像を保存できません。外部画像のCORS設定、端末の空きメモリを確認してください。')); }
  }));
}
