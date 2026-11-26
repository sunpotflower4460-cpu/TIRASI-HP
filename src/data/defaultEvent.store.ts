// The store app's starting event. Everything here is made up on purpose: no real
// venue, performer, address or account may ship in the product.
import type { EventData } from "../types/event";
import { tr } from "../i18n";

export const defaultEvent: EventData = {
  themeId: "summer",
  venueSubtitle: "AT SAMPLE LIVE HOUSE",
  title: tr("ライブタイトル"),
  subtitle: "Acoustic Night",
  volume: "vol.1",
  date: "2027.4/3",
  day: "土",
  organizer: tr("企画: サンプル企画"),
  price: tr("前売 ¥2,000（1ドリンク別）"),
  startTime: "18:30",
  statusNote: tr("開場 18:00"),
  schedule: [
    { type: "act", time: "18:30-18:55", name: tr("出演者A") },
    { type: "act", time: "19:05-19:30", name: tr("バンドB") },
    { type: "break", label: tr("休憩(10分)") },
    { type: "act", time: "19:40-20:05", name: tr("ユニットC") },
    { type: "act", time: "20:15-20:45", name: tr("出演者D") },
    { type: "end", label: tr("- 終演 -") },
  ],
  performers: [],
  flyerOptions: {
    showPerformerProfiles: false,
  },
  openMic: {
    title: tr("お知らせ"),
    time: tr("終演後"),
    lastOrder: "",
    headline: tr("物販・交流タイムあり"),
    note: tr("ご予約は出演者または会場まで"),
    closeNote: "",
  },
  venue: {
    name: "SAMPLE LIVE HOUSE",
    address: tr("東京都〇〇区〇〇 1-2-3"),
    url: "https://example.com",
  },
  socials: [],
};
