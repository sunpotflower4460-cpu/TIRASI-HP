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
        <span>今回変えるところだけ、入力。</span>
        <p>タイトル・出演者・日時は、選んだデザインへ自動で入ります。</p>
      </div>
      {doc.contentBinding === "snapshot" && (
        <p className="studio-note">
          固定コピーを編集中です。元のイベントは変更しません。
        </p>
      )}
      {doc.contentBinding === "linked" &&
        workspace.documents.filter(
          (value) =>
            value.kind === "event-flyer" &&
            value.contentBinding === "linked" &&
            value.eventId === doc.eventId,
        ).length > 1 && (
          <p className="live-help">
            同じライブのデザイン違いにも内容を反映します。次回の告知は「次回分を作る」から作成できます。
          </p>
        )}
      {doc.contentBinding === "linked" &&
        !workspace.events.some((record) => record.id === doc.eventId) && (
          <div className="studio-note">
            <p>参照元のイベントが見つかりません。</p>
            <button
              onClick={() =>
                mutate(doc.id, (current) =>
                  current.kind === "event-flyer"
                    ? { ...current, contentBinding: "snapshot" }
                    : current,
                )
              }
            >
              固定コピーを編集する
            </button>
          </div>
        )}
      <Field
        label="ライブタイトル"
        value={doc.content.titleOverride ?? event.title}
        onChange={(value) => setTitle(value)}
      />
      <div className="live-field-grid">
        <Field
          label="副題"
          value={doc.content.subtitleOverride ?? event.subtitle}
          onChange={(value) => setTitle(value, true)}
        />
        <Field
          label="回数・vol."
          value={event.volume}
          onChange={(volume) => patch({ volume })}
          max={1000}
        />
      </div>
      {doc.content.subtitleOverride !== undefined && (
        <p className="live-help">
          副題はこのチラシだけの上書きです。回数を自動で添えるには「本文」からイベントのタイトルに戻せます。
        </p>
      )}
      <div className="live-field-grid">
        <label className="studio-field">
          <span>開催日（{eventDay(event) || "曜日は自動"}）</span>
          <input
            type="date"
            aria-label="ライブの開催日"
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
          <span>開始時間</span>
          <input
            type="time"
            aria-label="ライブの開始時間"
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
        <p className="live-help">現在の日付表記: {event.date}</p>
      )}
      <Field
        label="料金・入場案内"
        value={event.price}
        onChange={(price) => patch({ price })}
      />
      <section className="live-lineup">
        <div className="live-section-heading">
          <h2>
            出演者{" "}
            <small>
              {event.schedule.filter((item) => item.type === "act").length}組
            </small>
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
            />
            出演時刻を表示
          </label>
        </div>
        {!times && (
          <p className="live-help">
            紙面は名前の一覧になります。時刻・休憩・終了のデータは残ります。
          </p>
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
                    ? "休憩"
                    : "終了"}
              </span>
              {item.type === "act" ? (
                <input
                  className="live-artist-name"
                  aria-label={`出演者${number}の名前`}
                  placeholder="出演者名"
                  list={suggestionId}
                  value={item.name}
                  maxLength={1000}
                  onChange={(change) =>
                    changeItem(index, { name: change.target.value })
                  }
                />
              ) : (
                <input
                  aria-label={`区切り${index + 1}の表示`}
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
                  aria-label={`項目${index + 1}を上へ`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`項目${index + 1}を下へ`}
                  disabled={index === event.schedule.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`項目${index + 1}を削除`}
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
                  <span>時間</span>
                  <input
                    aria-label={`出演者${number}の時間`}
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
          >
            ＋ 出演者
          </button>
          <button
            disabled={event.schedule.length >= EVENT_LIMITS.schedule}
            onClick={() => insert({ type: "break", label: "休憩（15分）" })}
          >
            ＋ 休憩
          </button>
        </div>
        {event.schedule.length >= EVENT_LIMITS.schedule && (
          <p role="status">スケジュールは{EVENT_LIMITS.schedule}件までです。</p>
        )}
        <details className="live-utility">
          <summary>名前をまとめて追加する</summary>
          <label className="studio-field">
            <span>1行に1組ずつ入力・貼り付け</span>
            <textarea
              aria-label="まとめて追加する出演者名"
              value={names}
              onChange={(change) => setNames(change.target.value)}
              rows={5}
              maxLength={10000}
              placeholder={"出演者A\n出演者B\n出演者C"}
            />
          </label>
          <button
            disabled={!names.trim()}
            onClick={() => {
              try {
                const schedule = appendArtistNames(event.schedule, names);
                patch({ schedule });
                setNames("");
                setNotice("出演者を追加しました。時刻はそのままです。");
              } catch (error) {
                setNotice(errorMessage(error));
              }
            }}
          >
            名前を追加
          </button>
        </details>
        <details className="live-utility">
          <summary>出演時刻をまとめて設定する</summary>
          <p>
            開始時間から演奏・転換を順に割り当てます。名前や出演順は変えません。休憩欄の「○分」を使い、記載がなければ15分とします。
          </p>
          <div className="live-field-grid">
            <label className="studio-field">
              <span>1組の演奏（分）</span>
              <input
                type="number"
                min="1"
                max="180"
                aria-label="1組の演奏時間"
                value={duration}
                onChange={(change) => setDuration(change.target.value)}
              />
            </label>
            <label className="studio-field">
              <span>転換（分）</span>
              <input
                type="number"
                min="0"
                max="120"
                aria-label="転換時間"
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
                  "出演時刻を設定しました。「取り消す」で元に戻せます。",
                );
              } catch (error) {
                setNotice(errorMessage(error));
              }
            }}
          >
            この時間で割り当てる
          </button>
        </details>
        {notice && (
          <p className="live-help" role="status">
            {notice}
          </p>
        )}
      </section>
      <details className="live-fixed-info">
        <summary>会場・主催・注意書き</summary>
        <p>毎回変わらない情報です。次回分にもそのまま引き継ぎます。</p>
        <Field
          label="会場名"
          value={event.venue.name}
          onChange={(name) =>
            updateEvent((current) => ({
              ...current,
              venue: { ...current.venue, name },
            }))
          }
        />
        <Field
          label="会場住所"
          value={event.venue.address}
          onChange={(address) =>
            updateEvent((current) => ({
              ...current,
              venue: { ...current.venue, address },
            }))
          }
        />
        <Field
          label="会場URL"
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
          label="主催・企画"
          value={event.organizer}
          onChange={(organizer) => patch({ organizer })}
        />
        <Field
          label="上部の会場表記"
          value={event.venueSubtitle}
          onChange={(venueSubtitle) => patch({ venueSubtitle })}
        />
        <Field
          label="注意書き"
          value={event.statusNote}
          multiline
          onChange={(statusNote) => patch({ statusNote })}
          max={10000}
        />
      </details>
      <details className="live-fixed-info">
        <summary>終演後のOpen Mic</summary>
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
          />
          Open Micを載せる
        </label>
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
                "Open Micの見出し",
                "Open Micの時間",
                "ラストオーダー",
                "参加案内",
                "Open Micの注意",
                "終了案内",
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
          <summary>日時・時刻の確認（{warnings.length}件）</summary>
          <ul>
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
      <p className="live-help">
        {isStore
          ? "この端末の下書きを編集中です。"
          : "このブラウザの下書きを編集中です。公開HPは変わりません。"}
      </p>
    </div>
  );
}
