import { isStore } from "../../edition";
import { useId, useState } from "react";
import type { EventData, ScheduleItem } from "../../types/event";
import type { Workspace } from "../../domain/workspace";
import { EVENT_LIMITS } from "../../domain/limits";
import { dateISO, eventDay, eventWarnings, weekday } from "../../domain/date";
import type { Design } from "../../studio/document";
import { eventForDocument } from "../../studio/document";
import type { LiveDocument } from "../../studio/live";
import {
  appendArtistNames,
  artistSuggestions,
  buildTimetable,
  liveDate,
} from "../../studio/live";
import { errorMessage } from "../../domain/validation";
import { Field } from "./controls";
import type { DocumentMutator } from "./controls";
import { displayDay, tr } from "../../i18n";

export function LivePanel({
  doc,
  workspace,
  updateEvent,
  mutate,
  setDesign,
}: {
  doc: LiveDocument;
  workspace: Workspace;
  updateEvent: (update: (event: EventData) => EventData) => void;
  mutate: DocumentMutator;
  setDesign: (patch: Partial<Design>) => void;
}) {
  const event = eventForDocument(doc, workspace.events);
  const suggestionId = useId();
  const [names, setNames] = useState("");
  const [duration, setDuration] = useState("20");
  const [changeover, setChangeover] = useState("10");
  const [notice, setNotice] = useState("");
  const times = doc.design.visibility.times !== false;
  const patch = (value: Partial<EventData>) =>
    updateEvent((current) => ({ ...current, ...value }));
  const changeItem = (index: number, update: Partial<ScheduleItem>) =>
    updateEvent((current) => ({
      ...current,
      schedule: current.schedule.map((item, at) =>
        at === index ? ({ ...item, ...update } as ScheduleItem) : item,
      ),
    }));
  const move = (index: number, direction: number) =>
    updateEvent((current) => {
      const to = index + direction;
      if (to < 0 || to >= current.schedule.length) return current;
      const schedule = [...current.schedule];
      [schedule[index], schedule[to]] = [schedule[to], schedule[index]];
      return { ...current, schedule };
    });
  const insert = (item: ScheduleItem) =>
    updateEvent((current) => {
      if (current.schedule.length >= EVENT_LIMITS.schedule) return current;
      const end = current.schedule.findIndex((value) => value.type === "end");
      const at = end < 0 ? current.schedule.length : end;
      return {
        ...current,
        schedule: [
          ...current.schedule.slice(0, at),
          item,
          ...current.schedule.slice(at),
        ],
      };
    });
  const setTitle = (value: string, subtitle = false) => {
    const key = subtitle ? "subtitleOverride" : "titleOverride";
    if (doc.content[key] !== undefined)
      mutate(doc.id, (current) =>
        current.kind === "event-flyer"
          ? { ...current, content: { ...current.content, [key]: value } }
          : current,
      );
    else patch(subtitle ? { subtitle: value } : { title: value });
  };
  const warnings = eventWarnings(event);
  let artist = 0;
  return (
    <div className="live-panel">
      <div className="live-panel-intro">
        <span>{tr("今回変えるところだけ、入力。")}</span>
        <p>{tr("タイトル・出演者・日時は、選んだデザインへ自動で入ります。")}</p>
      </div>
      {doc.contentBinding === "snapshot" && (
        <p className="studio-note">{tr("固定コピーを編集中です。元のイベントは変更しません。")}</p>
      )}
      {doc.contentBinding === "linked" &&
        workspace.documents.filter(
          (value) =>
            value.kind === "event-flyer" &&
            value.contentBinding === "linked" &&
            value.eventId === doc.eventId,
        ).length > 1 && (
          <p className="live-help">{tr("同じライブのデザイン違いにも内容を反映します。次回の告知は「次回分を作る」から作成できます。")}</p>
        )}
      {doc.contentBinding === "linked" &&
        !workspace.events.some((record) => record.id === doc.eventId) && (
          <div className="studio-note">
            <p>{tr("参照元のイベントが見つかりません。")}</p>
            <button
              onClick={() =>
                mutate(doc.id, (current) =>
                  current.kind === "event-flyer"
                    ? { ...current, contentBinding: "snapshot" }
                    : current,
                )
              }
            >{tr("固定コピーを編集する")}</button>
          </div>
        )}
      <Field
        label={tr("ライブタイトル")}
        value={doc.content.titleOverride ?? event.title}
        onChange={(value) => setTitle(value)}
      />
      <div className="live-field-grid">
        <Field
          label={tr("副題")}
          value={doc.content.subtitleOverride ?? event.subtitle}
          onChange={(value) => setTitle(value, true)}
        />
        <Field
          label={tr("回数・vol.")}
          value={event.volume}
          onChange={(volume) => patch({ volume })}
          max={1000}
        />
      </div>
      {doc.content.subtitleOverride !== undefined && (
        <p className="live-help">{tr("副題はこのチラシだけの上書きです。回数を自動で添えるには「本文」からイベントのタイトルに戻せます。")}</p>
      )}
      <div className="live-field-grid">
        <label className="studio-field">
          <span>{tr("開催日（{0}）", displayDay(eventDay(event)) || tr("曜日は自動"))}</span>
          <input
            type="date"
            aria-label={tr("ライブの開催日")}
            value={dateISO(event.date) ?? ""}
            onChange={(change) =>
              patch({
                date: liveDate(change.target.value, event.date),
                day: weekday(change.target.value) ?? "",
                dayOverride: false,
              })
            }
          />
        </label>
        <label className="studio-field">
          <span>{tr("開始時間")}</span>
          <input
            type="time"
            aria-label={tr("ライブの開始時間")}
            value={
              /^([01]\d|2[0-3]):[0-5]\d$/.test(event.startTime)
                ? event.startTime
                : ""
            }
            onChange={(change) => patch({ startTime: change.target.value })}
          />
        </label>
      </div>
      {!dateISO(event.date) && event.date && (
        <p className="live-help">{tr("現在の日付表記: {0}", event.date)}</p>
      )}
      <Field
        label={tr("料金・入場案内")}
        value={event.price}
        onChange={(price) => patch({ price })}
      />
      <section className="live-lineup">
        <div className="live-section-heading">
          <h2>{tr("出演者")}{" "}
            <small>{tr("{0}組", event.schedule.filter((item) => item.type === "act").length)}</small>
          </h2>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={times}
              onChange={(change) =>
                setDesign({
                  visibility: {
                    ...doc.design.visibility,
                    times: change.target.checked,
                  },
                })
              }
            />{tr("出演時刻を表示")}</label>
        </div>
        {!times && (
          <p className="live-help">{tr("紙面は名前の一覧になります。時刻・休憩・終了のデータは残ります。")}</p>
        )}
        <datalist id={suggestionId}>
          {artistSuggestions(workspace, event).map((name) => (
            <option value={name} key={name} />
          ))}
        </datalist>
        {event.schedule.map((item, index) => {
          const number = item.type === "act" ? ++artist : 0;
          return (
            <div
              className={`live-lineup-row ${item.type === "act" ? "" : "live-divider-row"}`}
              key={index}
            >
              <span className="live-order">
                {item.type === "act"
                  ? String(number).padStart(2, "0")
                  : item.type === "break"
                    ? tr("休憩")
                    : tr("終了")}
              </span>
              {item.type === "act" ? (
                <input
                  className="live-artist-name"
                  aria-label={tr("出演者{0}の名前", number)}
                  placeholder={tr("出演者名")}
                  list={suggestionId}
                  value={item.name}
                  maxLength={1000}
                  onChange={(change) =>
                    changeItem(index, { name: change.target.value })
                  }
                />
              ) : (
                <input
                  aria-label={tr("区切り{0}の表示", index + 1)}
                  value={item.label}
                  maxLength={1000}
                  onChange={(change) =>
                    changeItem(index, { label: change.target.value })
                  }
                />
              )}
              <div className="live-row-actions">
                <button
                  type="button"
                  aria-label={tr("項目{0}を上へ", index + 1)}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={tr("項目{0}を下へ", index + 1)}
                  disabled={index === event.schedule.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={tr("項目{0}を削除", index + 1)}
                  onClick={() =>
                    updateEvent((current) => ({
                      ...current,
                      schedule: current.schedule.filter(
                        (_, at) => at !== index,
                      ),
                    }))
                  }
                >
                  ×
                </button>
              </div>
              {item.type === "act" && times && (
                <label className="live-act-time">
                  <span>{tr("時間")}</span>
                  <input
                    aria-label={tr("出演者{0}の時間", number)}
                    value={item.time}
                    placeholder="14:30-14:50"
                    maxLength={300}
                    onChange={(change) =>
                      changeItem(index, { time: change.target.value })
                    }
                  />
                </label>
              )}
            </div>
          );
        })}
        <div className="action-row">
          <button
            disabled={event.schedule.length >= EVENT_LIMITS.schedule}
            onClick={() => insert({ type: "act", name: "", time: "" })}
          >{tr("＋ 出演者")}</button>
          <button
            disabled={event.schedule.length >= EVENT_LIMITS.schedule}
            onClick={() => insert({ type: "break", label: tr("休憩（15分）") })}
          >{tr("＋ 休憩")}</button>
        </div>
        {event.schedule.length >= EVENT_LIMITS.schedule && (
          <p role="status">{tr("スケジュールは{0}件までです。", EVENT_LIMITS.schedule)}</p>
        )}
        <details className="live-utility">
          <summary>{tr("名前をまとめて追加する")}</summary>
          <label className="studio-field">
            <span>{tr("1行に1組ずつ入力・貼り付け")}</span>
            <textarea
              aria-label={tr("まとめて追加する出演者名")}
              value={names}
              onChange={(change) => setNames(change.target.value)}
              rows={5}
              maxLength={10000}
              placeholder={tr("出演者A\n出演者B\n出演者C")}
            />
          </label>
          <button
            disabled={!names.trim()}
            onClick={() => {
              try {
                const schedule = appendArtistNames(event.schedule, names);
                patch({ schedule });
                setNames("");
                setNotice(tr("出演者を追加しました。時刻はそのままです。"));
              } catch (error) {
                setNotice(errorMessage(error));
              }
            }}
          >{tr("名前を追加")}</button>
        </details>
        <details className="live-utility">
          <summary>{tr("出演時刻をまとめて設定する")}</summary>
          <p>{tr("開始時間から演奏・転換を順に割り当てます。名前や出演順は変えません。休憩欄の「○分」を使い、記載がなければ15分とします。")}</p>
          <div className="live-field-grid">
            <label className="studio-field">
              <span>{tr("1組の演奏（分）")}</span>
              <input
                type="number"
                min="1"
                max="180"
                aria-label={tr("1組の演奏時間")}
                value={duration}
                onChange={(change) => setDuration(change.target.value)}
              />
            </label>
            <label className="studio-field">
              <span>{tr("転換（分）")}</span>
              <input
                type="number"
                min="0"
                max="120"
                aria-label={tr("転換時間")}
                value={changeover}
                onChange={(change) => setChangeover(change.target.value)}
              />
            </label>
          </div>
          <button
            onClick={() => {
              try {
                patch({
                  schedule: buildTimetable(
                    event.schedule,
                    event.startTime,
                    Number(duration),
                    Number(changeover),
                  ),
                });
                setNotice(
                  tr("出演時刻を設定しました。「取り消す」で元に戻せます。"),
                );
              } catch (error) {
                setNotice(errorMessage(error));
              }
            }}
          >{tr("この時間で割り当てる")}</button>
        </details>
        {notice && (
          <p className="live-help" role="status">
            {notice}
          </p>
        )}
      </section>
      <details className="live-fixed-info">
        <summary>{tr("会場・主催・注意書き")}</summary>
        <p>{tr("毎回変わらない情報です。次回分にもそのまま引き継ぎます。")}</p>
        <Field
          label={tr("会場名")}
          value={event.venue.name}
          onChange={(name) =>
            updateEvent((current) => ({
              ...current,
              venue: { ...current.venue, name },
            }))
          }
        />
        <Field
          label={tr("会場住所")}
          value={event.venue.address}
          onChange={(address) =>
            updateEvent((current) => ({
              ...current,
              venue: { ...current.venue, address },
            }))
          }
        />
        <Field
          label={tr("会場URL")}
          value={event.venue.url}
          onChange={(url) =>
            updateEvent((current) => ({
              ...current,
              venue: { ...current.venue, url },
            }))
          }
          max={2048}
        />
        <Field
          label={tr("主催・企画")}
          value={event.organizer}
          onChange={(organizer) => patch({ organizer })}
        />
        <Field
          label={tr("上部の会場表記")}
          value={event.venueSubtitle}
          onChange={(venueSubtitle) => patch({ venueSubtitle })}
        />
        <Field
          label={tr("注意書き")}
          value={event.statusNote}
          multiline
          onChange={(statusNote) => patch({ statusNote })}
          max={10000}
        />
      </details>
      <details className="live-fixed-info">
        <summary>{tr("終演後のOpen Mic")}</summary>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={doc.design.visibility.openMic}
            onChange={(change) =>
              setDesign({
                visibility: {
                  ...doc.design.visibility,
                  openMic: change.target.checked,
                },
              })
            }
          />{tr("Open Micを載せる")}</label>
        {(
          [
            "title",
            "time",
            "lastOrder",
            "headline",
            "note",
            "closeNote",
          ] as const
        ).map((key, index) => (
          <Field
            key={key}
            label={
              [
                tr("Open Micの見出し"),
                tr("Open Micの時間"),
                tr("ラストオーダー"),
                tr("参加案内"),
                tr("Open Micの注意"),
                tr("終了案内"),
              ][index]
            }
            value={event.openMic[key]}
            onChange={(value) =>
              updateEvent((current) => ({
                ...current,
                openMic: { ...current.openMic, [key]: value },
              }))
            }
          />
        ))}
      </details>
      {warnings.length > 0 && (
        <details className="live-fixed-info live-warning">
          <summary>{tr("日時・時刻の確認（{0}件）", warnings.length)}</summary>
          <ul>
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
      <p className="live-help">
        {isStore
          ? tr("この端末の下書きを編集中です。")
          : tr("このブラウザの下書きを編集中です。公開HPは変わりません。")}
      </p>
    </div>
  );
}
