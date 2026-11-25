import type { Workspace } from "../../domain/workspace";
import { useState } from "react";
import type { CreativeDocument, Design } from "../../studio/document";
import {
  templates,
  legacyTemplate,
  palettes,
  sizes,
  templateById,
} from "../../studio/registry";
import type { Template, TemplateId, SizeId } from "../../studio/registry";
import { DocumentPreview } from "./DocumentPreview";
import { LockBadge, useAccess, useLockSuffix } from "../../plan/LockBadge";
import { paletteTier, sizeTier, templateTier } from "../../plan/entitlements";
import { isStore } from "../../edition";
export function DesignPanel({
  doc,
  workspace,
  family,
  setFamily,
  setDesign,
  chooseTemplate,
}: {
  doc: CreativeDocument;
  workspace: Workspace;
  family: string;
  setFamily: (value: string) => void;
  setDesign: (patch: Partial<Design>) => void;
  chooseTemplate: (id: TemplateId, useRecommendedPalette: boolean) => void;
}) {
  const [useRecommendedPalette, setUseRecommendedPalette] = useState(true);
  const lockSuffix = useLockSuffix();
  const access = useAccess();
  const paletteNeed = (p: (typeof palettes)[number]) =>
    paletteTier(p.id, doc.design.templateId);
  const orderedPalettes = access.usableFirst(palettes, paletteNeed);
  const orderedSizes = access.usableFirst(
    Object.entries(sizes),
    ([id]) => sizeTier(id as SizeId),
  );
  // The older venue layout belongs to the personal app only.
  const withLegacy = doc.kind === "event-flyer" && !isStore;
  const visibleTemplates = withLegacy
    ? [legacyTemplate, ...templates]
    : templates;
  const matchesFamily = (template: Template) =>
    family === "すべて" ||
    (family === "ライブ向け"
      ? ["旧版", "80年代", "音楽"].includes(template.family)
      : template.family === family);
  const previewFor = (template: Template): CreativeDocument => {
    const selected = template.id === doc.design.templateId;
    const paletteId =
      selected || !useRecommendedPalette
        ? doc.design.paletteId
        : template.palette;
    return {
      ...doc,
      design: {
        ...doc.design,
        templateId: template.id,
        ...(selected ? {} : { placements: {} }),
        paletteId:
          template.id === "legacy" &&
          !["spring", "summer", "autumn", "night"].includes(paletteId)
            ? "summer"
            : paletteId,
        ...(template.id === "legacy" ? { sizeId: "a4" } : {}),
      },
    };
  };
  if (doc.kind === "image-treatment")
    return (
      <>
        <label className="studio-field">
          <span>出力サイズ</span>
          <select
            aria-label="出力サイズ"
            value={doc.design.sizeId}
            onChange={(e) => setDesign({ sizeId: e.target.value as SizeId })}
          >
            {orderedSizes.map(([id, size]) => (
              <option
                key={id}
                value={id}
                disabled={doc.design.templateId === "legacy" && id !== "a4"}
              >
                {size.label} / {size.width}×{size.height}px
                {lockSuffix(sizeTier(id as SizeId))}
              </option>
            ))}
          </select>
        </label>
      </>
    );
  return (
    <>
      <div className="design-section design-pick">
        <h2 className="design-section-title">1. デザインを選ぶ</h2>
        <div className="design-filter-row">
          {isStore ? (
            <div
              className="family-chips"
              role="group"
              aria-label="デザインを絞り込む"
            >
              {[
                "すべて",
                ...(doc.kind === "event-flyer" ? ["ライブ向け"] : []),
                ...new Set(visibleTemplates.map((t) => t.family)),
              ].map((f) => (
                <button
                  type="button"
                  key={f}
                  aria-pressed={family === f}
                  onClick={() => setFamily(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          ) : (
          <label className="studio-field">
            <span>デザインを絞り込む</span>
            <select
              aria-label="デザインを絞り込む"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            >
              {[
                "すべて",
                ...(doc.kind === "event-flyer" ? ["ライブ向け"] : []),
                ...new Set(visibleTemplates.map((t) => t.family)),
              ].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          )}
          <label className="inline-check gallery-palette-choice">
            <input
              type="checkbox"
              checked={useRecommendedPalette}
              onChange={(event) =>
                setUseRecommendedPalette(event.target.checked)
              }
            />
            選ぶとおすすめの配色も適用
          </label>
        </div>
        <p className="gallery-count">
          {isStore ? "デザイン20種" : "新デザイン20種"}
          {withLegacy ? "＋旧版A4" : ""} ·{" "}
          {visibleTemplates.filter(matchesFamily).length}
          件表示
        </p>
        {(() => {
          const matching = visibleTemplates.filter(matchesFamily);
          const card = (t: Template) => (
            <button
              key={t.id}
              className={`template-card ${doc.design.templateId === t.id ? "selected" : ""}`}
              aria-pressed={doc.design.templateId === t.id}
              aria-label={`デザイン: ${t.label}`}
              onClick={() => chooseTemplate(t.id, useRecommendedPalette)}
            >
              <span className="template-thumb">
                <DocumentPreview
                  document={previewFor(t)}
                  events={workspace.events}
                  thumbnail
                />
                <LockBadge need={templateTier(t.id)} />
              </span>
              <span className="template-family">{t.family}</span>
              <strong>{t.label}</strong>
              <small>{t.description}</small>
            </button>
          );
          // The personal app has nothing to separate.
          if (!access.plan.gated)
            return (
              <div className="template-gallery">{matching.map(card)}</div>
            );
          const { usable, paid } = access.split(matching, (t) =>
            templateTier(t.id),
          );
          return (
            <>
              <h3 className="gallery-group">
                {access.plan.tier === "free"
                  ? "無料で使える"
                  : "使えるデザイン"}
                <span>{usable.length}</span>
              </h3>
              {usable.length ? (
                <div className="template-gallery">{usable.map(card)}</div>
              ) : (
                <p className="gallery-empty">
                  このカテゴリには、今のプランで使えるデザインがありません。
                </p>
              )}
              {paid.length > 0 && (
                <>
                  <h3 className="gallery-group paid">
                    有料プラン（お試しできます）<span>{paid.length}</span>
                  </h3>
                  <div className="template-gallery paid">{paid.map(card)}</div>
                </>
              )}
            </>
          );
        })()}
      </div>
      <div className="design-section">
        <h2 className="design-section-title">2. 色を整える</h2>
        <label className="studio-field">
          <span>配色（構図と独立して変更）</span>
          <select
            aria-label="配色（構図と独立して変更）"
            value={doc.design.paletteId}
            onChange={(e) => setDesign({ paletteId: e.target.value })}
          >
            {orderedPalettes
              .filter(
                (p) =>
                  doc.design.templateId !== "legacy" ||
                  ["spring", "summer", "autumn", "night"].includes(p.id),
              )
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {lockSuffix(paletteTier(p.id, doc.design.templateId))}
                </option>
              ))}
          </select>
        </label>
        <div className="palette-swatches" aria-label="配色の見本">
          {orderedPalettes
            .filter(
              (p) =>
                doc.design.templateId !== "legacy" ||
                ["spring", "summer", "autumn", "night"].includes(p.id),
            )
            .map((p) => (
              <button
                key={p.id}
                aria-label={`配色: ${p.label}`}
                title={`${p.label}${lockSuffix(paletteTier(p.id, doc.design.templateId))}`}
                aria-pressed={doc.design.paletteId === p.id}
                onClick={() => setDesign({ paletteId: p.id })}
                style={{
                  background: p.paper,
                  color: p.ink,
                  borderColor: p.accent,
                }}
              >
                <span style={{ background: p.accent }} />
                {lockSuffix(paletteTier(p.id, doc.design.templateId)) ? "🔒" : "Aa"}
              </button>
            ))}
        </div>
      </div>
      <div className="design-section">
        <h2 className="design-section-title">3. 出力サイズ</h2>
        <label className="studio-field">
          <span>出力サイズ</span>
          <select
            aria-label="出力サイズ"
            value={doc.design.sizeId}
            onChange={(e) => setDesign({ sizeId: e.target.value as SizeId })}
          >
            {orderedSizes.map(([id, size]) => (
              <option
                key={id}
                value={id}
                disabled={doc.design.templateId === "legacy" && id !== "a4"}
              >
                {size.label} / {size.width}×{size.height}px
                {lockSuffix(sizeTier(id as SizeId))}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details className="design-section design-more">
        <summary className="design-section-title">書体・装飾の調整</summary>
        <label className="studio-field">
          <span>見出しの書体</span>
          <select
            aria-label="見出しの書体"
            disabled={doc.design.templateId === "legacy"}
            value={doc.design.fontSet}
            onChange={(e) =>
              setDesign({
                fontSet: e.target.value as Design["fontSet"],
              })
            }
          >
            <option value="auto">デザインに合わせる</option>
            <option value="sans">すっきり / ゴシック</option>
            <option value="serif">落ち着き / セリフ</option>
            <option value="rounded">やわらか / 丸ゴシック優先</option>
          </select>
        </label>
        <label className="inline-check">
          <input
            type="checkbox"
            disabled={doc.design.templateId === "legacy"}
            checked={doc.design.decorations}
            onChange={(e) => setDesign({ decorations: e.target.checked })}
          />
          装飾を入れる
        </label>
      </details>
      <div className="studio-note">
        <strong>{templateById(doc.design.templateId).label}</strong>
        {doc.design.templateId === "legacy" && (
          <p>
            旧版はイベント用A4・従来の4配色に対応します。新しい20デザインはSNSを含む4サイズに対応しています。
          </p>
        )}
        <p>
          {templateById(doc.design.templateId).recommended}
          向け。情報量が多い場合は「インフォメーション」やA4を選んでください。
        </p>
      </div>
    </>
  );
}
