import { useRef, useState } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { normalizeEventData } from "../../hooks/useEventData";
import { errorMessage, parseEventFile, readJsonFile } from '../../domain/validation';
import { eventWarnings, weekday } from '../../domain/date';
import { PerformerEditor } from './PerformerEditor';
import { FlyerOptionsEditor } from './FlyerOptionsEditor';
import type { EventData, ScheduleItem, SocialLink } from "../../types/event";
import { FlyerView } from "../Flyer/FlyerView";

type EditorPageProps = {
  eventData: EventData;
  setEventData: Dispatch<SetStateAction<EventData>>;
  resetEventData: () => void;
  hasCustomData: boolean;
  saveStatus?: string;
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
        <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
      ) : (
        <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
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

function makeExportFileName(eventData: EventData) {
  const safeTitle = `${eventData.title}-${eventData.volume}`.replace(/[\\/:*?"<>|\s]+/g, "-");
  return `${safeTitle || "event-flyer"}.json`;
}

function makeDefaultEventFileName(eventData: EventData) {
  const safeTitle = `${eventData.title}-${eventData.volume}`.replace(/[\\/:*?"<>|\s]+/g, "-").toLowerCase();
  return `default-event-${safeTitle || "public"}.json`;
}

function getPublicEventJson(eventData: EventData) {
  return JSON.stringify(normalizeEventData(eventData), null, 2);
}

function downloadJson(json: string, fileName: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function copyTextFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const didCopy = document.execCommand("copy");
  textarea.remove();
  return didCopy;
}

export function EditorPage({
  eventData,
  setEventData,
  resetEventData,
  saveStatus = "保存状態を確認中",
  onOpenFlyer
}: EditorPageProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<EventData>();
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
    const shouldReset = window.confirm("現在のイベントだけを公開初期値に戻しますか？他のイベントは保持されます。");
    if (!shouldReset) return;

    resetEventData();
    setNotice("初期データに戻しました。");
  };

  const downloadEventJson = () => {
    downloadJson(JSON.stringify({ schemaVersion: 2, kind: "event", eventData }, null, 2), makeExportFileName(eventData));
    setNotice("JSONを書き出しました。");
  };

  const copyPublicEventJson = async () => {
    const json = getPublicEventJson(eventData);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        setNotice("公開用データをコピーしました。このチャットに貼れば、公開用データへ反映できます。");
        return;
      }
    } catch {
      // Fall back to the older clipboard method below.
    }

    const didCopy = copyTextFallback(json);
    setNotice(
      didCopy
        ? "公開用データをコピーしました。このチャットに貼れば、公開用データへ反映できます。"
        : "コピーできませんでした。defaultEvent用JSONを書き出して、その内容を共有してください。"
    );
  };

  const downloadDefaultEventJson = () => {
    downloadJson(getPublicEventJson(eventData), makeDefaultEventFileName(eventData));
    setNotice("defaultEvent用JSONを書き出しました。この内容をGitHubの公開データへ反映できます。");
  };

  const importEventJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try { setPending(parseEventFile(await readJsonFile(file))); setNotice('内容を確認してから読み込みを確定してください。'); }
    catch (error) { setNotice(errorMessage(error)); }
  };

  return (
    <main className="editor-page">
      <section className="editor-panel">
        <div className="editor-header">
          <div>
            <p className="eyebrow">Editable Flyer</p>
            <h1>チラシ内容を編集</h1>
            <p>このブラウザ内の下書きを編集します。公開HPには反映されません。</p>
          </div>

          <div className="editor-actions">
            <button type="button" onClick={onOpenFlyer}>下書きA4を見る</button>
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
          {saveStatus}（バックアップはJSON保存から）
        </p>

        {notice ? <p className="editor-notice" role="status">{notice}</p> : null}
        {pending && <div className="editor-warning"><h2>読み込み内容の確認</h2><p>{eventData.title} → {pending.title} / {pending.date} / {pending.schedule.length}項目 / 出演者{pending.performers.length}名</p><button onClick={() => { setEventData(pending); setPending(undefined); setNotice('イベントを読み込みました。公開HPは変更されません。'); }}>このイベントを置き換える</button><button onClick={() => setPending(undefined)}>キャンセル</button></div>}
        {eventWarnings(eventData).map(message => <p className="editor-warning" key={message}>{message}</p>)}

        {hasA4Warning ? (
          <div className="editor-warning">
            <strong>A4注意:</strong> スケジュール項目が多いため、印刷時に下部が詰まる可能性があります。A4画面で収まりを確認してください。
          </div>
        ) : null}

        <section className="editor-card public-data-card">
          <h2>公開用データ</h2>
          <p>
            管理画面の編集内容は、このブラウザ内に保存されています。サイトを見た全員へ反映したい時は、ここからデータを書き出し、リポジトリの公開元 src/data/defaultEvent.ts を更新して、レビュー・ビルド・公開作業を行ってください。ファイル生成だけでは公開されません。
          </p>
          <div className="public-data-actions">
            <button type="button" onClick={copyPublicEventJson}>公開用データをコピー</button>
            <button type="button" onClick={downloadDefaultEventJson}>defaultEvent用JSONを書き出し</button>
          </div>
        </section>

        <section className="editor-card">
          <h2>基本情報</h2>
          <div className="editor-grid">
            <Field label="上部サブタイトル" value={eventData.venueSubtitle} onChange={(value) => updateRoot({ venueSubtitle: value })} />
            <Field label="イベント名" value={eventData.title} onChange={(value) => updateRoot({ title: value })} />
            <Field label="サブタイトル" value={eventData.subtitle} onChange={(value) => updateRoot({ subtitle: value })} />
            <Field label="vol" value={eventData.volume} onChange={(value) => updateRoot({ volume: value })} />
            <Field label="日付（YYYY-MM-DD / 従来表記も保持）" value={eventData.date} onChange={(value) => updateRoot({ date: value, day: weekday(value) ?? eventData.day })} />
            <label className="editor-field"><span>曜日（自動計算）</span><input value={weekday(eventData.date) ?? '日付を確認してください'} readOnly /></label>
            <label className="inline-check"><input type="checkbox" checked={eventData.dayOverride ?? false} onChange={e => updateRoot({ dayOverride: e.target.checked })} />曜日を特殊表示</label>
            {eventData.dayOverride && <Field label="曜日の特殊表示" value={eventData.day} onChange={value => updateRoot({ day: value })} />}
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
                  aria-label="スケジュールの種類"
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
                  <button type="button" aria-label="スケジュールを上へ" onClick={() => moveScheduleItem(index, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button type="button" aria-label="スケジュールを下へ" onClick={() => moveScheduleItem(index, 1)} disabled={index === eventData.schedule.length - 1}>
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

        <PerformerEditor eventData={eventData} setEventData={setEventData} />
        <FlyerOptionsEditor eventData={eventData} setEventData={setEventData} />
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
            <div className="social-editor-item" key={index}>
              <input aria-label="SNS表示名" value={social.label} onChange={(event) => updateSocial(index, { label: event.target.value })} />
              <input aria-label="SNS URL" value={social.url} onChange={(event) => updateSocial(index, { url: event.target.value })} />
              <button type="button" className="danger" onClick={() => removeSocial(index)}>
                削除
              </button>
            </div>
          ))}
        </section>
      </section>

      <aside className="editor-preview">
        <h2>下書きの簡易表示</h2><p>印刷・PNG出力は「下書きA4を見る」から確認できます。</p><FlyerView eventData={eventData} variant="web" showEditButton={false} />
      </aside>
    </main>
  );
}
