import { defaultEvent } from '../data/defaultEvent';
import type { EventData, PerformerProfile, ScheduleItem, SocialLink } from '../types/event';

export const MAX_JSON_BYTES = 4 * 1024 * 1024;
export class ValidationError extends Error {}
export function object(value: unknown, path = 'データ'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(`${path}: オブジェクトが必要です。`);
  return value as Record<string, unknown>;
}
export function string(value: unknown, path: string, max = 10000): string {
  if (typeof value !== 'string' || value.length > max) throw new ValidationError(`${path}: ${max}文字以内の文字列が必要です。`);
  return value;
}
export function array(value: unknown, path: string, max = 100): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new ValidationError(`${path}: ${max}件以内の配列が必要です。`);
  return value;
}
export function safeUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
function url(value: unknown, path: string): string {
  const text = string(value, path, 2048);
  if (text && !safeUrl(text)) throw new ValidationError(`${path}: http / https のURLを入力してください。`);
  return text;
}
function fields(value: unknown, names: string[], path: string): Record<string, string> {
  const input = object(value, path);
  const out: Record<string, string> = {};
  for (const name of names) out[name] = name.toLowerCase().endsWith('url') ? url(input[name], `${path}.${name}`) : string(input[name], `${path}.${name}`);
  return { ...input, ...out } as Record<string, string>;
}
export function parseEvent(value: unknown): EventData {
  const input = object(value, 'イベント');
  const root = fields(input, ['title', 'subtitle', 'volume', 'date', 'day', 'startTime', 'organizer', 'price', 'statusNote', 'venueSubtitle'], 'イベント');
  const schedule = array(input.schedule, 'schedule').map((value, i): ScheduleItem => {
    const item = object(value, `schedule[${i}]`);
    if (item.type === 'act') return { ...item, type: 'act', time: string(item.time, '出演時間', 300), name: string(item.name, '出演者名', 1000) };
    if (item.type === 'break' || item.type === 'end') return { ...item, type: item.type, label: string(item.label, '表示文', 1000) };
    throw new ValidationError(`schedule[${i}]: 種類が不正です。`);
  });
  const performers = array(input.performers ?? [], 'performers', 50).map((value, i) => fields(value, ['id', 'name', 'catchcopy', 'bio', 'imageUrl', 'linkUrl'], `performers[${i}]`) as PerformerProfile);
  const ids = new Set<string>();
  performers.forEach((p, i) => { let id = p.id || `performer-${i + 1}`; while (ids.has(id)) id += '-copy'; ids.add(id); p.id = id; });
  const options = object(input.flyerOptions ?? defaultEvent.flyerOptions, 'flyerOptions');
  if (typeof options.showPerformerProfiles !== 'boolean') throw new ValidationError('出演者紹介表示は真偽値が必要です。');
  if (input.dayOverride !== undefined && typeof input.dayOverride !== 'boolean') throw new ValidationError('曜日の特殊表示は真偽値が必要です。');
  const timezone = input.timezone === undefined ? 'Asia/Tokyo' : string(input.timezone, 'timezone', 100);
  try { new Intl.DateTimeFormat('ja', { timeZone: timezone }); } catch { throw new ValidationError('timezone: 有効なタイムゾーンが必要です。'); }
  return {
    ...input, ...root,
    themeId: input.themeId === undefined ? defaultEvent.themeId : string(input.themeId, 'themeId', 100),
    timezone,
    schedule, performers, flyerOptions: { ...options, showPerformerProfiles: options.showPerformerProfiles },
    venue: fields(input.venue, ['name', 'address', 'url'], 'venue') as EventData['venue'],
    openMic: fields(input.openMic, ['title', 'time', 'lastOrder', 'headline', 'note', 'closeNote'], 'openMic') as EventData['openMic'],
    socials: array(input.socials, 'socials', 30).map((v, i) => fields(v, ['label', 'url'], `socials[${i}]`) as SocialLink)
  } as EventData;
}
export function parseJson(text: string): unknown {
  if (new Blob([text]).size > MAX_JSON_BYTES) throw new ValidationError('JSONは4MB以内にしてください。');
  try { return JSON.parse(text); } catch { throw new ValidationError('JSONの構文が正しくありません。'); }
}
export function parseEventFile(text: string): EventData {
  const value = object(parseJson(text));
  if (value.schemaVersion !== undefined) {
    if (value.schemaVersion !== 2 || value.kind !== 'event') throw new ValidationError('未対応のイベント形式です。');
    return parseEvent(value.eventData);
  }
  return parseEvent(value);
}
export async function readJsonFile(file: File): Promise<string> {
  if (file.size > MAX_JSON_BYTES) throw new ValidationError('JSONは4MB以内にしてください。');
  return file.text();
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : '処理に失敗しました。再試行してください。';
