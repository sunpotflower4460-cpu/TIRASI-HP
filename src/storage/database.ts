import { initialWorkspace, LEGACY_KEYS, parseWorkspace } from '../domain/workspace';
import type { Workspace } from '../domain/workspace';
export const DB_NAME = 'tirasi-studio-v2';
export class ConflictError extends Error { constructor() { super('別のタブで保存されました。現在の編集をバックアップしてから、保存済みの内容を読み直してください。'); } }
let opening: Promise<IDBDatabase> | undefined;
export function openDatabase(): Promise<IDBDatabase> {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      for (const name of ['workspaces', 'assets']) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
    };
    req.onsuccess = () => { req.result.onversionchange = () => { req.result.close(); opening = undefined; }; resolve(req.result); };
    req.onerror = () => { opening = undefined; reject(req.error); };
    req.onblocked = () => { opening = undefined; reject(new Error('保存領域がロックされています。他のタブを閉じて再読み込みしてください。')); };
  });
  return opening;
}
export const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
export const completed = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('保存を完了できませんでした。')); });
export async function readRawWorkspace(): Promise<unknown> {
  const db = await openDatabase();
  const raw = await request(db.transaction('workspaces').objectStore('workspaces').get('active'));
  return raw;
}
export async function readWorkspace(): Promise<Workspace | undefined> {
  const raw = await readRawWorkspace();
  return raw === undefined ? undefined : parseWorkspace(raw);
}
export type MigrationPoint = 'parse' | 'staging' | 'before-commit' | 'after-commit';
export async function initializeWorkspace(storage: Pick<Storage, 'getItem'>, fault?: (point: MigrationPoint) => void): Promise<Workspace> {
  const existing = await readWorkspace();
  if (existing) return existing;
  fault?.('parse');
  const legacy = Object.fromEntries(LEGACY_KEYS.map(key => [key, storage.getItem(key)]));
  const staged = parseWorkspace(initialWorkspace(legacy));
  fault?.('staging');
  fault?.('before-commit');
  const db = await openDatabase();
  const tx = db.transaction('workspaces', 'readwrite');
  const done = completed(tx);
  const store = tx.objectStore('workspaces');
  // Check inside the write transaction: two tabs/StrictMode must not initialize twice.
  const get = store.get('active');
  get.onsuccess = () => { if (!get.result) store.put(staged, 'active'); };
  await done;
  fault?.('after-commit');
  return (await readWorkspace())!;
}
export async function saveWorkspace(workspace: Workspace, expectedRevision: number, assets: { id: string; blob: Blob; metadata?: import('../studio/assets').AssetMetadata }[] = []): Promise<Workspace> {
  const db = await openDatabase();
  const next = parseWorkspace({ ...workspace, revision: expectedRevision + 1 });
  const tx = db.transaction(['workspaces', 'assets'], 'readwrite');
  let conflict = false;
  let missingAsset = false;
  const done = completed(tx);
  const store = tx.objectStore('workspaces');
  const get = store.get('active');
  get.onsuccess = () => {
    const previous = get.result as Workspace | undefined;
    if ((previous?.revision ?? 0) !== expectedRevision) { conflict = true; tx.abort(); return; }
    if (previous) store.put(previous, 'recovery');
    assets.forEach(a => { tx.objectStore('assets').put(a.blob, a.id); if (a.metadata) tx.objectStore('assets').put(a.metadata, `meta:${a.id}`); });
    store.put(next, 'active');
    const provided = new Set(assets.map(asset => asset.id));
    const refs = [...new Set(next.documents.flatMap(doc => doc.assetRefs))];
    for (const id of refs) {
      if (provided.has(id)) continue;
      const check = tx.objectStore('assets').get(id);
      check.onsuccess = () => { if (!(check.result instanceof Blob)) { missingAsset = true; tx.abort(); } };
    }
  };
  try { await done; } catch (e) { if (conflict) throw new ConflictError(); if (missingAsset) throw new Error('元画像が欠損しています。完全バックアップか元画像を読み込んでください。現在の保存内容は変更していません。'); throw e; }
  return next;
}
export async function readRecovery(): Promise<Workspace | undefined> {
  const db = await openDatabase();
  const value = await request(db.transaction('workspaces').objectStore('workspaces').get('recovery'));
  return value ? parseWorkspace(value) : undefined;
}
