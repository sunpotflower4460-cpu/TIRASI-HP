import { useEffect, useId, useRef, useState } from "react";
import type { NextLiveValues } from "../../studio/live";
import { weekday } from "../../domain/date";
import { Field } from "./controls";
import { displayDay, tr } from "../../i18n";

export function NextLiveDialog({
  initial,
  count,
  onCreate,
  onCancel,
}: {
  initial: NextLiveValues;
  count: number;
  onCreate: (values: NextLiveValues) => string | undefined;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="next-live-dialog"
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(onCreate(values) ?? "");
        }}
      >
        <p className="live-step-label">{tr("前回を残して、次の一枚へ")}</p>
        <h2 id={heading}>{tr("次回分を作る")}</h2>
        <p>{tr("会場・主催・料金・デザインはそのまま引き継ぎます。まず次回の日付を入れてください。")}</p>
        <label className="studio-field">
          <span>{tr("次回の開催日 {0}", values.date && tr("（{0}）", displayDay(weekday(values.date) ?? "")))}</span>
          <input
            type="date"
            aria-label={tr("次回の開催日")}
            required
            value={values.date}
            onChange={(event) =>
              setValues({ ...values, date: event.target.value })
            }
            autoFocus
          />
        </label>
        <div className="live-field-grid">
          <Field
            label={tr("次回のタイトル")}
            value={values.title}
            onChange={(title) => setValues({ ...values, title })}
          />
          <Field
            label={tr("次回の回数・vol.")}
            value={values.volume}
            onChange={(volume) => setValues({ ...values, volume })}
          />
        </div>
        <Field
          label={tr("次回の副題")}
          value={values.subtitle}
          onChange={(subtitle) => setValues({ ...values, subtitle })}
        />
        <label className="inline-check">
          <input
            type="checkbox"
            checked={values.keepLineup}
            onChange={(event) =>
              setValues({ ...values, keepLineup: event.target.checked })
            }
          />{tr("出演者{0}組と時刻も引き継ぐ", count)}</label>
        <p className="live-repeat-summary">
          {values.title} {values.subtitle} {values.volume}
        </p>
        {error && (
          <p role="alert" className="editor-warning">
            {error}
          </p>
        )}
        <div className="action-row">
          <button type="submit" className="primary">{tr("引き継いで作成")}</button>
          <button type="button" onClick={onCancel}>{tr("キャンセル")}</button>
        </div>
      </form>
    </dialog>
  );
}
