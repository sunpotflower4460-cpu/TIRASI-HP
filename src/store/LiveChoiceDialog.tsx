// Asks, before a second live flyer is made, whether its content should be
// separate or shared. Nothing is created until the person picks one.
import { useEffect, useRef } from "react";
import type { LiveChoice, LiveSource } from "../studio/liveCreate";
import { Icon } from "./Icon";
import "../styles/plan.css";

type Props = {
  sources: LiveSource[];
  onChoose: (choice: LiveChoice) => void;
  onCancel: () => void;
};

export function LiveChoiceDialog({ sources, onChoose, onCancel }: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="plan-backdrop print-hidden" onClick={onCancel}>
      <div
        className="plan-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-choice-title"
        tabIndex={-1}
        ref={dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="plan-header">
          <h2 id="live-choice-title">内容はどうしますか？</h2>
          <button type="button" className="plan-close" onClick={onCancel}>
            やめる
          </button>
        </header>
        <button type="button" className="choice-main" onClick={() => onChoose({ kind: "new" })}>
          <span className="choice-icon">
            <Icon name="plus" size={26} />
          </span>
          <span>
            <strong>別のライブとして作る</strong>
            <small>内容は別々です。直前の入力を引き継いで始めます。</small>
          </span>
        </button>
        <section className="choice-share" aria-labelledby="live-share-title">
          <h3 id="live-share-title">同じライブの別デザインを作る</h3>
          <p>内容を共有します。タイトルや出演者を直すと、まとめて変わります。</p>
          <ul>
            {sources.map((source) => (
              <li key={source.eventId}>
                <button type="button" onClick={() => onChoose({ kind: "share", eventId: source.eventId })}>
                  <span>
                    <strong>{source.title || "名前のないライブ"}</strong>
                    <small>
                      {source.date ? `${source.date}・` : ""}チラシ{source.count}枚
                    </small>
                  </span>
                  <Icon name="chevron" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Shown above the live form when editing it changes other flyers too. */
export function SharedLiveNotice({ count, onDetach }: { count: number; onDetach: () => void }) {
  return (
    <div className="shared-notice">
      <p>
        この内容は、<strong>ほかの{count}枚と共有中</strong>です。直すと、まとめて変わります。
      </p>
      <button type="button" onClick={onDetach}>
        このチラシだけ別にする
      </button>
    </div>
  );
}
