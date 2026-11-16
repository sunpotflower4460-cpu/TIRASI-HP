import { onAssetsStored } from "../../src/storage/assetEvents";
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, initializeWorkspace, readWorkspace, saveWorkspace, readRecovery } from '../../src/storage/database';
import type { MigrationPoint } from '../../src/storage/database';
import { LEGACY_KEYS } from '../../src/domain/workspace';
import { defaultEvent } from '../../src/data/defaultEvent';
const raw = JSON.stringify(defaultEvent);
const storage = { getItem: (key: string) => key === LEGACY_KEYS[1] ? raw : null };
beforeEach(async () => { const db = await openDatabase(); const tx = db.transaction(['workspaces', 'assets'], 'readwrite'); tx.objectStore('workspaces').clear(); tx.objectStore('assets').clear(); await new Promise<void>(r => { tx.oncomplete = () => r(); }); });
describe('transactional migration', () => {
  it.each<MigrationPoint>(['parse', 'staging', 'before-commit', 'after-commit'])('survives an interruption at %s and retries without duplication', async point => {
    await expect(initializeWorkspace(storage, p => { if (p === point) throw new Error('interrupted'); })).rejects.toThrow();
    const first = await initializeWorkspace(storage); const second = await initializeWorkspace(storage);
    expect(first).toEqual(second); expect(first.events).toHaveLength(1); expect(storage.getItem(LEGACY_KEYS[1])).toBe(raw);
  });
  it('handles StrictMode and two concurrent initializers', async () => {
    const values = await Promise.all([initializeWorkspace(storage), initializeWorkspace(storage)]);
    expect(values[0]).toEqual(values[1]);
  });
  it('keeps recovery and rejects a stale writer atomically', async () => {
    const state = await initializeWorkspace(storage);
    const saved = await saveWorkspace(state, 0);
    await expect(saveWorkspace({ ...state, activeEventId: state.activeEventId }, 0)).rejects.toThrow('別のタブ');
    expect(await readWorkspace()).toEqual(saved); expect(await readRecovery()).toEqual(state);
  });
  it('propagates blocked legacy access and invalid data without writing new state', async () => {
    await expect(initializeWorkspace({ getItem() { throw new DOMException('denied', 'SecurityError'); } })).rejects.toThrow();
    expect(await readWorkspace()).toBeUndefined();
    await expect(initializeWorkspace({ getItem: () => '{bad' })).rejects.toThrow();
    expect(await readWorkspace()).toBeUndefined();
  });
});
describe('asset-aware workspace commits', () => {
  it('does not commit a workspace with missing original images or leave newly staged assets behind', async () => {
    const state = await initializeWorkspace(storage);
    const { createDocument } = await import('../../src/studio/document');
    const notifications: string[][] = []; const unsubscribe = onAssetsStored(ids => notifications.push([...ids]));
    const doc = createDocument('free-flyer'); doc.assetRefs = ['asset-missing', 'asset-provided'];
    await expect(saveWorkspace({ ...state, documents: [doc] }, state.revision, [{ id: 'asset-provided', blob: new Blob(['original']) }])).rejects.toThrow('元画像');
    expect(await readWorkspace()).toEqual(state);
    const db = await openDatabase();
    const asset = await new Promise(resolve => { const req = db.transaction('assets').objectStore('assets').get('asset-provided'); req.onsuccess = () => resolve(req.result); });
    expect(asset).toBeUndefined(); expect(notifications).toEqual([]); unsubscribe();
  });
});
