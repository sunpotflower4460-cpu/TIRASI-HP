import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { defaultEvent } from "../data/defaultEvent";
import type { EventData } from "../types/event";

const LEGACY_STORAGE_KEY = "tirasi-hp:event-data:v1";
const LIBRARY_STORAGE_KEY = "tirasi-hp:event-library:v1";
const ACTIVE_EVENT_ID_KEY = "tirasi-hp:active-event-id:v1";

export type EventRecord = {
  id: string;
  name: string;
  eventData: EventData;
  updatedAt: string;
};

function createEventId() {
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function normalizeEventData(eventData: EventData): EventData {
  return {
    ...eventData,
    themeId: eventData.themeId || defaultEvent.themeId,
    performers: Array.isArray(eventData.performers) ? eventData.performers : []
  };
}

function buildEventName(eventData: EventData) {
  return `${eventData.title} ${eventData.subtitle} ${eventData.volume}`.trim();
}

function createRecord(eventData: EventData, name = buildEventName(eventData)): EventRecord {
  return {
    id: createEventId(),
    name,
    eventData: normalizeEventData(eventData),
    updatedAt: nowIso()
  };
}

function safeParseEventData(value: string | null): EventData | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as EventData;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.schedule)) {
      return null;
    }
    return normalizeEventData(parsed);
  } catch {
    return null;
  }
}

function normalizeEventRecord(record: EventRecord): EventRecord {
  return {
    ...record,
    id: record.id || createEventId(),
    name: record.name || buildEventName(record.eventData),
    eventData: normalizeEventData(record.eventData),
    updatedAt: record.updatedAt || nowIso()
  };
}

export function safeParseEventLibrary(value: string | null): EventRecord[] | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as EventRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const records = parsed
      .filter((record) => record && typeof record === "object")
      .filter((record) => record.eventData && Array.isArray(record.eventData.schedule))
      .map((record) => normalizeEventRecord(record));

    return records.length > 0 ? records : null;
  } catch {
    return null;
  }
}

function getInitialRecords() {
  if (typeof window === "undefined") return [createRecord(defaultEvent)];

  const library = safeParseEventLibrary(window.localStorage.getItem(LIBRARY_STORAGE_KEY));
  if (library) return library;

  const legacyEvent = safeParseEventData(window.localStorage.getItem(LEGACY_STORAGE_KEY));
  return [createRecord(legacyEvent ?? defaultEvent)];
}

function getInitialActiveId(records: EventRecord[]) {
  if (typeof window === "undefined") return records[0]?.id ?? "";

  const savedActiveId = window.localStorage.getItem(ACTIVE_EVENT_ID_KEY);
  if (savedActiveId && records.some((record) => record.id === savedActiveId)) return savedActiveId;
  return records[0]?.id ?? "";
}

export function useEventData() {
  const [eventRecords, setEventRecords] = useState<EventRecord[]>(getInitialRecords);
  const [activeEventId, setActiveEventId] = useState<string>(() => getInitialActiveId(eventRecords));

  const activeRecord = useMemo(() => {
    return eventRecords.find((record) => record.id === activeEventId) ?? eventRecords[0];
  }, [activeEventId, eventRecords]);

  const eventData = activeRecord?.eventData ?? defaultEvent;

  const setEventData: Dispatch<SetStateAction<EventData>> = (action) => {
    setEventRecords((records) =>
      records.map((record) => {
        if (record.id !== activeEventId) return record;
        const nextEventData = typeof action === "function" ? action(record.eventData) : action;
        return {
          ...record,
          name: record.name || buildEventName(nextEventData),
          eventData: normalizeEventData(nextEventData),
          updatedAt: nowIso()
        };
      })
    );
  };

  const hasCustomData = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem(LIBRARY_STORAGE_KEY) !== null ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY) !== null
    );
  }, [eventRecords]);

  useEffect(() => {
    if (!activeRecord) return;
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(eventRecords));
    window.localStorage.setItem(ACTIVE_EVENT_ID_KEY, activeRecord.id);
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(activeRecord.eventData));
  }, [activeRecord, eventRecords]);

  const resetEventData = () => {
    const resetRecord = createRecord(defaultEvent);
    window.localStorage.removeItem(LIBRARY_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_EVENT_ID_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    setEventRecords([resetRecord]);
    setActiveEventId(resetRecord.id);
  };

  const selectEvent = (eventId: string) => {
    if (!eventRecords.some((record) => record.id === eventId)) return;
    setActiveEventId(eventId);
  };

  const createNewEvent = () => {
    const record = createRecord(
      {
        ...defaultEvent,
        title: "新しいイベント",
        volume: "vol.1"
      },
      "新しいイベント"
    );
    setEventRecords((records) => [...records, record]);
    setActiveEventId(record.id);
  };

  const duplicateActiveEvent = () => {
    const source = activeRecord ?? createRecord(defaultEvent);
    const record = createRecord(source.eventData, `${source.name} コピー`);
    setEventRecords((records) => [...records, record]);
    setActiveEventId(record.id);
  };

  const renameActiveEvent = (name: string) => {
    setEventRecords((records) =>
      records.map((record) =>
        record.id === activeEventId
          ? { ...record, name: name.trim() || buildEventName(record.eventData), updatedAt: nowIso() }
          : record
      )
    );
  };

  const deleteActiveEvent = () => {
    setEventRecords((records) => {
      if (records.length <= 1) {
        const resetRecord = createRecord(defaultEvent);
        setActiveEventId(resetRecord.id);
        return [resetRecord];
      }

      const nextRecords = records.filter((record) => record.id !== activeEventId);
      setActiveEventId(nextRecords[0]?.id ?? "");
      return nextRecords;
    });
  };

  const replaceEventLibrary = (records: EventRecord[]) => {
    const normalizedRecords = records.map((record) => normalizeEventRecord(record));
    if (normalizedRecords.length === 0) return false;

    setEventRecords(normalizedRecords);
    setActiveEventId(normalizedRecords[0].id);
    return true;
  };

  return {
    eventData,
    setEventData,
    resetEventData,
    hasCustomData,
    eventRecords,
    activeEventId,
    selectEvent,
    createNewEvent,
    duplicateActiveEvent,
    renameActiveEvent,
    deleteActiveEvent,
    replaceEventLibrary
  };
}
