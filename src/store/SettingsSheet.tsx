import { useEffect, useRef, useState } from "react";
import type { NewLiveMode } from "../studio/liveCreate";
import { readNewLiveMode, writeNewLiveMode } from "./settings";
import { Icon } from "./Icon";
import { LicenseNotices, PrivacyPolicy } from "./LegalViews";
import { language, readLanguageChoice, resolveLanguage, tr, writeLanguageChoice } from "../i18n";
import type { LanguageChoice } from "../i18n";
import "../styles/plan.css";

const modes: [NewLiveMode, string, string][] = [
  ["separate", tr("別々にする（標準）"), tr("直前の入力を引き継いで始めます。直しても、ほかのチラシは変わりません。")],
  ["share", tr("直前のライブと共有する"), tr("同じライブの別デザインとして作ります。直すと、まとめて変わります。")],
  ["ask", tr("毎回えらぶ"), tr("作るたびに、別々か共有かを選びます。")],
];

export function SettingsSheet({ onClose, onGuide }: { onClose: () => void; onGuide: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState(readNewLiveMode);
  const [problem, setProblem] = useState("");
  const [view, setView] = useState<"main" | "privacy" | "licenses">("main");
  const title = view === "privacy" ? tr("プライバシーポリシー") : view === "licenses" ? tr("ライセンス表記") : tr("設定");
  const [languageChoice, setLanguageChoice] = useState(readLanguageChoice);
  // Names of languages are written in their own language so they can always be found.
  const languages: [LanguageChoice, string][] = [
    ["auto", tr("自動（端末の言語）")],
    ["ja", "日本語"],
    ["en", "English"],
  ];
  const chooseLanguage = (next: LanguageChoice) => {
    if (!writeLanguageChoice(next)) {
      setProblem(tr("設定を保存できませんでした。端末の空き容量を確認してください。"));
      return;
    }
    setLanguageChoice(next);
    // Every label is fixed when the app starts, so a different language needs a restart.
    if (resolveLanguage(next, window.navigator.languages) !== language) window.location.reload();
  };
  const show = (next: typeof view) => {
    setView(next);
    if (dialog.current) dialog.current.scrollTop = 0;
  };
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
    setProblem(writeNewLiveMode(next) ? "" : tr("設定を保存できませんでした。端末の空き容量を確認してください。"));
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
          <h2 id="settings-title">{title}</h2>
          {view === "main" ? (
            <button type="button" className="plan-close" onClick={onClose}>{tr("閉じる")}</button>
          ) : (
            <button type="button" className="plan-close" onClick={() => show("main")}>{tr("戻る")}</button>
          )}
        </header>
        {view === "privacy" && <PrivacyPolicy />}
        {view === "licenses" && <LicenseNotices />}
        {view === "main" && (
          <>
        <fieldset className="setting-group">
          <legend>{tr("新しいライブチラシの内容")}</legend>
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
        <p className="plan-fineprint">{tr("「…」メニューの「デザイン違いを作る」は、この設定にかかわらず内容を共有します。共有中のチラシは、あとから別々にできます。")}</p>
        <label className="setting-language">
          <span>言語 / Language</span>
          <select value={languageChoice} onChange={(event) => chooseLanguage(event.target.value as LanguageChoice)}>
            {languages.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="setting-link" onClick={onGuide}>
          <Icon name="help" />{tr("使い方を見る")}<Icon name="chevron" />
        </button>
        <button type="button" className="setting-link" onClick={() => show("privacy")}>
          <Icon name="check" />{tr("プライバシーポリシー")}<Icon name="chevron" />
        </button>
        <button type="button" className="setting-link" onClick={() => show("licenses")}>
          <Icon name="text" />{tr("ライセンス表記")}<Icon name="chevron" />
        </button>
          </>
        )}
      </div>
    </div>
  );
}
