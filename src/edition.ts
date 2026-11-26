import { tr } from "./i18n";
// Two apps are built from this source:
//   personal (default): the venue website plus Flyer Studio, everything unlocked.
//   store (`vite --mode store`): the "TIRASI ライブチラシ作成" product, Studio only,
//   with paid plans. vite.config.ts swaps in its own App and sample event.
export const isStore: boolean = import.meta.env?.VITE_EDITION === "store";

// The venue edition's names are not translated: the table ships in the store app.
export const appName = isStore ? tr("TIRASI ライブチラシ作成") : "生音";

/** Where drafts are kept, as shown to people. */
export const storagePlace = isStore ? tr("この端末") : tr("このブラウザ");
