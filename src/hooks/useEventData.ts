import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { defaultEvent } from '../data/defaultEvent';
import type { EventData } from '../types/event';
import { initialWorkspace, parseLibrary, parseRecords, recordFor, workspaceReducer } from '../domain/workspace';
import type { Workspace } from '../domain/workspace';
import { errorMessage, parseEvent } from '../domain/validation';
import { ConflictError, initializeWorkspace, readWorkspace, saveWorkspace } from '../storage/database';
export type { EventRecord } from '../domain/workspace';
export const normalizeEventData = parseEvent;
export function safeParseEventLibrary(value: string | null) { try { return value ? parseLibrary(value) : null; } catch { return null; } }

export function useEventData() {
  const [workspace, setWorkspace] = useState<Workspace>(() => initialWorkspace());
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('保存領域を読み込んでいます…');
  const [storageError, setStorageError] = useState('');
  const [conflict, setConflict] = useState(false);
  const current = useRef(workspace);
  current.current = workspace;
  const revision = useRef(0);
  const persisted = useRef<Workspace | undefined>(undefined);
  const saving = useRef(false);
  const dirty = useRef(false);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => initializeWorkspace(window.localStorage)).then(value => {
      if (cancelled) return;
      revision.current = value.revision; persisted.current = value;
      setWorkspace(value); setReady(true); setSaveStatus('このブラウザに保存済み');
    }).catch(error => {
      if (cancelled) return;
      // Keep the source untouched. Editing in memory and backup remain available.
      let legacyBackup: Record<string, string | null> = {};
      try { legacyBackup = Object.fromEntries(['tirasi-hp:event-library:v1', 'tirasi-hp:event-data:v1', 'tirasi-hp:active-event-id:v1'].map(key => [key, window.localStorage.getItem(key)])); } catch { /* Storage may be disabled. */ }
      const fallback = { ...current.current, legacyBackup };
      persisted.current = fallback; setWorkspace(fallback);
      setReady(true); setStorageError(`未保存: ${errorMessage(error)} 旧データは削除していません。JSON保存で退避できます。`); setSaveStatus('未保存（メモリ内）');
    });
    return () => { cancelled = true; };
  }, []);
  const flush = async () => {
    if (saving.current || conflict || !dirty.current) return;
    saving.current = true;
    try {
      while (dirty.current) {
        dirty.current = false;
        const value = current.current;
        setSaveStatus('保存中…');
        const saved = await saveWorkspace(value, revision.current);
        revision.current = saved.revision; persisted.current = value;
        new BroadcastChannelSafe().notify(saved.revision);
        setStorageError(''); setSaveStatus('このブラウザに保存済み');
      }
    } catch (error) {
      dirty.current = true;
      setStorageError(`未保存: ${errorMessage(error)} JSON保存で現在の内容を退避してください。`); setSaveStatus('未保存（メモリ内）');
      if (error instanceof ConflictError) setConflict(true);
    } finally { saving.current = false; }
  };
  useEffect(() => {
    if (!ready || persisted.current === workspace) return;
    dirty.current = true; setSaveStatus('未保存');
    const timer = setTimeout(() => void flush(), 350);
    return () => clearTimeout(timer);
  }, [workspace, ready]); // Persist only after a completed edit; no storage writes in state updaters.
  useEffect(() => {
    const onChange = async () => {
      try {
        const other = await readWorkspace();
        if (other && other.revision > revision.current) { setConflict(true); setStorageError('別のタブで更新されました。現在の内容をJSON保存してから再読み込みしてください。'); setSaveStatus('保存を停止（競合）'); }
      } catch { /* The next explicit save surfaces storage errors. */ }
    };
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tirasi-workspace') : null;
    if (channel) channel.onmessage = () => void onChange();
    window.addEventListener('focus', onChange);
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current || saving.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { channel?.close(); window.removeEventListener('focus', onChange); window.removeEventListener('beforeunload', beforeUnload); };
  }, []);
  const activeRecord = workspace.events.find(e => e.id === workspace.activeEventId)!;
  const setEventData: Dispatch<SetStateAction<EventData>> = action => {
    const id = workspace.activeEventId;
    const updatedAt = new Date().toISOString();
    setWorkspace(previous => {
      const record = previous.events.find(e => e.id === id);
      if (!record) return previous;
      const eventData = typeof action === 'function' ? action(record.eventData) : action;
      return workspaceReducer(previous, { type: 'edit', id, eventData, updatedAt });
    });
  };
  return {
    workspace, setWorkspace, ready, saveStatus, storageError, conflict,
    retrySave: () => { dirty.current = true; void flush(); },
    eventData: activeRecord.eventData, setEventData,
    eventRecords: workspace.events, activeEventId: workspace.activeEventId,
    hasCustomData: ready,
    selectEvent: (id: string) => setWorkspace(s => workspaceReducer(s, { type: 'select', id })),
    createNewEvent: () => { const record = recordFor({ ...structuredClone(defaultEvent), title: '新しいイベント', volume: '', date: '', day: '', startTime: '', schedule: [], performers: [] }); setWorkspace(s => workspaceReducer(s, { type: 'add', record })); },
    duplicateActiveEvent: () => { const record = recordFor(activeRecord.eventData, undefined, `${activeRecord.name} コピー`); setWorkspace(s => workspaceReducer(s, { type: 'add', record })); },
    renameActiveEvent: (name: string) => setWorkspace(s => workspaceReducer(s, { type: 'rename', id: workspace.activeEventId, name })),
    deleteActiveEvent: () => { const fallback = recordFor(defaultEvent); setWorkspace(s => workspaceReducer(s, { type: 'delete', id: workspace.activeEventId, fallback })); },
    resetEventData: () => setEventData(structuredClone(defaultEvent)),
    replaceEventLibrary: (records: import('../domain/workspace').EventRecord[]) => { const valid = parseRecords(records); setWorkspace(s => workspaceReducer(s, { type: 'replace', records: valid })); return true; }
  };
}
class BroadcastChannelSafe {
  notify(revision: number) { if (typeof BroadcastChannel !== 'undefined') { const channel = new BroadcastChannel('tirasi-workspace'); channel.postMessage(revision); channel.close(); } }
}
