import type { EventData } from '../types/event';
import { displayDay, tr } from "../i18n";
export function dateISO(text: string): string | undefined {
  const match = text.trim().match(/^(\d{4})[.\-/年](\d{1,2})[.\-/月](\d{1,2})日?$/);
  if (!match) return undefined;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return undefined;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
export function weekday(text: string): string | undefined {
  const iso = dateISO(text);
  return iso ? '日月火水木金土'[new Date(`${iso}T12:00:00Z`).getUTCDay()] : undefined;
}
export const eventDay = (event: EventData) => event.dayOverride ? event.day : weekday(event.date) ?? event.day;
export function eventWarnings(event: EventData): string[] {
  const warnings: string[] = [];
  if (!dateISO(event.date)) warnings.push(tr("日付は YYYY-MM-DD 形式で入力してください。元の表記は保持されています。"));
  if (weekday(event.date) && event.day && event.day !== weekday(event.date)) warnings.push(tr("日付から算出した曜日は「{0}」です。特殊表示の設定を確認してください。", displayDay(weekday(event.date)!)));
  if (event.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.startTime)) warnings.push(tr("開始時間は HH:mm 形式で入力してください。"));
  let previousEnd = -1;
  let dayOffset = 0;
  for (const item of event.schedule) {
    if (item.type !== 'act') continue;
    const match = item.time.match(/^(\d{1,2}):([0-5]\d)\s*[-–〜~]\s*(\d{1,2}):([0-5]\d)$/);
    if (!match) { warnings.push(tr("「{0}」は時刻を解析できません。原文を表示します。", item.time)); continue; }
    const [, h, m, eh, em] = match.map(Number);
    if (h > 23 || eh > 23) { warnings.push(tr("「{0}」の時刻を確認してください。", item.time)); continue; }
    let start = h * 60 + m + dayOffset;
    if (previousEnd >= 20 * 60 && start < 6 * 60) { dayOffset += 1440; start += 1440; }
    let end = eh * 60 + em + dayOffset;
    if (end < start && h >= 20 && eh < 6) end += 1440;
    if (end < start) warnings.push(tr("「{0}」は終了が開始より前です。", item.name));
    if (start < previousEnd) warnings.push(tr("「{0}」は前の出演と時間が重なっています。", item.name));
    previousEnd = end;
  }
  return warnings;
}

export function zonedStart(event: EventData): string | undefined {
  const iso = dateISO(event.date);
  if (!iso || !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.startTime)) return undefined;
  const local = Date.parse(`${iso}T${event.startTime}:00Z`);
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: event.timezone ?? 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  let instant = local;
  let offset = 0;
  for (let i = 0; i < 2; i++) {
    offset = (Date.parse(formatter.format(new Date(instant)).replace(' ', 'T') + 'Z') - instant) / 60000;
    instant = local - offset * 60000;
  }
  const sign = offset >= 0 ? '+' : '-';
  return `${iso}T${event.startTime}:00${sign}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')}:${String(Math.abs(offset) % 60).padStart(2, '0')}`;
}
