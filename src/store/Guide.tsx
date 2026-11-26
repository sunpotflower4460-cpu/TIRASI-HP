import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { tr } from "../i18n";
import "../styles/plan.css";

const steps: [IconName, string, string][] = [
  ["sparkle", tr("デザインを選ぶ"), tr("ホームの見本をタップすると、すぐ作り始められます。")],
  ["edit", tr("日時・出演者を入れる"), tr("入力した内容は、デザインに自動で配置されます。")],
  ["eye", tr("仕上がりを確認して保存"), tr("下の「仕上がり・保存」から、写真に保存・共有・印刷ができます。")],
];

/** A short how-to, shown on first launch and from the help button. */
export function Guide({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="plan-backdrop print-hidden">
      <div
        className="plan-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        tabIndex={-1}
        ref={dialog}
      >
        <header className="plan-header">
          <h2 id="guide-title">{tr("3ステップで完成")}</h2>
          <button type="button" className="plan-close" onClick={onClose}>{tr("閉じる")}</button>
        </header>
        <ol className="guide-steps">
          {steps.map(([icon, title, text], index) => (
            <li key={title}>
              <span className="guide-icon">
                <Icon name={icon} size={26} />
              </span>
              <div>
                <strong>
                  {index + 1}. {title}
                </strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="plan-fineprint">{tr("鍵のついたデザインも仕上がりを試せます。作ったデータは、この端末の中だけに保存します。")}</p>
        <button type="button" className="plan-buy" onClick={onClose}>{tr("はじめる")}</button>
      </div>
    </div>
  );
}
