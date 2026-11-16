import { useEffect, useMemo, useRef, useState } from "react";
import type { CreativeDocument } from "../../studio/document";
import type { EventRecord } from "../../domain/workspace";
import { composeScene } from "../../studio/scene";
import { renderScene, scenePng } from "../../studio/render";
import type { RenderResult } from "../../studio/render";
import { renderTreatment } from "../../studio/treatment";
import { loadImages } from "../../studio/assets";
import { sizes } from "../../studio/registry";
import { errorMessage } from "../../domain/validation";
import { ExportActions } from "../../export/ExportActions";
import "../../styles/studio.css";
import { OnePageFlyer } from "../Flyer/OnePageFlyer";
import { getThemeClassName } from "../../data/themes";
function CanvasDocumentPreview({
  document: doc,
  events,
  thumbnail = false,
  showBefore = false,
}: {
  document: CreativeDocument;
  events: EventRecord[];
  thumbnail?: boolean;
  showBefore?: boolean;
}) {
  const scene = useMemo(() => composeScene(doc, events), [doc, events]);
  const size = sizes[doc.design.sizeId];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderGeneration = useRef(0);
  const [images, setImages] = useState<Map<string, ImageBitmap>>(new Map());
  const [assetError, setAssetError] = useState("");
  const [assetsReady, setAssetsReady] = useState(false);
  const [result, setResult] = useState<RenderResult>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const refs = doc.assetRefs.join("|");
  useEffect(() => {
    let cancelled = false;
    let loaded: Map<string, ImageBitmap> | undefined;
    setAssetsReady(false);
    setAssetError("");
    loadImages(doc.assetRefs)
      .then((value) => {
        loaded = value;
        if (cancelled) value.forEach((image) => image.close());
        else {
          setImages(value);
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
      loaded?.forEach((image) => image.close());
    };
  }, [refs]);
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
              thumbnail ? 220 : 1000,
              thumbnail
                ? Math.round((220 * size.height) / size.width)
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
    const generated =
      doc.kind === "image-treatment"
        ? renderTreatment(doc, images, false, light)
        : await renderScene(
            scene,
            images,
            Math.round(size.width * factor),
            Math.round(size.height * factor),
          );
    return scenePng(generated);
  };
  const print = async () => {
    const generation = renderGeneration.current;
    const generated =
      doc.kind === "image-treatment"
        ? renderTreatment(doc, images)
        : await renderScene(scene, images, size.width, size.height);
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
  };
  const errors = [
    assetError,
    error,
    ...(result?.errors ?? []),
    ...(!result && busy ? ["プレビューを準備しています。"] : []),
  ].filter(Boolean);
  return (
    <div className={`document-preview ${thumbnail ? "thumbnail" : ""}`}>
      {!thumbnail && (
        <ExportActions
          source={doc}
          name={doc.name}
          generate={generate}
          memoryEstimateMB={Math.ceil(
            ((size.width * size.height * 3 +
              [...images.values()].reduce(
                (pixels, image) => pixels + image.width * image.height,
                0,
              )) *
              4) /
              1024 /
              1024,
          )}
          canPrint={size.print}
          onPrint={print}
          sizeInfo={`${size.label} / PNG ${size.width}×${size.height}px${size.print ? "（300dpi相当）。印刷はブラウザでA4・倍率100%・余白なし・背景の印刷を選択。塗り足しなし。" : "。このサイズはPNG出力専用です。"}`}
          errors={errors}
        />
      )}
      <div
        className={`studio-paper ${size.print ? "print-a4" : "print-hidden"}`}
        style={{ aspectRatio: `${size.width}/${size.height}` }}
        aria-busy={busy}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${doc.name}の${showBefore ? "元画像" : "プレビュー"}`}
          data-testid={thumbnail ? "template-thumbnail" : "document-canvas"}
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
              .filter((n) => n.kind === "text")
              .map((n) => (
                <p key={n.id}>
                  <strong>{n.id}</strong>
                  <br />
                  {n.text}
                </p>
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
  const bound = events.find((event) => event.id === doc.eventId);
  const event =
    doc.contentBinding === "linked" && bound ? bound.eventData : doc.snapshot;
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
      <OnePageFlyer
        eventData={data}
        onPrint={() => window.print()}
        thumbnail={thumbnail}
        extraErrors={errors}
        visibility={doc.design.visibility}
        extraBlocks={doc.content.blocks}
      />
    </div>
  );
}
