import type { RefObject } from "react";
import type {
  CreativeDocument,
  Placement,
  Treatment,
} from "../../studio/document";
import { Field, Range } from "./controls";
import type { DocumentMutator } from "./controls";
import { defaultPlacement, effects } from "../../studio/document";
import { LockBadge, useAccess } from "../../plan/LockBadge";
import { effectTier } from "../../plan/entitlements";
import { tr } from "../../i18n";
export function ImagePanel({
  doc,
  placement,
  setPlacement,
  setRecipe,
  compare,
  setCompare,
  imageInput,
  uploading,
  upload,
  mutate,
}: {
  doc: CreativeDocument;
  placement: Placement;
  setPlacement: (patch: Partial<Placement>) => void;
  setRecipe: (patch: Partial<Treatment>) => void;
  compare: boolean;
  setCompare: (value: boolean) => void;
  imageInput: RefObject<HTMLInputElement | null>;
  uploading: boolean;
  upload: (file: File) => Promise<void>;
  mutate: DocumentMutator;
}) {
  const access = useAccess();
  const tab = "image";
  return (
    <>
      {" "}
      {tab === "image" && (
        <>
          <div className="image-upload">
            <p className="studio-eyebrow">YOUR IMAGE, YOUR STORY</p>
            <h2>
              {doc.kind === "image-treatment" ? tr("加工する画像") : tr("メイン画像")}
            </h2>
            <p>
              PNG / JPEG / WebP
              <br />{tr("8MB・1600万画素・長辺8192px以内")}</p>
            <button
              disabled={uploading || doc.design.templateId === "legacy"}
              onClick={() => imageInput.current?.click()}
            >
              {uploading
                ? tr("読み込み中…")
                : doc.assetRefs.length
                  ? tr("画像を選び直す")
                  : tr("画像を選ぶ")}
            </button>
            <input
              type="file"
              hidden
              ref={imageInput}
              accept="image/png,image/jpeg,image/webp"
              aria-label={tr("チラシの画像ファイル")}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (file) void upload(file);
              }}
            />
            {doc.assetRefs.length > 0 && (
              <button
                className="subtle"
                onClick={() =>
                  mutate(
                    doc.id,
                    (d) =>
                      ({
                        ...d,
                        assetRefs: [],
                        ...(d.kind === "image-treatment"
                          ? {
                              content: {
                                ...d.content,
                                sourceAssetId: undefined,
                              },
                            }
                          : {}),
                      }) as CreativeDocument,
                  )
                }
              >{tr("この制作物から画像を外す")}</button>
            )}
            <small>{tr("画像は端末内に保存します。原本は上書きしません。")}</small>
          </div>
          {doc.kind === "image-treatment" && (
            <>
              <h2>{tr("レトロな仕上げ")}</h2>
              <p className="studio-note">{tr("色と印刷の質感を変える加工です。画像を描き直す生成AIではありません。強い網点や粒子は小さな文字を読みにくくするため、元画像と比較してください。")}</p>
              <div className="effect-grid">
                {access
                  .usableFirst(effects, (effect) => effectTier(effect.id))
                  .map((effect) => (
                  <button
                    key={effect.id}
                    aria-pressed={doc.content.recipe.preset === effect.id}
                    onClick={() => setRecipe({ preset: effect.id })}
                  >
                    <strong>{effect.label}</strong>
                    <small>{effect.description}</small>
                    <LockBadge need={effectTier(effect.id)} />
                  </button>
                ))}
              </div>
              <Range
                label={tr("加工の強さ")}
                value={doc.content.recipe.intensity}
                onChange={(intensity) => setRecipe({ intensity })}
              />
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={compare}
                  onChange={(e) => setCompare(e.target.checked)}
                />{tr("元画像と比較する")}</label>
              <button onClick={() => setRecipe({ intensity: 0, stamp: "" })}>{tr("元画像の見た目に戻す")}</button>
              <details className="advanced-options">
                <summary>{tr("印刷・フィルムの細かな調整")}</summary>
                {(
                  [
                    ["grain", tr("粒子")],
                    ["halftone", tr("網点")],
                    ["registration", tr("版ずれ")],
                    ["fade", tr("退色")],
                    ["warmth", tr("紙の温かさ")],
                    ["scratches", tr("擦れ")],
                    ["vignette", tr("周辺の陰影")],
                  ] as const
                ).map(([id, label]) => (
                  <Range
                    key={id}
                    label={label}
                    value={doc.content.recipe[id]}
                    onChange={(value) => setRecipe({ [id]: value })}
                  />
                ))}
                <Field
                  label={tr("日付スタンプ（任意の演出・空欄は非表示）")}
                  value={doc.content.recipe.stamp}
                  max={40}
                  onChange={(stamp) => setRecipe({ stamp })}
                />
              </details>
            </>
          )}
          {doc.design.templateId !== "legacy" && (
            <details className="advanced-options">
              <summary>{tr("画像・タイトルの配置を調整")}</summary>
              <p>{tr("このサイズだけの設定です。他のサイズの調整値も保持します。")}</p>
              <label className="studio-field">
                <span>{tr("画像の収め方")}</span>
                <select
                  aria-label={tr("画像の収め方")}
                  value={placement.fit}
                  onChange={(e) =>
                    setPlacement({
                      fit: e.target.value as "contain" | "cover",
                    })
                  }
                >
                  <option value="contain">{tr("画像全体を表示（余白あり）")}</option>
                  <option value="cover">{tr("枠いっぱい（端を切り抜く）")}</option>
                </select>
              </label>
              <Range
                label={tr("画像の左右位置")}
                value={placement.imageX}
                min={0}
                max={100}
                step={1}
                onChange={(imageX) => setPlacement({ imageX })}
              />
              <Range
                label={tr("画像の上下位置")}
                value={placement.imageY}
                min={0}
                max={100}
                step={1}
                onChange={(imageY) => setPlacement({ imageY })}
              />
              <Range
                label={tr("画像の拡大率")}
                value={placement.zoom}
                min={1}
                max={3}
                onChange={(zoom) => setPlacement({ zoom })}
              />
              <Range
                label={tr("画像の不透明度")}
                value={placement.opacity}
                min={0.1}
                onChange={(opacity) => setPlacement({ opacity })}
              />
              {doc.kind !== "image-treatment" && (
                <>
                  <Range
                    label={tr("タイトルの左右調整")}
                    value={placement.titleX}
                    min={-100}
                    max={100}
                    step={1}
                    onChange={(titleX) => setPlacement({ titleX })}
                  />
                  <Range
                    label={tr("タイトルの上下調整")}
                    value={placement.titleY}
                    min={-100}
                    max={100}
                    step={1}
                    onChange={(titleY) => setPlacement({ titleY })}
                  />
                </>
              )}
              <button
                onClick={() =>
                  setPlacement({
                    ...defaultPlacement,
                    ...(doc.kind === "image-treatment"
                      ? { fit: "contain" }
                      : {}),
                  })
                }
              >{tr("このサイズの配置を初期値に戻す")}</button>
            </details>
          )}
        </>
      )}
    </>
  );
}
