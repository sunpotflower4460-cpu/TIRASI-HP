// The store app's starting event. Everything here is made up on purpose: no real
// venue, performer, address or account may ship in the product.
import type { EventData } from "../types/event";

export const defaultEvent: EventData = {
  themeId: "summer",
  venueSubtitle: "AT SAMPLE LIVE HOUSE",
  title: "ライブタイトル",
  subtitle: "Acoustic Night",
  volume: "vol.1",
  date: "2027.4/3",
  day: "土",
  organizer: "企画: サンプル企画",
  price: "前売 ¥2,000（1ドリンク別）",
  startTime: "18:30",
  statusNote: "開場 18:00",
  schedule: [
    { type: "act", time: "18:30-18:55", name: "出演者A" },
    { type: "act", time: "19:05-19:30", name: "バンドB" },
    { type: "break", label: "休憩(10分)" },
    { type: "act", time: "19:40-20:05", name: "ユニットC" },
    { type: "act", time: "20:15-20:45", name: "出演者D" },
    { type: "end", label: "- 終演 -" },
  ],
  performers: [],
  flyerOptions: {
    showPerformerProfiles: false,
  },
  openMic: {
    title: "お知らせ",
    time: "終演後",
    lastOrder: "",
    headline: "物販・交流タイムあり",
    note: "ご予約は出演者または会場まで",
    closeNote: "",
  },
  venue: {
    name: "SAMPLE LIVE HOUSE",
    address: "東京都〇〇区〇〇 1-2-3",
    url: "https://example.com",
  },
  socials: [],
};
