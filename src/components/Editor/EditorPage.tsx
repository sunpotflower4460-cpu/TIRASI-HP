import { useRef, useState } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { EventData, ScheduleItem, SocialLink } from "../../types/event";
import { FlyerView } from "../Flyer/FlyerView";

type EditorPageProps = {
  eventData: EventData;
  setEventData: Dispatch<SetStateAction<EventData>>;
  resetEventData: () => void;
  hasCustomData: boolean;
  onOpenFlyer: () => void;
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
};

function Field({ label, value, onChange, multiline = false }: FieldProps) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function updateActItem(item: ScheduleItem, patch: Partial<Extract<ScheduleItem, { type: "act" }>>): ScheduleItem {
  if (item.type !== "act") return item;
  return { ...item, ...patch };
}

function updateLabelItem(item: ScheduleItem, label: string): ScheduleItem {
  if (item.type === "act") return item;
  return { ...item, label };
}

function isEventData(value: unknown): value is EventData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<EventData>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.subtitle === "string" &&
    typeof candidate.volume === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.day === "string" &&
    typeof candidate.startTime === "string" &&
    Array.isArray(candidate.schedule) &&
    Boolean(candidate.openMic) &&
    Boolean(candidate.venue) &&
    Array.isArray(candidate.socials)
  );
}

function makeExportFileName(eventData: EventData) {
  const safeTitle = `${eventData.title}-${eventData.volume}`.replace(/[\\/:*?"<>|\s]+/g, "-");
  return `${safeTitle || "event-flyer"}.json`;
}

export function EditorPage({
  eventData,
  setEventData,
  resetEventData,
  hasCustomData,
  onOpenFlyer
}: EditorPageProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<string>("");

  const actCount = eventData.schedule.filter((item) => item.type === "act").length;
  const hasA4Warning = eventData.schedule.length >= 8 || actCount >= 7;

  const updateRoot = (patch: Partial<EventData>) => {
    setEventData((current) => ({ ...current, ...patch }));
  };

  const updateOpenMic = (patch: Partial<EventData["openMic"]>) => {
    setEventData((current) => ({
      ...current,
      openMic: { ...current.openMic, ...patch }
    }));
  };

  const updateVenue = (patch: Partial<EventData["venue"]>) => {
    setEventData((current) => ({
      ...current,
      venue: { ...current.venue, ...patch }
    }));
  };

  const updateScheduleItem = (index: number, nextItem: ScheduleItem) => {
    setEventData((current) => ({
      ...current,
      schedule: current.schedule.map((item, itemIndex) => (itemIndex === index ? nextItem : item))
    }));
  };

  const moveScheduleItem = (index: number, direction: -1 | 1) => {
    setEventData((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.schedule.length) return current;

      const nextSchedule = [...current.schedule];
      const currentItem = nextSchedule[index];
      nextSchedule[index] = nextSchedule[nextIndex];
      nextSchedule[nextIndex] = currentItem;

      return { ...current, schedule: nextSchedule };
    });
  };

  const addAct = () => {
    setEventData((current) => ({
      ...current,
      schedule: [...current.schedule, { type: "act", time: "18:10 - 18:30", name: "新しい出演者" }]
    }));
  };

  const removeScheduleItem = (index: number) => {
    const shouldRemove = window.confirm("このスケジュール項目を削除しますか？");
    if (!shouldRemove) return;

    setEventData((current) => ({
      ...current,
      schedule: current.schedule.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const updateSocial = (index: number, patch: Partial<SocialLink>) => {
    setEventData((current) => ({
      ...current,
      socials: current.socials.map((social, socialIndex) =>
        socialIndex === index ? { ...social, ...patch } : social
      )
    }));
  };

  const addSocial = () => {
    setEventData((current) => ({
      ...current,
      socials: [...current.socials, { label: "new-account", url: "https://www.instagram.com/" }]
    }));
  };

  const removeSocial = (index: number) => {
    const shouldRemove = window.confirm("このSNSリンクを削除しますか？");
    if (!shouldRemove) return;

    setEventData((current) => ({
      ...current,
      socials: current.socials.filter((_, socialIndex) => socialIndex !== index)
    }));
  };

  const handleReset = () => {
    const shouldReset = window.confirm("編集内容をすべて初期値に戻しますか？このブラウザに保存された内容も消えます。");
    if (!shouldReset) return;

    resetEventData();
    setNotice("初期データに戻しました。");
  };

  const downloadEventJson = () => {
    const json = JSON.stringify(eventData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = makeExportFileName(eventData);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setNotice("JSONを書き出しました。");
  };

  const importEventJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isEventData(parsed)) {
          setNotice("読み込みに失敗しました。イベントJSONの形式を確認してください。");
          return;
        }

        setEventData(parsed);
        setNotice("JSONからイベント内容を読み込みました。");
      } catch {
        setNotice("読み込みに失敗しました。JSONファイルを確認してください。");
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  return (
    <main className="editor-page">
      <section className="editor-panel">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Editable Flyer</p>
            <h1>チラシ内容を編集</h1>
            <p>入力した内容はこのブラウザに保存され、HP表示とA4チラシに反映されます。</p>
          </div>

          <div className="editor-actions">
            <button type="button" onClick={onOpenFlyer}>A4を見る</button>
            <button type="button" onClick={downloadEventJson}>JSON保存</button>
            <button type="button" onClick={() => importInputRef.current?.click()}>JSON読込</button>
            <button type="button" className="ghost" onClick={handleReset}>
              初期値に戻す
            </button>
            <input
              ref={importInputRef}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              onChange={importEventJson}
            />
          </div>
        </div>

        <p className="save-status">
          {hasCustomData ? "編集内容を保存中です。" : "現在は初期データを表示しています。"}
        </p>

        {notice ? <p className="editor-notice">{notice}</p> : null}

        {hasA4Warning ? (
          <div className="editor-warning">
            <strong>A4注意:</strong> スケジュール項目が多いため、印刷時に下部が詰まる可能性があります。A4画面で収まりを確認してください。
          </div>
        ) : null}

        <section className="editor-card">
          <h2>基本情報</h2>
          <div className="editor-grid">
            <Field label="上部サブタイトル" value={eventData.venueSubtitle} onChange={(value) => updateRoot({ venueSubtitle: value })} />
            <Field label="イベント名" value={eventData.title} onChange={(value) => updateRoot({ title: value })} />
            <Field label="サブタイトル" value={eventData.subtitle} onChange={(value) => updateRoot({ subtitle: value })} />
            <Field label="vol" value={eventData.volume} onChange={(value) => updateRoot({ volume: value })} />
            <Field label="日付" value={eventData.date} onChange={(value) => updateRoot({ date: value })} />
            <Field label="曜日" value={eventData.day} onChange={(value) => updateRoot({ day: value })} />
            <Field label="開始時間" value={eventData.startTime} onChange={(value) => updateRoot({ startTime: value })} />
            <Field label="料金" value={eventData.price} onChange={(value) => updateRoot({ price: value })} />
          </div>
          <Field label="企画名" value={eventData.organizer} onChange={(value) => updateRoot({ organizer: value })} />
          <Field label="注意書き" value={eventData.statusNote} onChange={(value) => updateRoot({ statusNote: value })} multiline />
        </section>

        <section className="editor-card">
          <div className="card-heading">
            <h2>タイムスケジュール</h2>
            <button type="button" onClick={addAct}>出演者を追加</button>
          </div>

          <div className="schedule-editor-list">
            {eventData.schedule.map((item, index) => (
              <div className="schedule-editor-item" key={`${item.type}-${index}`}>
                <select
                  value={item.type}
                  onChange={(event) => {
                    const type = event.target.value as ScheduleItem["type"];
                    if (type === "act") updateScheduleItem(index, { type: "act", time: "00:00 - 00:00", name: "出演者名" });
                    if (type === "break") updateScheduleItem(index, { type: "break", label: "休憩" });
                    if (type === "end") updateScheduleItem(index, { type: "end", label: "- 企画終了 -" });
                  }}
                >
                  <option value="act">出演</option>
                  <option value="break">休憩</option>
                  <option value="end">終了</option>
                </select>

                {item.type === "act" ? (
                  <>
                    <input
                      value={item.time}
                      onChange={(event) => updateScheduleItem(index, updateActItem(item, { time: event.target.value }))}
                      aria-label="出演時間"
                    />
                    <input
                      value={item.name}
                      onChange={(event) => updateScheduleItem(index, updateActItem(item, { name: event.target.value }))}
                      aria-label="出演者名"
                    />
                  </>
                ) : (
                  <input
                    value={item.label}
                    onChange={(event) => updateScheduleItem(index, updateLabelItem(item, event.target.value))}
                    aria-label="表示文"
                  />
                )}

                <div className="row-actions">
                  <button type="button" onClick={() => moveScheduleItem(index, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button type="button" onClick={() => moveScheduleItem(index, 1)} disabled={index === eventData.schedule.length - 1}>
                    ↓
                  </button>
                  <button type="button" className="danger" onClick={() => removeScheduleItem(index)}>
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="editor-card">
          <h2>Open Mic</h2>
          <div className="editor-grid">
            <Field label="タイトル" value={eventData.openMic.title} onChange={(value) => updateOpenMic({ title: value })} />
            <Field label="時間" value={eventData.openMic.time} onChange={(value) => updateOpenMic({ time: value })} />
            <Field label="ラストオーダー" value={eventData.openMic.lastOrder} onChange={(value) => updateOpenMic({ lastOrder: value })} />
            <Field label="見出し" value={eventData.openMic.headline} onChange={(value) => updateOpenMic({ headline: value })} />
          </div>
          <Field label="注意書き" value={eventData.openMic.note} onChange={(value) => updateOpenMic({ note: value })} />
          <Field label="撤収時間" value={eventData.openMic.closeNote} onChange={(value) => updateOpenMic({ closeNote: value })} />
        </section>

        <section className="editor-card">
          <h2>会場</h2>
          <Field label="会場名" value={eventData.venue.name} onChange={(value) => updateVenue({ name: value })} />
          <Field label="住所" value={eventData.venue.address} onChange={(value) => updateVenue({ address: value })} />
          <Field label="URL" value={eventData.venue.url} onChange={(value) => updateVenue({ url: value })} />
        </section>

        <section className="editor-card">
          <div className="card-heading">
            <h2>SNSリンク</h2>
            <button type="button" onClick={addSocial}>SNSを追加</button>
          </div>
          {eventData.socials.map((social, index) => (
            <div className="social-editor-item" key={`${social.label}-${index}`}>
              <input value={social.label} onChange={(event) => updateSocial(index, { label: event.target.value })} />
              <input value={social.url} onChange={(event) => updateSocial(index, { url: event.target.value })} />
              <button type="button" className="danger" onClick={() => removeSocial(index)}>
                削除
              </button>
            </div>
          ))}
        </section>
      </section>

      <aside className="editor-preview">
        <FlyerView eventData={eventData} variant="web" onEdit={() => undefined} onPrint={() => window.print()} />
      </aside>
    </main>
  );
}
