import { useEffect, useId, useRef, useState } from "react";
import type { NextLiveValues } from "../../studio/live";
import { weekday } from "../../domain/date";
import { Field } from "./controls";

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
        <p className="live-step-label">前回を残して、次の一枚へ</p>
        <h2 id={heading}>次回分を作る</h2>
        <p>
          会場・主催・料金・デザインはそのまま引き継ぎます。まず次回の日付を入れてください。
        </p>
        <label className="studio-field">
          <span>
            次回の開催日 {values.date && `（${weekday(values.date) ?? ""}）`}
          </span>
          <input
            type="date"
            aria-label="次回の開催日"
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
            label="次回のタイトル"
            value={values.title}
            onChange={(title) => setValues({ ...values, title })}
          />
          <Field
            label="次回の回数・vol."
            value={values.volume}
            onChange={(volume) => setValues({ ...values, volume })}
          />
        </div>
        <Field
          label="次回の副題"
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
          />
          出演者{count}組と時刻も引き継ぐ
        </label>
        <p className="live-repeat-summary">
          {values.title} {values.subtitle} {values.volume}
        </p>
        {error && (
          <p role="alert" className="editor-warning">
            {error}
          </p>
        )}
        <div className="action-row">
          <button type="submit" className="primary">
            引き継いで作成
          </button>
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </form>
    </dialog>
  );
}
