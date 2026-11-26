import { mapBlocks, eventForDocument } from "../../studio/document";
import { newId } from "../../domain/workspace";
import { isStore } from "../../edition";
import type { Dispatch, SetStateAction } from "react";
import type { Workspace } from "../../domain/workspace";
import type {
  CreativeDocument,
  ContentBlock,
  Design,
} from "../../studio/document";
import { Field } from "./controls";
import type { DocumentMutator } from "./controls";
import { tr } from "../../i18n";
export function ContentPanel({
  doc,
  workspace,
  setWorkspace,
  navigate,
  mutate,
  setDesign,
  updateBlock,
  moveBlock,
}: {
  doc: CreativeDocument;
  workspace: Workspace;
  setWorkspace: Dispatch<SetStateAction<Workspace>>;
  navigate: (path: string) => void;
  mutate: DocumentMutator;
  setDesign: (patch: Partial<Design>) => void;
  updateBlock: (id: string, patch: Partial<ContentBlock>) => void;
  moveBlock: (index: number, direction: number) => void;
}) {
  const tab = "content";
  const boundEvent =
    doc.kind === "event-flyer"
      ? eventForDocument(doc, workspace.events)
      : undefined;
  return (
    <>
      {" "}
      {tab === "content" && doc.kind === "image-treatment" && (
        <p>{tr("「画像・加工」から元画像と仕上げを選んでください。元の画像にある文字の内容は変更しません。")}</p>
      )}
      {tab === "content" && doc.kind === "event-flyer" && boundEvent && (
        <>
          {/* The event editor it opens exists only in the personal app. */}
          <div className="studio-note" hidden={isStore}>
            <strong>{tr("イベントから作るチラシ")}</strong>
            <p>{tr("本文の出典と、このチラシだけの上書きを分けて保持します。")}</p>
            <button
              disabled={
                !workspace.events.some(
                  (event) =>
                    doc.kind === "event-flyer" && event.id === doc.eventId,
                )
              }
              onClick={() => {
                setWorkspace((s) => ({
                  ...s,
                  activeEventId: doc.eventId,
                }));
                navigate("/editor");
              }}
            >{tr("イベント自体を編集")}</button>
          </div>
          <label className="studio-field">
            <span>{tr("参照イベント")}</span>
            <select
              aria-label={tr("参照イベント")}
              value={doc.eventId}
              onChange={(e) => {
                const event = workspace.events.find(
                  (x) => x.id === e.target.value,
                )!;
                mutate(doc.id, (d) =>
                  d.kind === "event-flyer"
                    ? {
                        ...d,
                        eventId: event.id,
                        snapshot: structuredClone(event.eventData),
                      }
                    : d,
                );
              }}
            >
              {workspace.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
          <label className="studio-field">
            <span>{tr("イベントとの反映方法")}</span>
            <select
              aria-label={tr("イベントとの反映方法")}
              value={doc.contentBinding}
              onChange={(e) => {
                const binding = e.target.value as "linked" | "snapshot";
                mutate(doc.id, (d) =>
                  d.kind === "event-flyer"
                    ? {
                        ...d,
                        contentBinding: binding,
                        snapshot:
                          binding === "snapshot"
                            ? structuredClone(boundEvent)
                            : d.snapshot,
                      }
                    : d,
                );
              }}
            >
              <option value="linked">{tr("イベントの変更を反映する")}</option>
              <option value="snapshot">{tr("現在の内容を固定コピーにする")}</option>
            </select>
          </label>
          <Field
            label={tr("このチラシだけのタイトル")}
            value={doc.content.titleOverride ?? boundEvent.title}
            onChange={(titleOverride) =>
              mutate(doc.id, (d) =>
                d.kind === "event-flyer"
                  ? {
                      ...d,
                      content: { ...d.content, titleOverride },
                    }
                  : d,
              )
            }
          />
          <Field
            label={tr("このチラシだけのサブタイトル")}
            value={
              doc.content.subtitleOverride ??
              `${boundEvent.subtitle} ${boundEvent.volume}`
            }
            onChange={(subtitleOverride) =>
              mutate(doc.id, (d) =>
                d.kind === "event-flyer"
                  ? {
                      ...d,
                      content: { ...d.content, subtitleOverride },
                    }
                  : d,
              )
            }
          />
          <button
            onClick={() =>
              mutate(doc.id, (d) => {
                if (d.kind !== "event-flyer") return d;
                const content = { ...d.content };
                delete content.titleOverride;
                delete content.subtitleOverride;
                return { ...d, content };
              })
            }
          >{tr("イベントのタイトルに戻す")}</button>
          <fieldset className="visibility-options">
            <legend>{tr("載せる情報（非表示でも本文は保持）")}</legend>
            {(
              [
                ["schedule", tr("スケジュール")],
                ["times", tr("出演時刻")],
                ["openMic", "Open Mic"],
                ["notes", tr("注意書き")],
                ["performers", tr("出演者プロフィール")],
                ["socials", tr("SNS表示名")],
              ] as const
            )
              // The store app has no profile editor, so the switch appears only
              // when restored data actually contains profiles.
              .filter(
                ([id]) =>
                  id !== "performers" ||
                  !isStore ||
                  doc.design.visibility.performers ||
                  eventForDocument(doc, workspace.events).performers.length > 0,
              )
              .map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={doc.design.visibility[id] ?? true}
                  onChange={(e) =>
                    setDesign({
                      visibility: {
                        ...doc.design.visibility,
                        [id]: e.target.checked,
                      },
                    })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
        </>
      )}
      {tab === "content" && doc.kind === "free-flyer" && (
        <>
          <Field
            label={tr("チラシのタイトル")}
            value={doc.content.title}
            multiline
            onChange={(title) =>
              mutate(doc.id, (d) =>
                d.kind === "free-flyer"
                  ? { ...d, content: { ...d.content, title } }
                  : d,
              )
            }
          />
          <Field
            label={tr("サブタイトル")}
            value={doc.content.subtitle}
            onChange={(subtitle) =>
              mutate(doc.id, (d) =>
                d.kind === "free-flyer"
                  ? { ...d, content: { ...d.content, subtitle } }
                  : d,
              )
            }
            max={2000}
          />
          <Field
            label={tr("日時・料金など（任意）")}
            value={doc.content.facts}
            multiline
            onChange={(facts) =>
              mutate(doc.id, (d) =>
                d.kind === "free-flyer"
                  ? { ...d, content: { ...d.content, facts } }
                  : d,
              )
            }
            max={3000}
          />
        </>
      )}
      {tab === "content" && doc.kind !== "image-treatment" && (
        <section className="studio-blocks">
          <h2>{tr("自由な本文ブロック")}</h2>
          <p>{tr("本文欄・詳細欄を選び、順番と表示を調整できます。")}</p>
          {doc.content.blocks.map((block, i) => (
            <article className="block-editor" key={block.id}>
              <div className="action-row">
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={block.visible}
                    onChange={(e) =>
                      updateBlock(block.id, {
                        visible: e.target.checked,
                      })
                    }
                  />{tr("ブロック{0}を表示", i + 1)}</label>
                <button
                  aria-label={tr("ブロック{0}を上へ", i + 1)}
                  disabled={i === 0}
                  onClick={() => moveBlock(i, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label={tr("ブロック{0}を下へ", i + 1)}
                  disabled={i === doc.content.blocks.length - 1}
                  onClick={() => moveBlock(i, 1)}
                >
                  ↓
                </button>
              </div>
              <label className="studio-field">
                <span>{tr("ブロック{0}の配置先", i + 1)}</span>
                <select
                  aria-label={tr("ブロック{0}の配置先", i + 1)}
                  value={block.type}
                  onChange={(e) =>
                    updateBlock(block.id, {
                      type: e.target.value as ContentBlock["type"],
                    })
                  }
                >
                  <option value="text">{tr("本文欄")}</option>
                  <option value="heading">{tr("本文欄の見出し")}</option>
                  <option value="details">{tr("詳細欄")}</option>
                </select>
              </label>
              <Field
                label={tr("ブロック{0}の本文", i + 1)}
                value={block.text}
                multiline
                max={10000}
                onChange={(text) => updateBlock(block.id, { text })}
              />
              <button
                className="subtle"
                onClick={() => {
                  if (
                    window.confirm(
                      tr("このブロックを削除しますか？「取り消す」で戻せます。"),
                    )
                  )
                    mutate(doc.id, (d) =>
                      mapBlocks(d, (blocks) =>
                        blocks.filter((b) => b.id !== block.id),
                      ),
                    );
                }}
              >{tr("ブロックを削除")}</button>
            </article>
          ))}
          <button
            disabled={doc.content.blocks.length >= 30}
            onClick={() => {
              const block: ContentBlock = {
                id: newId(),
                type: "text",
                text: tr("新しい本文"),
                visible: true,
              };
              mutate(doc.id, (d) =>
                mapBlocks(d, (blocks) => [...blocks, block]),
              );
            }}
          >{tr("＋ 本文ブロックを追加")}</button>
        </section>
      )}
    </>
  );
}
