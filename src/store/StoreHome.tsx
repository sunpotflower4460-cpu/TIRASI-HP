// The store app's start screen: choose a look (a real rendered sample), or pick up
// a flyer made earlier.
import { useMemo } from "react";
import { createDocument, starters } from "../studio/document";
import type { CreativeDocument } from "../studio/document";
import type { Workspace } from "../domain/workspace";
import { templateById, templates } from "../studio/registry";
import type { ModernTemplateId } from "../studio/registry";
import { DocumentPreview } from "../components/Studio/DocumentPreview";
import { LockBadge, useAccess } from "../plan/LockBadge";
import { templateTier } from "../plan/entitlements";
import { Icon } from "./Icon";
import { tr } from "../i18n";

/** Looks listed first within each group, because they show the range best. */
const preferred: ModernTemplateId[] = ["livehouse", "acoustic", "swiss", "botanical", "information", "citypop", "neon", "showa", "festival", "watercolor", "sticker"];
const order = (id: ModernTemplateId) => {
  const index = preferred.indexOf(id);
  return index < 0 ? preferred.length : index;
};
const lookIds = templates.map((template) => template.id as ModernTemplateId).sort((a, b) => order(a) - order(b));
/** How many looks to render per group: enough to choose from without slowing the start screen. */
const USABLE_SHOWN = 6;
const PAID_SHOWN = 6;
const kindName: Record<CreativeDocument["kind"], string> = {
  "event-flyer": tr("ライブ"),
  "free-flyer": tr("自由制作"),
  "image-treatment": tr("画像加工"),
};

type Props = {
  workspace: Workspace;
  onCreate: (kind: CreativeDocument["kind"], starterId?: string) => void;
  onCreateWithTemplate: (id: ModernTemplateId) => void;
  onOpen: (id: string) => void;
};

export function StoreHome({ workspace, onCreate, onCreateWithTemplate, onOpen }: Props) {
  const event = workspace.events.find((value) => value.id === workspace.activeEventId) ?? workspace.events[0];
  const access = useAccess();
  const groups = access.split(lookIds, templateTier);
  const usable = groups.usable.slice(0, USABLE_SHOWN);
  const paid = groups.paid.slice(0, PAID_SHOWN);
  const shown = [...usable, ...paid].join(",");
  const samples = useMemo(() => {
    const base = createDocument("event-flyer", event);
    return new Map(
      shown.split(",").map((id) => [
        id,
        {
          ...base,
          id: `sample-${id}`,
          design: { ...base.design, templateId: id as ModernTemplateId, paletteId: templateById(id).palette },
        } as CreativeDocument,
      ]),
    );
  }, [event, shown]);
  const look = (id: ModernTemplateId) => (
    <button type="button" key={id} className="store-look" aria-label={tr("このデザインで作る: {0}", templateById(id).label)} onClick={() => onCreateWithTemplate(id)}>
      <span className="store-thumb">
        <DocumentPreview document={samples.get(id)!} events={workspace.events} thumbnail />
        <LockBadge need={templateTier(id)} />
      </span>
      <strong>{templateById(id).label}</strong>
    </button>
  );
  const free = access.plan.tier === "free";
  const recent = [...workspace.documents]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return (
    <div className="store-home">
      <section className="store-hero">
        <p className="store-hero-kicker">{tr("写真に保存して、そのまま告知")}</p>
        <h1>{tr("ライブのチラシが")}<br />{tr("入力するだけで完成")}</h1>
        <ol className="store-flow" aria-label={tr("作り方の流れ")}>
          <li><b>1</b>{tr("デザインを選ぶ")}</li>
          <li><b>2</b>{tr("内容を入力")}</li>
          <li><b>3</b>{tr("保存・共有")}</li>
        </ol>
        <button type="button" className="store-cta" onClick={() => onCreate("event-flyer")}>
          <Icon name="plus" size={22} />{tr("ライブのチラシを作る")}</button>
      </section>

      {recent.length > 0 && (
        <section className="store-section" aria-labelledby="recent-title">
          <h2 id="recent-title">{tr("続きから")}</h2>
          <div className="store-strip">
            {recent.map((doc) => (
              <button type="button" key={doc.id} className="store-work" aria-label={tr("開く: {0}", doc.name)} onClick={() => onOpen(doc.id)}>
                <span className="store-thumb">
                  <DocumentPreview document={doc} events={workspace.events} thumbnail />
                </span>
                <strong>{doc.name}</strong>
                <small>{kindName[doc.kind]}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="store-section" aria-labelledby="looks-title">
        <h2 id="looks-title">
          {free ? tr("無料で使えるデザイン") : tr("使えるデザイン")}
          <span className="store-count">{groups.usable.length}</span>
        </h2>
        <p className="store-lead">{tr("タップすると、そのデザインで作り始めます。")}</p>
        <div className="store-grid">
          {usable.map(look)}
          {/* Fills the last place of the free set and says that there is more. */}
          {groups.paid.length > 0 && usable.length % 3 !== 0 && (
            <button type="button" className="store-more" aria-label={tr("ほかのデザイン {0}種を見る", groups.paid.length)} onClick={() => access.plan.openPaywall()}>
              <span>
                <b>+{groups.paid.length}</b><span className="store-more-text">{tr("ほかの\nデザイン")}</span></span>
            </button>
          )}
        </div>
      </section>

      {groups.paid.length > 0 && (
        <section className="store-section store-paid" aria-labelledby="paid-title">
          <div className="store-paid-head">
            <h2 id="paid-title">{tr("有料プランのデザイン")}<span className="store-count">{groups.paid.length}</span>
            </h2>
            <button type="button" onClick={() => access.plan.openPaywall()}>{tr("プランを見る")}</button>
          </div>
          <p className="store-lead">{tr("タップすると、仕上がりをお試しできます。")}</p>
          <div className="store-strip store-paid-strip">{paid.map(look)}</div>
        </section>
      )}

      <section className="store-section" aria-labelledby="other-title">
        <h2 id="other-title">{tr("ライブ以外も作れます")}</h2>
        <button type="button" className="store-row" onClick={() => onCreate("free-flyer")}>
          <span className="store-row-icon"><Icon name="text" size={22} /></span>
          <span><strong>{tr("自由なチラシを作る")}</strong><small>{tr("見出しと本文だけ。用途は自由")}</small></span>
          <Icon name="chevron" />
        </button>
        <button type="button" className="store-row" onClick={() => onCreate("image-treatment")}>
          <span className="store-row-icon"><Icon name="image" size={22} /></span>
          <span><strong>{tr("手持ちの画像を加工する")}</strong><small>{tr("文字と構図はそのまま、レトロな仕上げ")}</small></span>
          <Icon name="chevron" />
        </button>
        <div className="store-chips" aria-label={tr("ひな形から作る")}>
          {starters.map((starter) => (
            <button type="button" key={starter.id} onClick={() => onCreate("free-flyer", starter.id)}>
              {starter.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
