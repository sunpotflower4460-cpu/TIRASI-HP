import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { EventRecord } from "../../hooks/useEventData";
import { parseLibrary } from '../../domain/workspace';
import { errorMessage, readJsonFile } from '../../domain/validation';
import { MAX_EVENTS } from '../../domain/limits';

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
  const [pending, setPending] = useState<EventRecord[]>();
  const [notice, setNotice] = useState("");
  const activeRecord = eventRecords.find((record) => record.id === activeEventId) ?? eventRecords[0];

  const handleDelete = () => {
    const shouldDelete = window.confirm("現在のイベントを削除しますか？削除するとこのブラウザ内のイベント一覧から消えます。");
    if (!shouldDelete) return;
    onDeleteActiveEvent();
  };

  const exportLibrary = () => {
    const json = JSON.stringify({ schemaVersion: 2, kind: "event-library", records: eventRecords }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = makeLibraryFileName();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    setNotice("イベント一覧を書き出しました。");
  };

  const importLibrary = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    try { setPending(parseLibrary(await readJsonFile(file))); setNotice('全件の形式を確認しました。読み込み方法を選んでください。'); }
    catch (error) { setNotice(errorMessage(error)); }
  };
  const applyImport = (merge: boolean) => {
    if (!pending) return;
    const records = merge ? [...eventRecords, ...pending.map(r => ({ ...r, id: crypto.randomUUID() }))] : pending;
    if (records.length > MAX_EVENTS) { setNotice(`イベントは${MAX_EVENTS}件までです。追加するには不要なイベントを削除するか、一覧を置き換えてください。`); return; }
    try {
      if (onReplaceEventLibrary(records)) { setPending(undefined); setNotice('イベント一覧を復元しました。'); }
    } catch (error) { setNotice(errorMessage(error)); }
  };

  return (
    <section className="editor-card event-manager-card">
      <div className="card-heading">
        <div>
          <h2>イベント管理</h2>
          <p className="event-manager-note">現在のイベントを複製して、次のチラシを作れます。公開イベントは切り替わりません。</p>
        </div>
        <div className="event-manager-actions">
          <button type="button" onClick={onCreateNewEvent} disabled={eventRecords.length >= MAX_EVENTS}>新規</button>
          <button type="button" onClick={onDuplicateActiveEvent} disabled={eventRecords.length >= MAX_EVENTS}>複製</button>
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
      {eventRecords.length >= MAX_EVENTS && <p role="status">イベントは{MAX_EVENTS}件までです。追加するには不要なイベントを削除してください。</p>}

      {notice ? <p role="status" className="editor-notice event-manager-notice">{notice}</p> : null}

      {pending && <div className="editor-warning"><h3>イベント一覧を読み込み</h3><p>現在{eventRecords.length}件 / 読み込むデータ{pending.length}件</p><ul>{pending.map(r => <li key={r.id}>{r.name} / {r.eventData.date}</li>)}</ul><button onClick={() => applyImport(true)}>一覧に追加</button><button onClick={() => { if (window.confirm('現在の一覧を置き換えますか？事前に一覧保存をおすすめします。')) applyImport(false); }}>一覧を置き換える</button><button onClick={() => setPending(undefined)}>キャンセル</button></div>}
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
