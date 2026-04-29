import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { EventRecord } from "../../hooks/useEventData";
import { safeParseEventLibrary } from "../../hooks/useEventData";

type EventManagerProps = {
  eventRecords: EventRecord[];
  activeEventId: string;
  onSelectEvent: (eventId: string) => void;
  onCreateNewEvent: () => void;
  onDuplicateActiveEvent: () => void;
  onRenameActiveEvent: (name: string) => void;
  onDeleteActiveEvent: () => void;
  onReplaceEventLibrary: (records: EventRecord[]) => boolean;
};

function makeLibraryFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return `tirasi-event-library-${date}.json`;
}

export function EventManager({
  eventRecords,
  activeEventId,
  onSelectEvent,
  onCreateNewEvent,
  onDuplicateActiveEvent,
  onRenameActiveEvent,
  onDeleteActiveEvent,
  onReplaceEventLibrary
}: EventManagerProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState("");
  const activeRecord = eventRecords.find((record) => record.id === activeEventId) ?? eventRecords[0];

  const handleDelete = () => {
    const shouldDelete = window.confirm("現在のイベントを削除しますか？削除するとこのブラウザ内のイベント一覧から消えます。");
    if (!shouldDelete) return;
    onDeleteActiveEvent();
  };

  const exportLibrary = () => {
    const json = JSON.stringify(eventRecords, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = makeLibraryFileName();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setNotice("イベント一覧を書き出しました。");
  };

  const importLibrary = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = safeParseEventLibrary(String(reader.result));
        if (!parsed) {
          setNotice("読み込みに失敗しました。イベント一覧JSONの形式を確認してください。");
          return;
        }

        const shouldReplace = window.confirm("現在のイベント一覧を読み込んだ内容で置き換えますか？");
        if (!shouldReplace) return;

        const replaced = onReplaceEventLibrary(parsed);
        setNotice(replaced ? "イベント一覧を復元しました。" : "読み込みに失敗しました。");
      } catch {
        setNotice("読み込みに失敗しました。JSONファイルを確認してください。");
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  return (
    <section className="editor-card event-manager-card">
      <div className="card-heading">
        <div>
          <h2>イベント管理</h2>
          <p className="event-manager-note">vol.5を複製して、vol.6や次回イベントを作れます。</p>
        </div>
        <div className="event-manager-actions">
          <button type="button" onClick={onCreateNewEvent}>新規</button>
          <button type="button" onClick={onDuplicateActiveEvent}>複製</button>
          <button type="button" onClick={exportLibrary}>一覧保存</button>
          <button type="button" onClick={() => importInputRef.current?.click()}>一覧復元</button>
          <button type="button" className="danger" onClick={handleDelete}>削除</button>
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={importLibrary}
          />
        </div>
      </div>

      {notice ? <p className="editor-notice event-manager-notice">{notice}</p> : null}

      <div className="event-manager-grid">
        <label className="editor-field">
          <span>編集中のイベント</span>
          <select value={activeRecord?.id ?? ""} onChange={(event) => onSelectEvent(event.target.value)}>
            {eventRecords.map((record) => (
              <option value={record.id} key={record.id}>
                {record.name}
              </option>
            ))}
          </select>
        </label>

        <label className="editor-field">
          <span>イベント管理名</span>
          <input
            value={activeRecord?.name ?? ""}
            onChange={(event) => onRenameActiveEvent(event.target.value)}
            placeholder="例: 生音 vol.6"
          />
        </label>
      </div>
    </section>
  );
}
