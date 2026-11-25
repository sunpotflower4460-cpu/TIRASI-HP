import { useEffect, useRef, useState } from "react";
import { downloadBlob, safeFileName, withTimeout } from "./files";
import { PhotoAccessDeniedError, isNativeApp, savePhotoNative, shareFileNative } from "./native";
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
  const [status, setStatusText] = useState("");
  const [statusOk, setStatusOk] = useState(false);
  // A finished save is shown in green so it cannot be missed; everything else is plain.
  const setStatus = (text: string, ok = false) => {
    setStatusText(text);
    setStatusOk(ok);
  };
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState<"png" | "save" | "share" | "print">("png");
  const [blob, setBlob] = useState<Blob>();
  const [light, setLight] = useState(false);
  // How many copies of the current design were saved to Photos (app only).
  const [savedCount, setSavedCount] = useState(0);
  const native = isNativeApp();
  // In the app the buttons name their destination: the first goes to Photos, the
  // second opens the share sheet (Files, AirDrop, LINE...).
  const saveLabel = native ? "写真に保存" : "PNGを保存";
  const shareLabel = native ? "ファイルに保存 / 共有" : "共有";
  const generation = useRef(0);
  const locked = useRef(false);
  useEffect(() => {
    generation.current++;
    locked.current = false;
    setBusy(false);
    setBlob(undefined);
    setSavedCount(0);
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
      if (native) {
        // In the app the PNG goes straight to the camera roll. Show progress at
        // once: the first save asks for permission, which can take a moment.
        if (
          savedCount > 0 &&
          !window.confirm(
            `このチラシはすでに写真アプリに${savedCount}枚保存しました。もう1枚保存しますか？`,
          )
        ) {
          setStatus(`✓ すでに写真アプリに${savedCount}枚保存済みです。追加で保存はしませんでした。`, true);
          return;
        }
        locked.current = true;
        const id = ++generation.current;
        setBusyKind("save");
        setBusy(true);
        setStatus("写真アプリに保存しています…");
        try {
          // Long enough for the first-time permission prompt to be answered.
          await withTimeout(savePhotoNative(ready, fileName), 120000);
          if (id === generation.current) {
            const count = savedCount + 1;
            setSavedCount(count);
            setStatus(
              `✓ 写真アプリ（カメラロール）に保存しました（${count}枚目）。写真アプリで確認できます。「ファイルに保存」や他のアプリへ送るときは「ファイルに保存 / 共有」を押してください。`,
              true,
            );
          }
        } catch (error) {
          if (id !== generation.current) return;
          if (error instanceof PhotoAccessDeniedError) throw error;
          // No answer from Photos. Do not open the share sheet on our own: the save may
          // still finish, and a second copy would be written.
          setStatus(
            `写真アプリへの保存を確認できませんでした。写真アプリを確認し、なければ「${shareLabel}」から保存してください。`,
          );
        } finally {
          if (id === generation.current) {
            locked.current = false;
            setBusy(false);
          }
        }
        return;
      }
      const outcome = await downloadBlob(ready, fileName);
      setStatus(
        outcome === "cancelled"
          ? `保存をキャンセルしました。もう一度「${saveLabel}」を押せます。`
          : "PNGのダウンロードを開始しました。端末の保存先をご確認ください。",
      );
    } catch (error) {
      setStatus(
        error instanceof PhotoAccessDeniedError
          ? `${error.message}「${shareLabel}」からファイルに保存することもできます。`
          : "PNGを保存できませんでした。軽量版をお試しください。",
      );
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
      // "Share" keeps the share sheet (Files, AirDrop, other apps). It is locked
      // like the other actions so a double tap cannot open two sheets.
      locked.current = true;
      const id = ++generation.current;
      setBusyKind("share");
      setBusy(true);
      try {
        const outcome = await shareFileNative(ready, fileName, name);
        if (id === generation.current)
          setStatus(
            outcome === "cancelled"
              ? "共有をキャンセルしました。PNGは引き続き保存できます。"
              : "共有画面を開きました。「ファイルに保存」を選ぶとファイルアプリに、他のアプリを選ぶとそこへ送れます。",
          );
      } catch {
        if (id === generation.current)
          setStatus(`共有できませんでした。「${saveLabel}」をお使いください。`);
      } finally {
        if (id === generation.current) {
          locked.current = false;
          setBusy(false);
        }
      }
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
          {busy && busyKind === "save"
            ? "保存中…"
            : busy && busyKind === "png"
              ? "作成中…"
              : savedCount > 0
                ? "✓ 保存済み"
                : saveLabel}
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
          {shareLabel}
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
      <p
        role="status"
        aria-live="polite"
        className={`export-status${statusOk ? " ok" : ""}`}
      >
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
            アプリでは「写真に保存」で写真アプリ（カメラロール）に直接保存します。「ファイルに保存 / 共有」と「印刷 / PDFとして保存」は共有画面から、ファイルへの保存・他のアプリへの送信・印刷ができます。
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
