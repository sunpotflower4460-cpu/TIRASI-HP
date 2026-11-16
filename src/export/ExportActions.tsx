import { useEffect, useRef, useState } from "react";
import { downloadBlob, safeFileName } from "./files";
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
  const [blob, setBlob] = useState<Blob>();
  const [light, setLight] = useState(false);
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
  const create = async () => {
    if (locked.current || errors.length) return;
    locked.current = true;
    const id = ++generation.current;
    setBusy(true);
    setBlob(undefined);
    setStatus("PNGを生成しています…");
    try {
      const result = await generate(light);
      if (id !== generation.current) return;
      setBlob(result);
      setStatus(
        "PNGの準備ができました。「PNGを保存」または「共有」を選んでください。",
      );
    } catch (error) {
      if (id === generation.current) setStatus(errorMessage(error));
    } finally {
      if (id === generation.current) {
        setBusy(false);
        locked.current = false;
      }
    }
  };
  const fileName = `${safeFileName(name)}${light ? "-light" : ""}.png`;
  const share = async () => {
    if (!blob || locked.current) return;
    const file = new File([blob], fileName, { type: "image/png" });
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
            : "共有できませんでした。「PNGを保存」をお使いください。",
        );
    } finally {
      if (id === generation.current) locked.current = false;
    }
  };
  const print = async () => {
    if (locked.current || errors.length) return;
    locked.current = true;
    const id = ++generation.current;
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
          onClick={create}
          disabled={busy || !!errors.length}
        >
          {busy ? "生成中…" : "PNGを生成"}
        </button>
        <button
          type="button"
          disabled={!blob || busy}
          onClick={() => {
            if (blob) {
              downloadBlob(blob, fileName);
              setStatus(
                "PNGのダウンロードを開始しました。端末の保存先をご確認ください。",
              );
            }
          }}
        >
          PNGを保存
        </button>
        <button type="button" disabled={!blob || busy} onClick={share}>
          共有
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
      </div>
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
      <p className="helper">
        高画質PNGの作業メモリ目安: 約{memoryEstimateMB}
        MB（端末や画像により増減）。
        {canPrint
          ? "動作が重い場合は軽量版を選んでください。"
          : "画像を小さくすると負荷を下げられます。"}
      </p>
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
      <p role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
