import type React from "react";
import { onAssetsStored } from "../../storage/assetEvents";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CreativeDocument } from "../../studio/document";
import type { EventRecord } from "../../domain/workspace";
import { composeScene } from "../../studio/scene";
import { renderScene, scenePng } from "../../studio/render";
import type { RenderResult } from "../../studio/render";
import { renderTreatment } from "../../studio/treatment";
import { acquireImages, loadImages } from "../../studio/assets";
import type { ImageLease } from "../../studio/assets";
import { sizes } from "../../studio/registry";
import { errorMessage } from "../../domain/validation";
import { ExportActions } from "../../export/ExportActions";
import { useExportLock } from "../../plan/ExportLock";
import { isStore } from "../../edition";
import "../../styles/studio.css";
import { OnePageFlyer } from "../Flyer/OnePageFlyer";
import { getThemeClassName } from "../../data/themes";
import { eventForDocument } from "../../studio/document";
import { missingArtistNames } from "../../studio/live";
function CanvasDocumentPreview({
  document: doc,
  events,
  thumbnail = false,
  showBefore = false,
  peek = false,
}: {
  document: CreativeDocument;
  events: EventRecord[];
  thumbnail?: boolean;
  showBefore?: boolean;
  /** A thumbnail large enough to judge by: drawn sharper, with the trial mark. */
  peek?: boolean;
}) {
  const lock = useExportLock(doc);
  const scene = useMemo(() => composeScene(doc, events), [doc, events]);
  const size = sizes[doc.design.sizeId];
  const smallWidth = thumbnail ? (peek ? 640 : 320) : undefined;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderGeneration = useRef(0);
  const [images, setImages] = useState<Map<string, ImageBitmap>>(new Map());
  const [assetEpoch, setAssetEpoch] = useState(0);
  const [sourcePixels, setSourcePixels] = useState(0);
  const [assetError, setAssetError] = useState("");
  const [assetsReady, setAssetsReady] = useState(false);
  const [result, setResult] = useState<RenderResult>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const refs = JSON.stringify(doc.assetRefs);
  useEffect(
    () =>
      onAssetsStored((ids) => {
        if (ids.some((id) => doc.assetRefs.includes(id)))
          setAssetEpoch((value) => value + 1);
      }),
    [refs],
  );
  useEffect(() => {
    let cancelled = false;
    let loaded: ImageLease | undefined;
    setAssetsReady(false);
    setAssetError("");
    acquireImages(doc.assetRefs, thumbnail ? 256 : 1000)
      .then((value) => {
        loaded = value;
        if (cancelled) value.release();
        else {
          setImages(value.images);
          setSourcePixels(value.sourcePixels);
          setAssetsReady(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setImages(new Map());
          setAssetsReady(true);
          setAssetError(errorMessage(e));
        }
      });
    return () => {
      cancelled = true;
      loaded?.release();
    };
  }, [refs, thumbnail, assetEpoch]);
  useEffect(() => {
    let cancelled = false;
    renderGeneration.current++;
    setBusy(true);
    setError("");
    setResult(undefined);
    if (!assetsReady)
      return () => {
        cancelled = true;
      };
    const run = async () => {
      const rendered =
        doc.kind === "image-treatment"
          ? renderTreatment(doc, images, showBefore, false, true)
          : await renderScene(
              scene,
              images,
              smallWidth ?? 1000,
              smallWidth
                ? Math.round((smallWidth * size.height) / size.width)
                : Math.round(scene.height),
            );
      if (cancelled) return;
      const target = canvasRef.current;
      if (target) {
        target.width = rendered.canvas.width;
        target.height = rendered.canvas.height;
        target.getContext("2d")!.drawImage(rendered.canvas, 0, 0);
      }
      setResult(rendered);
      setBusy(false);
    };
    const timer = setTimeout(
      () =>
        void run().catch((e) => {
          if (!cancelled) {
            setError(errorMessage(e));
            setBusy(false);
          }
        }),
      thumbnail ? 60 : 20,
    );
    return () => {
      cancelled = true;
      renderGeneration.current++;
      clearTimeout(timer);
    };
  }, [scene, images, assetsReady, showBefore, thumbnail]);
  const generate = async (light: boolean) => {
    if (assetError || error || !assetsReady)
      throw new Error(assetError || error || "画像の読み込み中です。");
    const factor = light && doc.design.sizeId === "a4" ? 0.5 : 1;
    const originals = await loadImages(doc.assetRefs);
    try {
      const generated =
        doc.kind === "image-treatment"
          ? renderTreatment(doc, originals, false, light)
          : await renderScene(
              scene,
              originals,
              Math.round(size.width * factor),
              Math.round(size.height * factor),
            );
      return await scenePng(generated);
    } finally {
      originals.forEach((image) => image.close());
    }
  };
  const print = async () => {
    const generation = renderGeneration.current;
    const originals = await loadImages(doc.assetRefs);
    try {
      const generated =
        doc.kind === "image-treatment"
          ? renderTreatment(doc, originals)
          : await renderScene(scene, originals, size.width, size.height);
      if (generation !== renderGeneration.current)
        throw new Error(
          "編集内容が変わったため、印刷を中断しました。もう一度印刷ボタンを押してください。",
        );
      if (generated.errors.length) throw new Error(generated.errors.join("\n"));
      const target = canvasRef.current;
      if (!target) throw new Error("印刷用の紙面が見つかりません。");
      target.width = generated.canvas.width;
      target.height = generated.canvas.height;
      target.getContext("2d")!.drawImage(generated.canvas, 0, 0);
      window.print();
    } finally {
      originals.forEach((image) => image.close());
    }
  };
  const errors = [
    assetError,
    error,
    ...(result?.errors ?? []),
    ...(!result && busy ? ["プレビューを準備しています。"] : []),
  ].filter(Boolean);
  return (
    <div className={`document-preview ${thumbnail ? "thumbnail" : ""}`}>
      {!thumbnail && lock.notice}
      {!thumbnail && (
        <ExportActions
          guard={lock.guard}
          source={doc}
          name={doc.name}
          generate={generate}
          memoryEstimateMB={Math.ceil(
            ((size.width * size.height * 3 + sourcePixels) * 4) / 1024 / 1024,
          )}
          canPrint={size.print}
          onPrint={print}
          sizeInfo={`${size.label} / PNG ${size.width}×${size.height}px${size.print ? (isStore ? "（300dpi相当）。印刷は「印刷 / PDFとして保存」から。塗り足しなし。" : "（300dpi相当）。印刷はブラウザでA4・倍率100%・余白なし・背景の印刷を選択。塗り足しなし。") : "。このサイズはPNG出力専用です。"}`}
          errors={errors}
        />
      )}
      <div
        className={`studio-paper ${size.print ? "print-a4" : "print-hidden"}`}
        style={
          {
            aspectRatio: `${size.width}/${size.height}`,
            "--paper-ratio": size.width / size.height,
          } as React.CSSProperties
        }
        aria-busy={busy}
      >
        {(!thumbnail || peek) && lock.mark}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${doc.name}の${showBefore ? "元画像" : "プレビュー"}`}
          data-testid={
            peek
              ? "peek-canvas"
              : thumbnail
                ? "template-thumbnail"
                : "document-canvas"
          }
          data-errors={errors.length}
          data-measurements={JSON.stringify(result?.measurements ?? [])}
        />
      </div>
      {!thumbnail && (
        <>
          <p className="preview-caption print-hidden">
            {size.label} · {size.width} × {size.height}px ·{" "}
            {doc.kind === "image-treatment"
              ? "元画像を保持した非破壊加工"
              : "文字の収まりを自動確認"}
          </p>
          <details className="scene-text print-hidden">
            <summary>表示内容をテキストで読む</summary>
            {scene.nodes
              .flatMap((node) =>
                node.kind === "text"
                  ? [node]
                  : node.kind === "flow"
                    ? node.blocks
                    : [],
              )
              .map((n) => (
                <p key={n.id}>{n.text}</p>
              ))}
          </details>
        </>
      )}
    </div>
  );
}

export function DocumentPreview(props: {
  document: CreativeDocument;
  events: EventRecord[];
  thumbnail?: boolean;
  showBefore?: boolean;
  peek?: boolean;
}) {
  const doc = props.document;
  if (doc.design.templateId !== "legacy" || doc.kind !== "event-flyer")
    return <CanvasDocumentPreview {...props} />;
  return <LegacyDocumentPreview {...props} document={doc} />;
}
function LegacyDocumentPreview({
  document: doc,
  events,
  thumbnail,
}: {
  document: Extract<CreativeDocument, { kind: "event-flyer" }>;
  events: EventRecord[];
  thumbnail?: boolean;
}) {
  const lock = useExportLock(doc);
  const bound = events.find((event) => event.id === doc.eventId);
  const event = eventForDocument(doc, events);
  const data = useMemo(
    () => ({
      ...event,
      title: doc.content.titleOverride ?? event.title,
      subtitle: doc.content.subtitleOverride ?? event.subtitle,
      volume: doc.content.subtitleOverride === undefined ? event.volume : "",
      themeId: doc.design.paletteId,
      flyerOptions: {
        ...event.flyerOptions,
        showPerformerProfiles: doc.design.visibility.performers,
      },
    }),
    [event, doc],
  );
  const errors = doc.assetRefs.length
    ? [
        "旧版A4には画像枠がありません。画像を外すか、画像対応の新しい構図を選んでください。元画像は保持されています。",
      ]
    : [];
  if (doc.contentBinding === "linked" && !bound)
    errors.push(
      "参照イベントが見つかりません。固定コピーまたは別のイベントを選択してください。",
    );
  return (
    <div
      className={`legacy-document-preview ${getThemeClassName(doc.design.paletteId)} ${thumbnail ? "legacy-thumbnail" : ""}`}
    >
      {!thumbnail && lock.notice}
      {!thumbnail && lock.mark}
      <OnePageFlyer
        guard={lock.guard}
        eventData={data}
        onPrint={() => window.print()}
        thumbnail={thumbnail}
        extraErrors={[
          ...errors,
          ...(doc.design.visibility.schedule ? missingArtistNames(data) : []),
        ]}
        visibility={doc.design.visibility}
        extraBlocks={doc.content.blocks}
      />
    </div>
  );
}
