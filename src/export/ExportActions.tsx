import { useEffect, useRef, useState } from "react";
import { downloadBlob, safeFileName } from "./files";
import { isNativeApp, shareFileNative } from "./native";
import { pngBlobToPdf } from "./pdf";
import { errorMessage } from "../domain/validation";
export function ExportActions({
  generate,
  source,
  name,
  canPrint = true,
  errors = [],
  sizeInfo,
  memoryEstimateMB = 100,
  onPrint = () => window.print(),
}: {
  generate: (light: boolean) => Promise<Blob>;
  source: unknown;
  name: string;
  sizeInfo?: string;
  memoryEstimateMB?: number;
  canPrint?: boolean;
  errors?: string[];
  onPrint?: () => void | Promise<void>;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState<"png" | "print">("png");
  const [blob, setBlob] = useState<Blob>();
  const [light, setLight] = useState(false);
  const native = isNativeApp();
  const generation = useRef(0);
  const locked = useRef(false);
  useEffect(() => {
    generation.current++;
    locked.current = false;
    setBusy(false);
    setBlob(undefined);
    setStatus("");
    return () => {
      generation.current++;
    };
  }, [source, light]);
  // One click from preview to file: generate (or reuse) the PNG, then act on it.
  const ensureBlob = async (): Promise<Blob | undefined> => {
    if (blob) return blob;
    if (locked.current || errors.length) return undefined;
    locked.current = true;
    const id = ++generation.current;
    setBusyKind("png");
    setBusy(true);
    setStatus("PNGを作成しています…");
    try {
      const result = await generate(light);
      if (id !== generation.current) return undefined;
      setBlob(result);
      return result;
    } catch (error) {
      if (id === generation.current) setStatus(errorMessage(error));
      return undefined;
    } finally {
      if (id === generation.current) {
        setBusy(false);
        locked.current = false;
      }
    }
  };
  const fileName = `${safeFileName(name)}${light ? "-light" : ""}.png`;
  const saveBlob = async (ready: Blob) => {
    try {
      const outcome = await downloadBlob(ready, fileName);
      setStatus(
        outcome === "cancelled"
          ? "保存をキャンセルしました。もう一度「PNGを保存」を押せます。"
          : outcome === "shared"
            ? "共有画面を開きました。「画像を保存」または「ファイルに保存」を選んでください。"
            : "PNGのダウンロードを開始しました。端末の保存先をご確認ください。",
      );
    } catch {
      setStatus("PNGを保存できませんでした。軽量版をお試しください。");
    }
  };
  const save = async () => {
    const ready = await ensureBlob();
    if (ready) await saveBlob(ready);
  };
  const share = async () => {
    const prepared = !!blob;
    const ready = await ensureBlob();
    if (!ready || locked.current) return;
    if (native) {
      await saveBlob(ready);
      return;
    }
    const file = new File([ready], fileName, { type: "image/png" });
    let canShare = false;
    try {
      canShare = !!navigator.canShare?.({ files: [file] }) && !!navigator.share;
    } catch {
      /* A policy can reject the capability query. */
    }
    if (!canShare) {
      setStatus(
        "このブラウザでは画像共有を利用できません。「PNGを保存」をお使いください。",
      );
      return;
    }
    locked.current = true;
    const id = ++generation.current;
    try {
      await navigator.share({ files: [file], title: name });
      if (id === generation.current)
        setStatus("共有画面を開きました。保存先をご確認ください。");
    } catch (e) {
      if (id === generation.current)
        setStatus(
          e instanceof DOMException && e.name === "AbortError"
            ? "共有をキャンセルしました。PNGは引き続き保存できます。"
            : !prepared &&
                e instanceof DOMException &&
                e.name === "NotAllowedError"
              ? "画像の準備ができました。もう一度「共有」を押してください。"
              : "共有できませんでした。「PNGを保存」をお使いください。",
        );
    } finally {
      if (id === generation.current) locked.current = false;
    }
  };
  const pdfName = fileName.replace(/\.png$/, ".pdf");
  // The app cannot open a print dialog: build a PDF from the rendered paper
  // and hand it to the share sheet, which offers "Print" and "Save to Files".
  const printNative = async () => {
    const ready = await ensureBlob();
    if (!ready || locked.current) return;
    locked.current = true;
    const id = ++generation.current;
    setBusyKind("print");
    setBusy(true);
    setStatus("PDFを作成しています…");
    try {
      const pdf = await pngBlobToPdf(ready);
      if (id !== generation.current) return;
      const outcome = await shareFileNative(pdf, pdfName, name);
      if (id === generation.current)
        setStatus(
          outcome === "cancelled"
            ? "キャンセルしました。もう一度「印刷 / PDFとして保存」を押せます。"
            : "共有画面を開きました。「プリント」または「ファイルに保存」を選んでください。",
        );
    } catch (error) {
      if (id === generation.current)
        setStatus(
          error instanceof Error && error.message
            ? error.message
            : "PDFを作成できませんでした。軽量版をお試しください。",
        );
    } finally {
      if (id === generation.current) {
        locked.current = false;
        setBusy(false);
      }
    }
  };
  const print = async () => {
    if (native) return printNative();
    if (locked.current || errors.length) return;
    locked.current = true;
    const id = ++generation.current;
    setBusyKind("print");
    setBusy(true);
    setStatus("印刷用の紙面を準備しています…");
    try {
      await onPrint();
      if (id === generation.current)
        setStatus(
          "ブラウザの印刷画面でA4・倍率100%・背景の印刷を確認してください。",
        );
    } catch (error) {
      if (id === generation.current) setStatus(errorMessage(error));
    } finally {
      if (id === generation.current) {
        locked.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <div className="export-actions print-hidden">
      <div className="action-row">
        <button
          type="button"
          className="export-primary"
          onClick={() => void save()}
          disabled={busy || !!errors.length}
        >
          {busy && busyKind === "png" ? "作成中…" : "PNGを保存"}
        </button>
        {canPrint && (
          <button
            type="button"
            disabled={!!errors.length || busy}
            onClick={() => void print()}
          >
            印刷 / PDFとして保存
          </button>
        )}
        <button
          type="button"
          disabled={busy || !!errors.length}
          onClick={() => void share()}
        >
          共有
        </button>
      </div>
      {errors.length > 0 && (
        <div role="alert" className="editor-warning">
          <strong>書き出す前に修正してください</strong>
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p>
            本文を短くする、任意の紹介を非表示にする、別のレイアウトを選ぶなどで調整してください。
          </p>
        </div>
      )}
      <p role="status" aria-live="polite" className="export-status">
        {status}
      </p>
      <details className="export-settings">
        <summary>出力サイズと印刷のこつ</summary>
        {canPrint && (
          <label className="inline-check">
            <input
              type="checkbox"
              checked={light}
              onChange={(e) => setLight(e.target.checked)}
            />
            軽量版（A4は1240×1754px）
          </label>
        )}
        <p className="helper">
          {sizeInfo ??
            "A4 PNG: 2480×3508px（300dpi相当） / 印刷はブラウザ機能です。A4・倍率100%・余白なし・背景の印刷を選んでください。業者向け塗り足しは含みません。"}
        </p>
        {native && (
          <p className="helper">
            アプリでは、PNGと「印刷 / PDFとして保存」は共有画面から保存・印刷します。
          </p>
        )}
        <p className="helper">
          高画質PNGの作業メモリ目安: 約{memoryEstimateMB}
          MB（端末や画像により増減）。
          {canPrint
            ? "動作が重い場合は軽量版を選んでください。"
            : "画像を小さくすると負荷を下げられます。"}
        </p>
      </details>
    </div>
  );
}
