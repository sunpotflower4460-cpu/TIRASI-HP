import type { EventData } from '../types/event';

// The editor, persistence and JSON recovery must accept the same collection sizes.
export const MAX_EVENTS = 100;
export const EVENT_LIMITS = { schedule: 100, performers: 50, socials: 30 } as const;
export function eventCollectionsFit(event: EventData): boolean {
  return (Object.keys(EVENT_LIMITS) as (keyof typeof EVENT_LIMITS)[])
    .every(key => event[key].length <= EVENT_LIMITS[key]);
}
