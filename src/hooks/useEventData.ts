import { useEffect, useMemo, useState } from "react";
import { defaultEvent } from "../data/defaultEvent";
import type { EventData } from "../types/event";

const STORAGE_KEY = "tirasi-hp:event-data:v1";

function safeParseEventData(value: string | null): EventData | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as EventData;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.schedule)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useEventData() {
  const [eventData, setEventData] = useState<EventData>(() => {
    if (typeof window === "undefined") return defaultEvent;
    return safeParseEventData(window.localStorage.getItem(STORAGE_KEY)) ?? defaultEvent;
  });

  const hasCustomData = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  }, [eventData]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(eventData));
  }, [eventData]);

  const resetEventData = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setEventData(defaultEvent);
  };

  return {
    eventData,
    setEventData,
    resetEventData,
    hasCustomData
  };
}
