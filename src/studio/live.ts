import type { EventData, ScheduleItem } from "../types/event";
import type { Workspace } from "../domain/workspace";
import { eventName } from "../domain/workspace";
import { EVENT_LIMITS, MAX_EVENTS } from "../domain/limits";
import { dateISO, weekday } from "../domain/date";
import { parseEvent, ValidationError } from "../domain/validation";
import type { CreativeDocument } from "./document";
import { eventForDocument } from "./document";
import { tr } from "../i18n";

export type LiveDocument = Extract<CreativeDocument, { kind: "event-flyer" }>;
export type NextLiveValues = {
  title: string;
  subtitle: string;
  volume: string;
  date: string;
  keepLineup: boolean;
};
export function liveManagementName(
  doc: LiveDocument,
  before: EventData,
  after: EventData,
): string {
  const base = (event: EventData) => `${event.title} ${event.volume}`.trim();
  if (doc.name === base(before).slice(0, 500)) return base(after).slice(0, 500);
  if (doc.name === `${base(before)} / ${before.date}`.slice(0, 500))
    return `${base(after)} / ${after.date}`.slice(0, 500);
  // A number added to tell two flyers apart stays while the title changes.
  const numbered = doc.name.match(/ \(\d+\)$/)?.[0];
  if (numbered && doc.name === `${base(before).slice(0, 500 - numbered.length)}${numbered}`)
    return `${base(after).slice(0, 500 - numbered.length)}${numbered}`;
  return doc.name;
}

export function nextVolume(value: string): string {
  return value.replace(/\d+(?![\s\S]*\d)/, (digits) => {
    const number = Number(digits);
    return Number.isSafeInteger(number) && number < Number.MAX_SAFE_INTEGER
      ? String(number + 1).padStart(digits.length, "0")
      : digits;
  });
}
export function liveDate(iso: string, previous: string): string {
  if (!iso) return "";
  const normalized = dateISO(iso);
  if (!normalized)
    throw new ValidationError(tr("開催日を正しく入力してください。"));
  const [year, month, day] = normalized.split("-");
  return /^\d{4}\.\d{1,2}\/\d{1,2}$/.test(previous)
    ? `${year}.${Number(month)}/${Number(day)}`
    : normalized;
}
export function nextLiveValues(
  doc: LiveDocument,
  events: Workspace["events"],
): NextLiveValues {
  const event = eventForDocument(doc, events);
  let subtitle = doc.content.subtitleOverride ?? event.subtitle;
  // Move an explicitly displayed edition back into its own field. The dialog
  // shows this subtitle and the suggested next edition before creating anything.
  if (
    doc.content.subtitleOverride !== undefined &&
    event.volume &&
    subtitle.endsWith(event.volume)
  )
    subtitle = subtitle.slice(0, -event.volume.length).trimEnd();
  return {
    title: doc.content.titleOverride ?? event.title,
    subtitle,
    volume: nextVolume(event.volume),
    date: "",
    keepLineup: true,
  };
}
export function repeatLiveWorkspace(
  state: Workspace,
  sourceId: string,
  values: NextLiveValues,
  identity: { eventId: string; documentId: string; now: string },
): Workspace {
  const doc = state.documents.find((document) => document.id === sourceId);
  if (!doc || doc.kind !== "event-flyer")
    throw new ValidationError(tr("引き継ぐライブチラシを選んでください。"));
  if (state.events.length >= MAX_EVENTS || state.documents.length >= 100)
    throw new ValidationError(
      tr("保存件数の上限です。バックアップ後に不要なイベント・チラシを整理してください。"),
    );
  if (
    state.events.some((event) => event.id === identity.eventId) ||
    state.documents.some((document) => document.id === identity.documentId)
  )
    throw new ValidationError(
      tr("新しいIDが重複しています。もう一度作成してください。"),
    );
  if (!values.title.trim() || !dateISO(values.date))
    throw new ValidationError(tr("タイトルと次回の開催日を入力してください。"));
  const source = eventForDocument(doc, state.events);
  const eventData = parseEvent({
    ...structuredClone(source),
    title: values.title,
    subtitle: values.subtitle,
    volume: values.volume,
    date: liveDate(values.date, source.date),
    day: weekday(values.date) ?? "",
    dayOverride: false,
    ...(values.keepLineup ? {} : { schedule: [], performers: [] }),
  });
  const record = {
    id: identity.eventId,
    name: eventName(eventData).slice(0, 500),
    eventData,
    updatedAt: identity.now,
  };
  const content = { ...structuredClone(doc.content) };
  delete content.titleOverride;
  delete content.subtitleOverride;
  const next: LiveDocument = {
    ...structuredClone(doc),
    id: identity.documentId,
    name: `${values.title} ${values.volume} / ${eventData.date}`
      .trim()
      .slice(0, 500),
    eventId: record.id,
    contentBinding: "linked",
    snapshot: structuredClone(eventData),
    content,
    updatedAt: identity.now,
  };
  return {
    ...state,
    events: [...state.events, record],
    documents: [...state.documents, next],
    activeEventId: record.id,
    activeDocumentId: next.id,
  };
}
export function artistSuggestions(
  state: Workspace,
  event: EventData,
): string[] {
  const records = [...state.events].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  return [
    ...new Set(
      [event, ...records.map((record) => record.eventData)]
        .flatMap((data) => [
          ...data.schedule
            .filter((item) => item.type === "act")
            .map((item) => item.name),
          ...data.performers.map((artist) => artist.name),
        ])
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ].slice(0, 300);
}
export function appendArtistNames(
  schedule: ScheduleItem[],
  input: string,
): ScheduleItem[] {
  const names = input
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
  if (!names.length)
    throw new ValidationError(tr("出演者名を1行に1組ずつ入力してください。"));
  if (
    names.some((name) => name.length > 1000) ||
    schedule.length + names.length > EVENT_LIMITS.schedule
  )
    throw new ValidationError(
      tr("出演者名は1000文字以内、スケジュールは{0}件以内にしてください。", EVENT_LIMITS.schedule),
    );
  const index = schedule.findIndex((item) => item.type === "end");
  const at = index < 0 ? schedule.length : index;
  return [
    ...schedule.slice(0, at),
    ...names.map((name): ScheduleItem => ({ type: "act", name, time: "" })),
    ...schedule.slice(at),
  ];
}
export function buildTimetable(
  schedule: ScheduleItem[],
  start: string,
  duration: number,
  changeover: number,
  defaultBreak = 15,
): ScheduleItem[] {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))
    throw new ValidationError(tr("開始時間を入力してください。"));
  if (
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 180 ||
    !Number.isInteger(changeover) ||
    changeover < 0 ||
    changeover > 120 ||
    !Number.isInteger(defaultBreak) ||
    defaultBreak < 0 ||
    defaultBreak > 120
  )
    throw new ValidationError(
      tr("演奏は1〜180分、転換・休憩は0〜120分で入力してください。"),
    );
  if (!schedule.some((item) => item.type === "act"))
    throw new ValidationError(tr("先に出演者を追加してください。"));
  const [hours, minutes] = start.split(":").map(Number);
  const first = hours * 60 + minutes;
  let clock = first;
  const format = (value: number) =>
    `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  return schedule.map((item, index) => {
    if (item.type === "break") {
      clock += Number(
        item.label.match(/(\d+)\s*(?:分|min)/i)?.[1] ?? defaultBreak,
      );
      return { ...item };
    }
    if (item.type !== "act") return { ...item };
    const time = `${format(clock)}-${format(clock + duration)}`;
    clock += duration;
    if (clock - first >= 1440)
      throw new ValidationError(
        tr("自動設定は24時間未満のライブに対応します。演奏時間や転換時間を短くしてください。"),
      );
    if (schedule[index + 1]?.type === "act") clock += changeover;
    return { ...item, time };
  });
}

export function missingArtistNames(event: EventData): string[] {
  let act = 0;
  return event.schedule.flatMap((item) =>
    item.type === "act"
      ? (++act,
        item.name.trim() ? [] : [tr("出演者{0}の名前を入力してください。", act)])
      : [],
  );
}
