// Preferences of the store app, kept on the device. Reading and writing are
// guarded: without storage the app simply uses the default.
import type { NewLiveMode } from "../studio/liveCreate";

const KEY = "tirasi-livechirashi:new-live";
/** Flyers do not affect each other unless the person decides otherwise. */
export const defaultNewLiveMode: NewLiveMode = "separate";

export function readNewLiveMode(): NewLiveMode {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "share" || value === "ask" ? value : defaultNewLiveMode;
  } catch {
    return defaultNewLiveMode;
  }
}

export function writeNewLiveMode(mode: NewLiveMode): boolean {
  try {
    window.localStorage.setItem(KEY, mode);
    return true;
  } catch {
    return false;
  }
}
