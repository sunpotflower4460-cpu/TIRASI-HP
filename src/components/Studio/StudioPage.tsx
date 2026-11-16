import { ContentPanel } from "./ContentPanel";
import { LivePanel } from "./LivePanel";
import { NextLiveDialog } from "./NextLiveDialog";
import {
  nextLiveValues,
  repeatLiveWorkspace,
  liveManagementName,
} from "../../studio/live";
import { restoreHistoryFrame } from "../../studio/history";
import type { HistoryFrame } from "../../studio/history";
import type { EventData } from "../../types/event";
import { eventCollectionsFit } from "../../domain/limits";
import { DesignPanel } from "./DesignPanel";
import { ImagePanel } from "./ImagePanel";
import { Field } from "./controls";
import { LayoutChangeDialog } from "./LayoutChangeDialog";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Workspace } from "../../domain/workspace";
import { newId, eventName } from "../../domain/workspace";
import type {
  CreativeDocument,
  Design,
  ContentBlock,
  Treatment,
} from "../../studio/document";
import {
  changeTemplate,
  createDocument,
  defaultPlacement,
  starters,
  mapBlocks,
} from "../../studio/document";
import { templateById, paletteById } from "../../studio/registry";
import type { TemplateId } from "../../studio/registry";
import { storeAsset } from "../../studio/assets";
import { errorMessage } from "../../domain/validation";
import { DocumentPreview } from "./DocumentPreview";
import { BackupPanel } from "./BackupPanel";
import "../../styles/studio.css";

type Props = {
  workspace: Workspace;
  setWorkspace: Dispatch<SetStateAction<Workspace>>;
  saveStatus: string;
  restoring?: boolean;
  restore: (
    value: Workspace,
    assets?: { id: string; blob: Blob }[],
  ) => Promise<void>;
  navigate: (path: string) => void;
};
export function StudioPage({
  workspace,
  setWorkspace,
  saveStatus,
  restoring,
  restore,
  navigate,
}: Props) {
  const currentWorkspace = useRef(workspace);
  currentWorkspace.current = workspace;
  const docs = workspace.documents;
  const doc = docs.find((d) => d.id === workspace.activeDocumentId) ?? docs[0];
  const activeEvent = workspace.events.find(
    (e) => e.id === workspace.activeEventId,
  )!;
  const [tab, setTab] = useState<"live" | "content" | "design" | "image">(
    "design",
  );
  const [family, setFamily] = useState("すべて");
  useEffect(() => {
    setFamily(doc?.kind === "event-flyer" ? "ライブ向け" : "すべて");
    setTab(
      doc?.kind === "event-flyer"
        ? "live"
        : doc?.kind === "image-treatment"
          ? "image"
          : "design",
    );
  }, [doc?.id, doc?.kind]);
  const [repeatSource, setRepeatSource] = useState<string>();
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [compare, setCompare] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<{
    id: TemplateId;
    paletteId?: string;
  }>();
  const [deletedDoc, setDeletedDoc] = useState<CreativeDocument>();
  const history = useRef(
    new Map<string, { undo: HistoryFrame[]; redo: HistoryFrame[] }>(),
  );
  const [, setHistoryVersion] = useState(0);
  const imageInput = useRef<HTMLInputElement>(null);
  const mutate = (
    id: string,
    fn: (d: CreativeDocument) => CreativeDocument,
    remember = true,
  ) => {
    const before = currentWorkspace.current.documents.find((d) => d.id === id);
    if (!before) return;
    const after = { ...fn(before), updatedAt: new Date().toISOString() };
    if (remember) {
      const h = history.current.get(id) ?? { undo: [], redo: [] };
      h.undo = [...h.undo.slice(-59), { document: structuredClone(before) }];
      h.redo = [];
      history.current.set(id, h);
      setHistoryVersion((v) => v + 1);
    }
    setWorkspace((s) => ({
      ...s,
      documents: s.documents.map((d) => (d.id === id ? after : d)),
    }));
  };
  const undo = (redo: boolean) => {
    if (!doc) return;
    const h = history.current.get(doc.id);
    if (!h) return;
    const from = redo ? h.redo : h.undo,
      to = redo ? h.undo : h.redo;
    const value = from[from.length - 1];
    if (!value) return;
    try {
      const state = currentWorkspace.current;
      const restored = restoreHistoryFrame(
        state,
        value,
        new Date().toISOString(),
      );
      const currentEvent = value.event
        ? state.events.find((event) => event.id === value.event!.id)
        : undefined;
      from.pop();
      to.push({
        document: structuredClone(doc),
        ...(currentEvent
          ? {
              event: structuredClone(currentEvent),
              expectedEvent: structuredClone(value.event),
            }
          : {}),
      });
      setWorkspace(restored);
      setHistoryVersion((v) => v + 1);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };
  const updateLiveEvent = (update: (event: EventData) => EventData) => {
    const current = currentWorkspace.current;
    const target = current.documents.find((value) => value.id === doc?.id);
    if (!target || target.kind !== "event-flyer") return;
    if (target.contentBinding === "snapshot") {
      const eventData = update(target.snapshot);
      if (eventCollectionsFit(eventData))
        mutate(target.id, (value) =>
          value.kind === "event-flyer"
            ? {
                ...value,
                name: liveManagementName(value, value.snapshot, eventData),
                snapshot: eventData,
              }
            : value,
        );
      return;
    }
    const record = current.events.find((value) => value.id === target.eventId);
    if (!record) {
      setNotice(
        "参照元が見つかりません。固定コピーに切り替えて編集してください。",
      );
      return;
    }
    const eventData = update(record.eventData);
    if (eventData === record.eventData || !eventCollectionsFit(eventData))
      return;
    const now = new Date().toISOString();
    const derivedName =
      record.name === eventName(record.eventData) ||
      record.name === eventName(record.eventData).slice(0, 500);
    const nextRecord = {
      ...record,
      eventData,
      updatedAt: now,
      name: derivedName ? eventName(eventData).slice(0, 500) : record.name,
    };
    const nextDocument = {
      ...target,
      name: liveManagementName(target, record.eventData, eventData),
      snapshot: structuredClone(eventData),
      updatedAt: now,
    };
    const h = history.current.get(target.id) ?? { undo: [], redo: [] };
    h.undo = [
      ...h.undo.slice(-59),
      {
        document: structuredClone(target),
        event: structuredClone(record),
        expectedEvent: structuredClone(nextRecord),
      },
    ];
    h.redo = [];
    history.current.set(target.id, h);
    setHistoryVersion((value) => value + 1);
    setWorkspace((state) => ({
      ...state,
      events: state.events.map((value) =>
        value.id === record.id ? nextRecord : value,
      ),
      documents: state.documents.map((value) =>
        value.id === target.id ? nextDocument : value,
      ),
    }));
  };
  const addDocument = (next: CreativeDocument) => {
    if (
      currentWorkspace.current.documents.some(
        (document) => document.id === next.id,
      )
    ) {
      setWorkspace((state) => ({ ...state, activeDocumentId: next.id }));
      setDeletedDoc(undefined);
      setNotice("この制作物はすでに復元されています。");
      return;
    }
    if (currentWorkspace.current.documents.length >= 100) {
      setNotice(
        "制作物は100件まで保存できます。バックアップしてから不要な制作物を削除してください。",
      );
      return;
    }
    setWorkspace((s) => ({
      ...s,
      documents: [...s.documents, next],
      activeDocumentId: next.id,
    }));
    setNotice("新しい下書きを作りました。公開HPは変更されません。");
    setFamily(next.kind === "event-flyer" ? "ライブ向け" : "すべて");
    setTab(
      next.kind === "event-flyer"
        ? "live"
        : next.kind === "image-treatment"
          ? "image"
          : "design",
    );
  };
  const create = (kind: CreativeDocument["kind"], starterId?: string) => {
    let next = createDocument(kind, activeEvent);
    const starter = starters.find((s) => s.id === starterId);
    if (next.kind === "free-flyer" && starter)
      next = {
        ...next,
        name: starter.label,
        design: {
          ...next.design,
          templateId: starter.template,
          paletteId: templateById(starter.template).palette,
        },
        content: {
          ...next.content,
          title: starter.title,
          subtitle: starter.subtitle,
          blocks: [
            { id: newId(), type: "text", visible: true, text: starter.text },
          ],
        },
      };
    addDocument(next);
  };
  const setDesign = (patch: Partial<Design>) => {
    if (doc)
      mutate(doc.id, (d) => ({ ...d, design: { ...d.design, ...patch } }));
  };
  const chooseTemplate = (id: TemplateId, useRecommendedPalette = true) => {
    if (!doc) return;
    const paletteId = useRecommendedPalette
      ? templateById(id).palette
      : undefined;
    if (id === doc.design.templateId) {
      if (paletteId && paletteId !== doc.design.paletteId)
        setDesign({ paletteId });
      return;
    }
    const moved = Object.values(doc.design.placements).some(
      (p) => p && JSON.stringify(p) !== JSON.stringify(defaultPlacement),
    );
    if (moved) setPendingTemplate({ id, paletteId });
    else
      mutate(doc.id, (d) => {
        const next = changeTemplate(d, id);
        return paletteId
          ? { ...next, design: { ...next.design, paletteId } }
          : next;
      });
  };
  const upload = async (file: File) => {
    if (!doc || uploading) return;
    const id = doc.id;
    setUploading(true);
    try {
      const asset = await storeAsset(file, file.name);
      mutate(
        id,
        (d) =>
          ({
            ...d,
            assetRefs: [asset.id],
            ...(d.kind === "image-treatment"
              ? { content: { ...d.content, sourceAssetId: asset.id } }
              : {}),
          }) as CreativeDocument,
      );
      setNotice(
        `「${file.name}」をこのブラウザに保存しました（${asset.width}×${asset.height}px）。`,
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setUploading(false);
    }
  };
  const updateBlock = (id: string, patch: Partial<ContentBlock>) => {
    if (doc)
      mutate(doc.id, (d) =>
        mapBlocks(d, (blocks) =>
          blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        ),
      );
  };
  const moveBlock = (index: number, direction: number) => {
    if (doc)
      mutate(doc.id, (d) => {
        if (d.kind === "image-treatment") return d;
        const blocks = [...d.content.blocks];
        const target = index + direction;
        if (target < 0 || target >= blocks.length) return d;
        [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
        return mapBlocks(d, () => blocks);
      });
  };
  const placement = doc?.design.placements[doc.design.sizeId] ?? {
    ...defaultPlacement,
    ...(doc?.kind === "image-treatment" ? { fit: "contain" as const } : {}),
  };
  const setPlacement = (patch: Partial<typeof placement>) => {
    if (doc)
      setDesign({
        placements: {
          ...doc.design.placements,
          [doc.design.sizeId]: { ...placement, ...patch },
        },
      });
  };
  const setRecipe = (patch: Partial<Treatment>) => {
    if (doc?.kind === "image-treatment")
      mutate(doc.id, (d) =>
        d.kind === "image-treatment"
          ? {
              ...d,
              content: {
                ...d.content,
                recipe: { ...d.content.recipe, ...patch },
              },
            }
          : d,
      );
  };
  const h = doc ? history.current.get(doc.id) : undefined;
  const tabs: [typeof tab, string][] =
    doc?.kind === "event-flyer"
      ? [
          ["live", "ライブ情報"],
          ["design", "デザイン"],
          ["image", "画像・配置"],
          ["content", "本文"],
        ]
      : [
          ["content", "本文"],
          ["design", "デザイン"],
          [
            "image",
            doc?.kind === "image-treatment" ? "画像・加工" : "画像・配置",
          ],
        ];
  const repeatDoc = docs.find((value) => value.id === repeatSource);
  const recentLive = [...docs]
    .filter((value) => value.kind === "event-flyer")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return (
    <main
      className={`studio-page${doc ? " has-document" : ""}`}
      inert={restoring}
    >
      <header className="studio-header">
        <div>
          <p className="studio-eyebrow">TIRASI / FLYER STUDIO</p>
          <h1>
            {!doc
              ? "ライブの告知を、いつもの手順で。"
              : doc.kind === "event-flyer"
                ? "ライブのチラシを編集"
                : doc.kind === "free-flyer"
                  ? "自由なチラシを編集"
                  : "手持ちの画像を加工"}
          </h1>
          <p>前回を引き継いで、日付と出演者を変えれば、次の一枚へ。</p>
        </div>
        <div className="studio-save">
          <span className="save-dot" />
          {saveStatus}
          <small>このブラウザだけの下書き</small>
        </div>
      </header>
      <section className="studio-create" aria-label="チラシの作り方">
        <button
          className="live-create-primary"
          onClick={() => create("event-flyer")}
        >
          <span>01 / EVENT</span>
          <strong>ライブのチラシを作る</strong>
          <small>いつものA4に、タイトル・日時・出演者を自動配置</small>
        </button>
        <button onClick={() => create("free-flyer")}>
          <span>02 / FREE</span>
          <strong>自由なチラシを作る</strong>
          <small>見出しと本文から、用途を選ばずに</small>
        </button>
        <button onClick={() => create("image-treatment")}>
          <span>03 / RETOUCH</span>
          <strong>手持ちの画像を加工する</strong>
          <small>元の文字・構図を保ったレトロ加工</small>
        </button>
      </section>
      {recentLive && doc?.kind !== "event-flyer" && (
        <div className="live-resume">
          <div>
            <strong>いつものライブから、次回分を。</strong>
            <p>{recentLive.name}</p>
          </div>
          <button
            className="primary"
            onClick={() => setRepeatSource(recentLive.id)}
          >
            前回から作る
          </button>
        </div>
      )}
      {!doc && (
        <details className="studio-empty live-other-starts">
          <summary>ライブ以外のチラシを、ひな形から作る</summary>
          <p>
            用途別の見本です。文章・価格・日時はご自身の内容に編集してください。
          </p>
          <div className="starter-grid">
            {starters.map((s) => (
              <button key={s.id} onClick={() => create("free-flyer", s.id)}>
                <span>{s.subtitle}</span>
                <strong>{s.label}</strong>
                <span>＋ チラシを作成</span>
              </button>
            ))}
          </div>
        </details>
      )}
      {doc && (
        <details className="starter-details print-hidden">
          <summary>用途別のチラシを新しく作る</summary>
          <div className="starter-grid">
            {starters.map((s) => (
              <button key={s.id} onClick={() => create("free-flyer", s.id)}>
                <span>{s.subtitle}</span>
                <strong>{s.label}</strong>
                <span>＋ チラシを作成</span>
              </button>
            ))}
          </div>
        </details>
      )}
      {doc && (
        <>
          <div className="studio-document-bar">
            <label>
              制作物を選ぶ
              <select
                aria-label="制作物を選ぶ"
                value={doc.id}
                onChange={(e) =>
                  setWorkspace((s) => ({
                    ...s,
                    activeDocumentId: e.target.value,
                  }))
                }
              >
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="action-row">
              {doc.kind === "event-flyer" && (
                <button
                  className="primary live-repeat-button"
                  onClick={() => setRepeatSource(doc.id)}
                >
                  次回分を作る
                </button>
              )}
              <button
                onClick={() =>
                  addDocument({
                    ...structuredClone(doc),
                    id: newId(),
                    name: `${doc.name} コピー`,
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                {doc.kind === "event-flyer" ? "デザイン違いを作る" : "複製"}
              </button>
              <button disabled={!h?.undo.length} onClick={() => undo(false)}>
                取り消す
              </button>
              <button disabled={!h?.redo.length} onClick={() => undo(true)}>
                やり直す
              </button>
              <button onClick={() => navigate(`/preview/document/${doc.id}`)}>
                下書きプレビュー
              </button>
              <button
                className="subtle"
                onClick={() => {
                  if (
                    window.confirm(
                      "この制作物を削除しますか？元画像とイベント本文は保持されます。",
                    )
                  ) {
                    setDeletedDoc(structuredClone(doc));
                    setWorkspace((s) => {
                      const documents = s.documents.filter(
                        (d) => d.id !== doc.id,
                      );
                      return {
                        ...s,
                        documents,
                        activeDocumentId: documents[0]?.id,
                      };
                    });
                  }
                }}
              >
                削除
              </button>
            </div>
          </div>
          <div className="studio-workbench">
            <section className="studio-inspector">
              <details
                className="live-management"
                open={doc.kind !== "event-flyer"}
              >
                <summary>管理名を変更</summary>
                <Field
                  label="制作物の管理名"
                  value={doc.name}
                  onChange={(name) => mutate(doc.id, (d) => ({ ...d, name }))}
                  max={500}
                />
              </details>
              <div
                className="studio-tabs"
                role="tablist"
                aria-label="編集する項目"
              >
                {tabs.map(([id, label]) => (
                  <button
                    key={id}
                    role="tab"
                    tabIndex={tab === id ? 0 : -1}
                    onKeyDown={(event) => {
                      if (
                        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          event.key,
                        )
                      )
                        return;
                      event.preventDefault();
                      const order = tabs.map(([key]) => key);
                      const index = order.indexOf(id);
                      const next =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? order.length - 1
                            : (index +
                                (event.key === "ArrowRight"
                                  ? 1
                                  : order.length - 1)) %
                              order.length;
                      setTab(order[next]);
                      event.currentTarget.parentElement
                        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                        [next]?.focus();
                    }}
                    aria-selected={tab === id}
                    aria-controls={`studio-panel-${id}`}
                    id={`studio-tab-${id}`}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={`studio-panel-${tab}`}
                aria-labelledby={`studio-tab-${tab}`}
              >
                {tab === "live" && doc.kind === "event-flyer" && (
                  <LivePanel
                    key={doc.id}
                    doc={doc}
                    workspace={workspace}
                    updateEvent={updateLiveEvent}
                    mutate={mutate}
                    setDesign={setDesign}
                  />
                )}
                {tab === "content" && (
                  <ContentPanel
                    doc={doc}
                    workspace={workspace}
                    setWorkspace={setWorkspace}
                    navigate={navigate}
                    mutate={mutate}
                    setDesign={setDesign}
                    updateBlock={updateBlock}
                    moveBlock={moveBlock}
                  />
                )}
                {tab === "design" && (
                  <DesignPanel
                    doc={doc}
                    workspace={workspace}
                    family={family}
                    setFamily={setFamily}
                    setDesign={setDesign}
                    chooseTemplate={chooseTemplate}
                  />
                )}
                {tab === "image" && (
                  <ImagePanel
                    doc={doc}
                    placement={placement}
                    setPlacement={setPlacement}
                    setRecipe={setRecipe}
                    compare={compare}
                    setCompare={setCompare}
                    imageInput={imageInput}
                    uploading={uploading}
                    upload={upload}
                    mutate={mutate}
                  />
                )}
              </div>
            </section>
            <aside className="studio-preview-panel" id="studio-preview">
              <div className="preview-heading">
                <p className="studio-eyebrow">LOCAL DRAFT / PREVIEW</p>
                <span>
                  {doc.kind === "image-treatment"
                    ? "加工後の画像"
                    : templateById(doc.design.templateId).label}{" "}
                  · {paletteById(doc.design.paletteId).label}
                </span>
              </div>
              {doc.kind === "image-treatment" && compare && (
                <div className="comparison-original">
                  <h3>元画像 / Before</h3>
                  <DocumentPreview
                    document={doc}
                    events={workspace.events}
                    thumbnail
                    showBefore
                  />
                  <p>
                    下のプレビューは加工後です。書き出しには加工後が使われます。
                  </p>
                </div>
              )}
              <DocumentPreview document={doc} events={workspace.events} />
            </aside>
          </div>
        </>
      )}
      {deletedDoc && (
        <div className="studio-alert">
          <p>「{deletedDoc.name}」を削除しました。</p>
          <button
            onClick={() => {
              addDocument(deletedDoc);
              setDeletedDoc(undefined);
            }}
          >
            削除を取り消す
          </button>
        </div>
      )}
      {pendingTemplate && doc && (
        <LayoutChangeDialog
          onKeep={() => {
            setDesign({ paletteId: templateById(pendingTemplate.id).palette });
            setPendingTemplate(undefined);
          }}
          onCopy={() => {
            const next = changeTemplate(
              structuredClone(doc),
              pendingTemplate.id,
            );
            addDocument({
              ...next,
              id: newId(),
              name: `${doc.name} / ${templateById(pendingTemplate.id).label}`,
              design: {
                ...next.design,
                ...(pendingTemplate.paletteId
                  ? { paletteId: pendingTemplate.paletteId }
                  : {}),
                placements: {},
              },
            });
            setPendingTemplate(undefined);
          }}
          onCancel={() => setPendingTemplate(undefined)}
        />
      )}
      {repeatDoc?.kind === "event-flyer" && (
        <NextLiveDialog
          key={repeatDoc.id}
          initial={nextLiveValues(repeatDoc, workspace.events)}
          count={
            (repeatDoc.contentBinding === "snapshot"
              ? repeatDoc.snapshot
              : (workspace.events.find(
                  (value) => value.id === repeatDoc.eventId,
                )?.eventData ?? repeatDoc.snapshot)
            ).schedule.filter((item) => item.type === "act").length
          }
          onCancel={() => setRepeatSource(undefined)}
          onCreate={(values) => {
            try {
              const next = repeatLiveWorkspace(
                currentWorkspace.current,
                repeatDoc.id,
                values,
                {
                  eventId: newId(),
                  documentId: newId(),
                  now: new Date().toISOString(),
                },
              );
              setWorkspace(next);
              setRepeatSource(undefined);
              setTab("live");
              setNotice(
                "前回を残して次回分を作りました。出演者や時刻を必要なところだけ変更してください。",
              );
              return undefined;
            } catch (error) {
              return errorMessage(error);
            }
          }}
        />
      )}

      <p
        className="studio-notice print-hidden"
        role="status"
        aria-live="polite"
      >
        {notice}
      </p>
      <BackupPanel
        workspace={workspace}
        restore={async (value, assets) => {
          await restore(value, assets);
          history.current.clear();
          setDeletedDoc(undefined);
          setPendingTemplate(undefined);
          setRepeatSource(undefined);
          setHistoryVersion((version) => version + 1);
        }}
      />
      <footer className="studio-footer print-hidden">
        <p>TIRASI STUDIO · ライブの一枚を、いつもの手順で。</p>
        <button onClick={() => navigate("/editor")}>イベント情報を編集</button>
        <button onClick={() => navigate("/")}>公開HPを見る</button>
      </footer>
    </main>
  );
}
