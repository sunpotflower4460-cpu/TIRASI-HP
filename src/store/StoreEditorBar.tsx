// The store app's editing toolbar: the few things used often are visible, the rest
// sit in one menu so the form starts near the top of the screen.
import { useRef } from "react";
import type { CreativeDocument } from "../studio/document";
import { Field } from "../components/Studio/controls";
import { Icon } from "./Icon";
import { storagePlace } from "../edition";
import { tr } from "../i18n";

type Props = {
  doc: CreativeDocument;
  docs: CreativeDocument[];
  saveStatus: string;
  canUndo: boolean;
  canRedo: boolean;
  onSelect: (id: string) => void;
  onRename: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onRepeat: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onCreate: (kind: CreativeDocument["kind"]) => void;
};

export function StoreEditorBar(props: Props) {
  const menu = useRef<HTMLDetailsElement>(null);
  const pick = (action: () => void) => () => {
    if (menu.current) menu.current.open = false;
    action();
  };
  const live = props.doc.kind === "event-flyer";
  return (
    <div className="store-editor-bar print-hidden">
      <div className="store-editor-title">
        <select aria-label={tr("制作物を選ぶ")} value={props.doc.id} onChange={(e) => props.onSelect(e.target.value)}>
          {props.docs.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <details className="store-menu" ref={menu}>
          <summary aria-label={tr("メニュー")}><Icon name="more" /></summary>
          <div className="store-menu-panel">
            <Field label={tr("制作物の名前")} value={props.doc.name} onChange={props.onRename} max={500} />
            <button type="button" onClick={pick(props.onDuplicate)}>{live ? tr("デザイン違いを作る（内容は共有）") : tr("複製する")}</button>
            <button type="button" onClick={pick(props.onPreview)}>{tr("下書きプレビュー")}</button>
            <p className="store-menu-label">{tr("新しく作る")}</p>
            <button type="button" onClick={pick(() => props.onCreate("event-flyer"))}>{tr("ライブのチラシ")}</button>
            <button type="button" onClick={pick(() => props.onCreate("free-flyer"))}>{tr("自由なチラシ")}</button>
            <button type="button" onClick={pick(() => props.onCreate("image-treatment"))}>{tr("画像の加工")}</button>
            <button type="button" className="danger" onClick={pick(props.onDelete)}>{tr("この制作物を削除")}</button>
          </div>
        </details>
      </div>
      <div className="store-tools">
        {live && (
          <button type="button" className="store-repeat" onClick={props.onRepeat}>
            <Icon name="sparkle" size={18} />{tr("次回分を作る")}</button>
        )}
        {/* The toolbar is narrow: "この端末に保存済み" is shortened, problems are not. */}
        <p className="store-saved" role="status" title={props.saveStatus}>
          {props.saveStatus === tr("{0}に保存済み", storagePlace) ? tr("保存済み") : props.saveStatus}
        </p>
        <button type="button" className="store-icon-button" aria-label={tr("取り消す")} disabled={!props.canUndo} onClick={props.onUndo}>
          <Icon name="undo" />
        </button>
        <button type="button" className="store-icon-button" aria-label={tr("やり直す")} disabled={!props.canRedo} onClick={props.onRedo}>
          <Icon name="redo" />
        </button>
      </div>
    </div>
  );
}
