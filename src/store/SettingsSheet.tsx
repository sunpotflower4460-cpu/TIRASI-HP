import { useEffect, useRef, useState } from "react";
import type { NewLiveMode } from "../studio/liveCreate";
import { readNewLiveMode, writeNewLiveMode } from "./settings";
import { Icon } from "./Icon";
import "../styles/plan.css";

const modes: [NewLiveMode, string, string][] = [
  ["separate", "別々にする（標準）", "直前の入力を引き継いで始めます。直しても、ほかのチラシは変わりません。"],
  ["share", "直前のライブと共有する", "同じライブの別デザインとして作ります。直すと、まとめて変わります。"],
  ["ask", "毎回えらぶ", "作るたびに、別々か共有かを選びます。"],
];

export function SettingsSheet({ onClose, onGuide }: { onClose: () => void; onGuide: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState(readNewLiveMode);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const choose = (next: NewLiveMode) => {
    setMode(next);
    setProblem(writeNewLiveMode(next) ? "" : "設定を保存できませんでした。端末の空き容量を確認してください。");
  };
  return (
    <div className="plan-backdrop print-hidden" onClick={onClose}>
      <div
        className="plan-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        ref={dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="plan-header">
          <h2 id="settings-title">設定</h2>
          <button type="button" className="plan-close" onClick={onClose}>
            閉じる
          </button>
        </header>
        <fieldset className="setting-group">
          <legend>新しいライブチラシの内容</legend>
          {modes.map(([value, label, text]) => (
            <label key={value} className={mode === value ? "selected" : ""}>
              <input
                type="radio"
                name="new-live-mode"
                value={value}
                checked={mode === value}
                onChange={() => choose(value)}
              />
              <span>
                <strong>{label}</strong>
                <small>{text}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <p role="status" className="plan-message">
          {problem}
        </p>
        <p className="plan-fineprint">
          「…」メニューの「デザイン違いを作る」は、この設定にかかわらず内容を共有します。共有中のチラシは、あとから別々にできます。
        </p>
        <button type="button" className="setting-link" onClick={onGuide}>
          <Icon name="help" />
          使い方を見る
          <Icon name="chevron" />
        </button>
      </div>
    </div>
  );
}
