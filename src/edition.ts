// Two apps are built from this source:
//   personal (default): the venue website plus Flyer Studio, everything unlocked.
//   store (`vite --mode store`): the "TIRASI ライブチラシ作成" product, Studio only,
//   with paid plans. vite.config.ts swaps in its own App and sample event.
export const isStore: boolean = import.meta.env?.VITE_EDITION === "store";

export const appName = isStore ? "TIRASI ライブチラシ作成" : "生音";

/** Where drafts are kept, as shown to people. */
export const storagePlace = isStore ? "この端末" : "このブラウザ";
