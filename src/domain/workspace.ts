import { parseDocument } from "../studio/document";
import type { CreativeDocument } from "../studio/document";
import { defaultEvent } from '../data/defaultEvent';
import type { EventData } from '../types/event';
import { array, object, parseEvent, parseJson, string, ValidationError } from './validation';
import { eventCollectionsFit, MAX_EVENTS } from './limits';
import { tr } from "../i18n";

export type EventRecord = { id: string; name: string; eventData: EventData; updatedAt: string };
export type Workspace = {
  schemaVersion: 2;
  revision: number;
  activeEventId: string;
  events: EventRecord[];
  legacyBackup?: Record<string, string | null>;
  documents: CreativeDocument[];
  activeDocumentId?: string;
};
export const LEGACY_KEYS = ['tirasi-hp:event-library:v1', 'tirasi-hp:event-data:v1', 'tirasi-hp:active-event-id:v1'] as const;
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export const eventName = (event: EventData) => `${event.title} ${event.subtitle} ${event.volume}`.trim();
export const recordFor = (eventData: EventData, id: string = newId(), name = eventName(eventData)): EventRecord => ({ id, name, eventData: structuredClone(eventData), updatedAt: new Date().toISOString() });
export function parseRecords(value: unknown): EventRecord[] {
  const ids = new Set<string>();
  const records = array(value, tr("イベント一覧"), MAX_EVENTS).map((v, index) => {
    const record = object(v, tr("イベント[{0}]", index));
    const eventData = parseEvent(record.eventData);
    const originalId = record.id === undefined ? `import-${index}` : string(record.id, 'id', 200);
    let id = originalId || `import-${index}`;
    while (ids.has(id)) id += '-copy';
    ids.add(id);
    return {
      ...record, id, eventData,
      name: record.name === undefined ? eventName(eventData) : string(record.name, tr("管理名"), 1000),
      updatedAt: record.updatedAt === undefined ? '1970-01-01T00:00:00.000Z' : string(record.updatedAt, tr("更新日"), 100)
    } as EventRecord;
  });
  if (!records.length) throw new ValidationError(tr("イベント一覧は1件以上必要です。"));
  return records;
}
export function parseLibrary(text: string): EventRecord[] {
  const value = parseJson(text);
  if (Array.isArray(value)) return parseRecords(value);
  const envelope = object(value);
  if (envelope.schemaVersion === 2 && envelope.kind === undefined && Array.isArray(envelope.events)) {
    if (Array.isArray(envelope.documents) && envelope.documents.length) throw new ValidationError(tr("制作物を含むワークスペースJSONです。スタジオの「JSONのみ復元」を使ってください。"));
    return parseWorkspace(envelope).events;
  }
  if (envelope.schemaVersion !== 2 || envelope.kind !== 'event-library') throw new ValidationError(tr("未対応の一覧形式です。"));
  return parseRecords(envelope.records);
}
export function parseWorkspace(value: unknown): Workspace {
  const data = object(value);
  if (data.schemaVersion !== 2 || !Number.isSafeInteger(data.revision) || Number(data.revision) < 0) throw new ValidationError(tr("保存領域のバージョンが不正です。"));
  const events = parseRecords(data.events);
  const activeEventId = string(data.activeEventId, 'activeEventId', 200);
  if (!events.some(e => e.id === activeEventId)) throw new ValidationError(tr("選択中のイベントが見つかりません。"));
  if (data.legacyBackup !== undefined) {
    const backup = object(data.legacyBackup);
    Object.values(backup).forEach(v => { if (v !== null) string(v, tr("移行原本"), 4 * 1024 * 1024); });
  }
  const docs = array(data.documents ?? [], tr("制作物"), 100).map(parseDocument);
  if (new Set(docs.map(d => d.id)).size !== docs.length) throw new ValidationError(tr("制作物IDが重複しています。"));
  if (data.activeDocumentId !== undefined && !docs.some(d => d.id === data.activeDocumentId)) throw new ValidationError(tr("選択中の制作物が見つかりません。"));
  return { ...data, schemaVersion: 2, revision: Number(data.revision), events, activeEventId, documents: docs } as Workspace;
}
export function initialWorkspace(legacy: Record<string, string | null> = {}): Workspace {
  let events: EventRecord[];
  if (legacy[LEGACY_KEYS[0]]) events = parseLibrary(legacy[LEGACY_KEYS[0]]!);
  else if (legacy[LEGACY_KEYS[1]]) { const eventData = parseEvent(parseJson(legacy[LEGACY_KEYS[1]]!)); events = [{ id: 'migrated-event', name: eventName(eventData), eventData, updatedAt: '1970-01-01T00:00:00.000Z' }]; }
  else events = [{ id: 'default-event', name: eventName(defaultEvent), eventData: structuredClone(defaultEvent), updatedAt: '1970-01-01T00:00:00.000Z' }];
  const activeEventId = events.some(e => e.id === legacy[LEGACY_KEYS[2]]) ? legacy[LEGACY_KEYS[2]]! : events[0].id;
  return { schemaVersion: 2, revision: 0, events, activeEventId, documents: [], legacyBackup: legacy };
}
export type WorkspaceAction =
  | { type: 'edit'; id: string; eventData: EventData; updatedAt: string }
  | { type: 'select'; id: string }
  | { type: 'add'; record: EventRecord }
  | { type: 'delete'; id: string; fallback: EventRecord }
  | { type: 'rename'; id: string; name: string }
  | { type: 'replace'; records: EventRecord[] };
export function workspaceReducer(state: Workspace, action: WorkspaceAction): Workspace {
  switch (action.type) {
    case 'edit': return eventCollectionsFit(action.eventData) ? { ...state, events: state.events.map(e => e.id === action.id ? { ...e, eventData: action.eventData, updatedAt: action.updatedAt } : e) } : state;
    case 'select': return state.events.some(e => e.id === action.id) ? { ...state, activeEventId: action.id } : state;
    case 'add': return state.events.length >= MAX_EVENTS || state.events.some(e => e.id === action.record.id) ? state : { ...state, events: [...state.events, action.record], activeEventId: action.record.id };
    case 'rename': return { ...state, events: state.events.map(e => e.id === action.id ? { ...e, name: action.name || eventName(e.eventData) } : e) };
    case 'delete': {
      const remaining = state.events.filter(e => e.id !== action.id);
      const events = remaining.length ? remaining : [action.fallback];
      return { ...state, events, activeEventId: events.some(e => e.id === state.activeEventId) ? state.activeEventId : events[0].id };
    }
    case 'replace': return !action.records.length || action.records.length > MAX_EVENTS ? state : { ...state, events: action.records, activeEventId: action.records[0].id };
  }
}
