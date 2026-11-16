import { ContentPanel } from "./ContentPanel";
import { DesignPanel } from "./DesignPanel";
import { ImagePanel } from "./ImagePanel";
import { Field } from "./controls";
import { LayoutChangeDialog } from "./LayoutChangeDialog";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Workspace } from "../../domain/workspace";
import { newId } from "../../domain/workspace";
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
  const [tab, setTab] = useState<"content" | "design" | "image">("design");
  const [family, setFamily] = useState("すべて");
  useEffect(() => {
    setFamily("すべて");
  }, [doc?.kind]);
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [compare, setCompare] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<{
    id: TemplateId;
    paletteId?: string;
  }>();
  const [deletedDoc, setDeletedDoc] = useState<CreativeDocument>();
  const history = useRef(
    new Map<string, { undo: CreativeDocument[]; redo: CreativeDocument[] }>(),
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
      h.undo = [...h.undo.slice(-59), structuredClone(before)];
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
    const value = from.pop();
    if (!value) return;
    to.push(structuredClone(doc));
    mutate(doc.id, () => value, false);
    setHistoryVersion((v) => v + 1);
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
    setFamily("すべて");
    setTab(next.kind === "image-treatment" ? "image" : "design");
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
  return (
    <main className="studio-page" inert={restoring}>
      <header className="studio-header">
        <div>
          <p className="studio-eyebrow">TIRASI / FLYER STUDIO</p>
          <h1>伝えたいことを、一枚に。</h1>
          <p>ライブも、お店も、日々の小さなお知らせも。</p>
        </div>
        <div className="studio-save">
          <span className="save-dot" />
          {saveStatus}
          <small>このブラウザだけの下書き</small>
        </div>
      </header>
      <section className="studio-create" aria-label="チラシの作り方">
        <button onClick={() => create("event-flyer")}>
          <span>01 / EVENT</span>
          <strong>イベントチラシを作る</strong>
          <small>編集済みの日時・出演者・会場を使う</small>
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
      {!doc && (
        <section className="studio-empty">
          <p className="studio-eyebrow">START WITH A PURPOSE</p>
          <h2>作りたいものから、はじめる。</h2>
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
        </section>
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
                複製
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
              <Field
                label="制作物の管理名"
                value={doc.name}
                onChange={(name) => mutate(doc.id, (d) => ({ ...d, name }))}
                max={500}
              />
              <div
                className="studio-tabs"
                role="tablist"
                aria-label="編集する項目"
              >
                {(
                  [
                    ["content", "本文"],
                    ["design", "デザイン"],
                    [
                      "image",
                      doc.kind === "image-treatment"
                        ? "画像・加工"
                        : "画像・配置",
                    ],
                  ] as const
                ).map(([id, label]) => (
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
                      const order = ["content", "design", "image"] as const;
                      const index = order.indexOf(id);
                      const next =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? 2
                            : (index + (event.key === "ArrowRight" ? 1 : 2)) %
                              3;
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
          setHistoryVersion((version) => version + 1);
        }}
      />
      <footer className="studio-footer print-hidden">
        <p>TIRASI STUDIO · 端末内で、自由に。</p>
        <button onClick={() => navigate("/editor")}>イベント情報を編集</button>
        <button onClick={() => navigate("/")}>公開HPを見る</button>
      </footer>
    </main>
  );
}
