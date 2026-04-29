import type { EventRecord } from "../../hooks/useEventData";

type EventManagerProps = {
  eventRecords: EventRecord[];
  activeEventId: string;
  onSelectEvent: (eventId: string) => void;
  onCreateNewEvent: () => void;
  onDuplicateActiveEvent: () => void;
  onRenameActiveEvent: (name: string) => void;
  onDeleteActiveEvent: () => void;
};

export function EventManager({
  eventRecords,
  activeEventId,
  onSelectEvent,
  onCreateNewEvent,
  onDuplicateActiveEvent,
  onRenameActiveEvent,
  onDeleteActiveEvent
}: EventManagerProps) {
  const activeRecord = eventRecords.find((record) => record.id === activeEventId) ?? eventRecords[0];

  const handleDelete = () => {
    const shouldDelete = window.confirm("現在のイベントを削除しますか？削除するとこのブラウザ内のイベント一覧から消えます。");
    if (!shouldDelete) return;
    onDeleteActiveEvent();
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
          <button type="button" className="danger" onClick={handleDelete}>削除</button>
        </div>
      </div>

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
