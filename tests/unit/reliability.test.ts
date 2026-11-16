import { describe, expect, it } from 'vitest';
import { defaultEvent } from '../../src/data/defaultEvent';
import { parseEvent, parseEventFile, safeUrl } from '../../src/domain/validation';
import { initialWorkspace, parseLibrary, parseWorkspace, workspaceReducer, LEGACY_KEYS } from '../../src/domain/workspace';
import { eventDay, eventWarnings, dateISO } from '../../src/domain/date';
import { metadata } from '../../src/domain/publication';

describe('legacy and strict schema', () => {
  it('retains every known and unknown field through single/library/workspace round trips', () => {
    const event = { ...defaultEvent, extension: { special: 42 } };
    expect(parseEventFile(JSON.stringify(event))).toMatchObject(event);
    const legacy = { [LEGACY_KEYS[0]]: JSON.stringify([{ id: 'a', name: 'local', eventData: event, updatedAt: 'x' }]), [LEGACY_KEYS[2]]: 'a' };
    const migrated = initialWorkspace(legacy);
    expect(parseWorkspace(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
    expect(migrated.legacyBackup).toEqual(legacy);
    expect(parseEventFile(JSON.stringify({ schemaVersion: 2, kind: 'event', eventData: event }))).toEqual(parseEvent(event));
  });
  it.each([{ venue: true }, { openMic: null }, { schedule: [null] }, { performers: [{ name: 'bad' }] }, { socials: [{ label: 'unsafe', url: 'javascript:alert(1)' }] }, { title: 5 }, { themeId: {} }, { timezone: 'not-a-zone' }])('rejects malformed nested input without partial recovery: %o', patch => {
    expect(() => parseEvent({ ...defaultEvent, ...patch })).toThrow();
  });
  it('rejects one invalid record in a library rather than dropping it', () => {
    expect(() => parseLibrary(JSON.stringify([{ eventData: defaultEvent }, { eventData: { schedule: [] } }]))).toThrow();
  });
  it('deterministically repairs colliding ids and preserves active selection', () => {
    const json = JSON.stringify([{ id: 'x', eventData: defaultEvent }, { id: 'x', eventData: defaultEvent }]);
    expect(parseLibrary(json).map(x => x.id)).toEqual(['x', 'x-copy']);
    expect(parseLibrary(json)).toEqual(parseLibrary(json));
  });
  it('allows only http(s) links without credentials', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,hi', '//example.com', 'https://user:pass@a.com', 'not-url']) expect(safeUrl(url)).toBeUndefined();
    expect(safeUrl('https://example.com')).toBe('https://example.com/');
  });
});
describe('state transitions', () => {
  it('deletes, duplicates and edits only the addressed record under repeated pure transitions', () => {
    const initial = initialWorkspace();
    const record = { ...initial.events[0], id: 'b', name: 'other' };
    const added = workspaceReducer(initial, { type: 'add', record });
    const selected = workspaceReducer(added, { type: 'select', id: initial.activeEventId });
    const edited = workspaceReducer(selected, { type: 'edit', id: 'b', eventData: { ...defaultEvent, title: 'only b' }, updatedAt: 'x' });
    expect(edited.events[0].eventData.title).toBe(defaultEvent.title);
    const action = { type: 'delete' as const, id: 'b', fallback: initial.events[0] };
    expect(workspaceReducer(edited, action)).toEqual(workspaceReducer(edited, action));
    expect(workspaceReducer(edited, action).activeEventId).toBe(initial.activeEventId);
  });
});
describe('publication and dates', () => {
  it('generates matching selected event metadata without stale vol.5', () => {
    const html = metadata(defaultEvent, 'https://example.com');
    expect(html).toContain('2026-05-09T14:30:00+09:00'); expect(html).toContain('vol.6'); expect(html).not.toContain('vol.5');
    expect(metadata({ ...defaultEvent, title: '</script><b>x</b>', volume: 'vol.7' }, 'https://example.com')).not.toContain('</script><b>');
  });
  it('keeps old dates while deriving weekdays and detects invalid dates and overlap', () => {
    expect(dateISO(defaultEvent.date)).toBe('2026-05-09'); expect(eventDay({ ...defaultEvent, day: '日' })).toBe('土');
    expect(dateISO('2026-02-30')).toBeUndefined();
    expect(eventWarnings({ ...defaultEvent, schedule: [{ type: 'act', time: '14:00-15:00', name: 'a' }, { type: 'act', time: '14:30-15:30', name: 'b' }] }).join()).toContain('重なって');
  });
});
