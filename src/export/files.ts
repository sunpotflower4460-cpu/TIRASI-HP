export function safeFileName(name: string) { return name.replace(/[\\/:*?"<>|\u0000-\u001f\s]+/g, '-').slice(0, 100) || 'tirasi'; }
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name;
  document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function downloadJson(value: unknown, name: string) {
  downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), safeFileName(name));
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
